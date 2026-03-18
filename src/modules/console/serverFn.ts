import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { Pool } from "pg";
import { db } from "#/db";
import { queryHistory, sandboxes } from "#/db/schema";
import { auth } from "#/lib/auth";
import type {
	AiGenerateInput,
	AiGenerateResult,
	AiLogItem,
	QueryHistoryItem,
	QueryResult,
} from "#/lib/types";
import {
	aiExecuteSchema,
	aiGenerateSchema,
	executeQuerySchema,
	sandboxIdSchema,
} from "./schema";

const FORBIDDEN_PATTERNS = [
	/DROP\s+DATABASE/i,
	/ALTER\s+SYSTEM/i,
	/GRANT\s+/i,
	/REVOKE\s+/i,
	/TRUNCATE/i,
	/CREATE\s+USER/i,
	/DROP\s+USER/i,
	/CREATE\s+ROLE/i,
	/DROP\s+ROLE/i,
	/KILL\s+/i,
	/SHUTDOWN/i,
];

function checkForbiddenCommands(query: string): void {
	const upperQuery = query.toUpperCase();
	for (const pattern of FORBIDDEN_PATTERNS) {
		if (pattern.test(upperQuery)) {
			const match = upperQuery.match(pattern);
			throw new Error(
				`Unauthorized command: ${match ? match[0] : "forbidden operation"}`,
			);
		}
	}
}

async function getCurrentUser() {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return session.user;
}

function getSandboxPort(engine: string, region: string): number {
	const regionKey = region.toUpperCase();
	if (engine === "postgresql") {
		const url = process.env[`POSTGRES_SANDBOX_URL_${regionKey}`] ?? "";
		const match = url.match(/:(\d+)(?:\/|$)/);
		if (match) return parseInt(match[1], 10);
		return 5432;
	}
	if (engine === "mysql") {
		const url = process.env[`MYSQL_SANDBOX_URL_${regionKey}`] ?? "";
		const match = url.match(/:(\d+)(?:\/|$)/);
		if (match) return parseInt(match[1], 10);
		return 3306;
	}
	const envUrl = process.env[`MARIADB_SANDBOX_URL_${regionKey}`] ?? "";
	const match = envUrl.match(/:(\d+)(?:\/|$)/);
	if (match) return parseInt(match[1], 10);
	return 3307;
}

function getSandboxConnection(
	engine: string,
	region: string,
	storedHost: string,
): { host: string; port: number } {
	const devHost = process.env.SANDBOX_HOST ?? storedHost;
	const port = getSandboxPort(engine, region);
	return { host: devHost, port };
}

