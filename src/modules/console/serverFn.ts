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

const MOCK_SANDBOXES = [
	{
		id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		userId: "test-user-id",
		engine: "postgresql" as const,
		region: "id",
		dbName: "pisang_a1b2_test-migration_k8m2n4",
		dbUser: "sb_a1b2x8",
		dbPassword: "mock_password_32chars_xxxxxxxx",
		host: "id.pisangdb.com",
		port: 5432,
		status: "active" as const,
	},
	{
		id: "9b1deb4d-3eb7-4c81-aceb-7e3b5d1f2a3c",
		userId: "test-user-id",
		engine: "mysql" as const,
		region: "id",
		dbName: "pisang_c3d4_ecommerce-dev_z7j1n3",
		dbUser: "sb_c3d4y9",
		dbPassword: "mock_password_32chars_yyyyyyyy",
		host: "id.pisangdb.com",
		port: 3306,
		status: "active" as const,
	},
];

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

export const $executeQuery = createServerFn({ method: "POST" })
	.inputValidator(executeQuerySchema)
	.handler(async ({ data }): Promise<QueryResult> => {
		const user = await getCurrentUser();

		let sandbox = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			)
			.then((rows) => rows[0]);

		if (!sandbox) {
			sandbox = MOCK_SANDBOXES.find(
				(s) => s.id === data.sandboxId,
			) as typeof sandbox;
		}

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			throw new Error("Sandbox is not active");
		}

		checkForbiddenCommands(data.query);

		const start = Date.now();
		let pool: Pool | mysql.Pool | undefined;

		try {
			if (sandbox.engine === "postgresql") {
				pool = new Pool({
					host: sandbox.host,
					port: sandbox.port,
					database: sandbox.dbName,
					user: sandbox.dbUser,
					password: sandbox.dbPassword,
					max: 5,
				});

				await pool.query("SET statement_timeout = '30s'");

				const result = await pool.query(data.query);
				const executionTimeMs = Date.now() - start;

				const columns = result.fields?.map((f) => f.name) ?? [];
				const rows = result.rows ?? [];
				const rowsAffected = result.rowCount ?? 0;

				await db.insert(queryHistory).values({
					sandboxId: sandbox.id,
					query: data.query,
					status: "success",
					executionTimeMs,
					rowsAffected,
				});

				return { columns, rows, rowsAffected, executionTimeMs };
			}

			pool = mysql.createPool({
				host: sandbox.host,
				port: sandbox.port,
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

				await db.insert(queryHistory).values({
					sandboxId: sandbox.id,
					query: data.query,
					status: "success",
					executionTimeMs,
					rowsAffected: Array.isArray(rows) ? rows.length : 0,
				});

				return {
					columns,
					rows: rows as unknown as Record<
						string,
						string | number | boolean | null
					>[],
					rowsAffected: Array.isArray(rows) ? rows.length : 0,
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

		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			);

		if (!sandbox) {
			const mockSandbox = MOCK_SANDBOXES.find((s) => s.id === data.sandboxId);
			if (!mockSandbox) {
				throw new Error("Sandbox not found");
			}
		}

		const history = await db
			.select()
			.from(queryHistory)
			.where(eq(queryHistory.sandboxId, data.sandboxId))
			.orderBy(desc(queryHistory.createdAt))
			.limit(50);

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