export const $executeQuery = createServerFn({ method: "POST" })
	.inputValidator(executeQuerySchema)
	.handler(async ({ data }): Promise<QueryResult> => {
		const user = await getCurrentUser();

		const sandbox = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			)
			.then((rows) => rows[0]);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			throw new Error("Sandbox is not active");
		}

		checkForbiddenCommands(data.query);

		const { host, port } = getSandboxConnection(
			sandbox.engine,
			sandbox.region,
			sandbox.host,
		);

		const start = Date.now();
		let pool: Pool | mysql.Pool | undefined;

		try {
			if (sandbox.engine === "postgresql") {
				pool = new Pool({
					host,
					port,
					database: sandbox.dbName,
					user: sandbox.dbUser,
					password: sandbox.dbPassword,
					max: 5,
				});

				await pool.query("SET statement_timeout = '30s'");

				const result = await pool.query(data.query);
				const executionTimeMs = Date.now() - start;

				const columns = result.fields?.map((f) => f.name) ?? [];
				// pg returns frozen row objects — strip with JSON round-trip for safe serialization
				const plainRows = JSON.parse(
					JSON.stringify(result.rows ?? []),
				) as Array<Record<string, string | number | boolean | null>>;
				const rowsAffected = result.rowCount ?? 0;

				await db.insert(queryHistory).values({
					sandboxId: sandbox.id,
					query: data.query,
					status: "success",
					executionTimeMs,
					rowsAffected,
				});

				return { columns, rows: plainRows, rowsAffected, executionTimeMs };
			}

			pool = mysql.createPool({
				host,
				port,
				database: sandbox.dbName,
				user: sandbox.dbUser,
				password: sandbox.dbPassword,
				waitForConnections: true,
				connectionLimit: 5,
			});

			const [rows] = await pool.query(data.query);
			const executionTimeMs = Date.now() - start;

			if (Array.isArray(rows) && rows.length > 0) {
				const columns = Object.keys(rows[0] as Record<string, unknown>);
				// mysql2 may return frozen/proxied rows — strip with JSON round-trip for safe serialization
				const plainRows = JSON.parse(JSON.stringify(rows)) as Array<
					Record<string, string | number | boolean | null>
				>;

				await db.insert(queryHistory).values({
					sandboxId: sandbox.id,
					query: data.query,
					status: "success",
					executionTimeMs,
					rowsAffected: plainRows.length,
				});

				return {
					columns,
					rows: plainRows,
					rowsAffected: plainRows.length,
					executionTimeMs,
				};
			}

			const result = rows as mysql.ResultSetHeader;
			const rowsAffected = result.affectedRows ?? 0;

			await db.insert(queryHistory).values({
				sandboxId: sandbox.id,
				query: data.query,
				status: "success",
				executionTimeMs,
				rowsAffected,
			});

			return { columns: [], rows: [], rowsAffected, executionTimeMs };
		} catch (error) {
			const executionTimeMs = Date.now() - start;
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			await db.insert(queryHistory).values({
				sandboxId: sandbox.id,
				query: data.query,
				status: "error",
				executionTimeMs,
				errorMessage,
			});

			throw error;
		} finally {
			if (pool) {
				await pool.end();
			}
		}
	});

export const $getQueryHistory = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<QueryHistoryItem[]> => {
		const user = await getCurrentUser();

		await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			);

		const history = await db
			.select()
			.from(queryHistory)
			.where(eq(queryHistory.sandboxId, data.sandboxId))
			.orderBy(desc(queryHistory.createdAt))
			.limit(50);

		if (history.length === 0) {
			return [];
		}

		return history.map((h) => ({
			id: h.id,
			query: h.query,
			status: h.status as "success" | "error",
			executionTimeMs: h.executionTimeMs,
			rowsAffected: h.rowsAffected,
			errorMessage: h.errorMessage,
			createdAt: h.createdAt.toISOString(),
		}));
	});

export const $aiGenerate = createServerFn({ method: "POST" })
	.inputValidator(aiGenerateSchema)
	.handler(async ({ data }): Promise<AiGenerateResult> => {
		const input = data as AiGenerateInput;
		const mockSql = `-- Generated for: ${input.prompt}\nCREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nINSERT INTO users (name, email) VALUES\n  ('Alice', 'alice@example.com'),\n  ('Bob', 'bob@example.com');`;

		return {
			logId: crypto.randomUUID(),
			sqlGenerated: mockSql,
			explanation:
				"Membuat tabel users dengan kolom dasar (id, name, email, created_at) dan mengisi 2 data contoh.",
			tokensUsed: 312,
		};
	});

export const $aiExecute = createServerFn({ method: "POST" })
	.inputValidator(aiExecuteSchema)
	.handler(async ({ data: _data }): Promise<QueryResult> => {
		const start = Date.now();
		return {
			columns: [],
			rows: [],
			rowsAffected: 0,
			executionTimeMs: Date.now() - start,
		};
	});

export const $getAiLogs = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data: _data }): Promise<AiLogItem[]> => {
		return [
			{
				id: crypto.randomUUID(),
				prompt: "Buatkan tabel users dan products untuk e-commerce",
				response: "SQL generated successfully.",
				sqlGenerated:
					"CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);",
				executed: true,
				tokensUsed: 312,
				createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
			},
		];
	});
