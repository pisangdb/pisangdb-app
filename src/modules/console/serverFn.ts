import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { Pool } from "pg";
import { db } from "#/db";
import { aiLogs, queryHistory, sandboxes } from "#/db/schema";
import { generateSQL } from "#/lib/ai";
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
		const user = await getCurrentUser();

		// Verify sandbox ownership
		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, input.sandboxId), eq(sandboxes.userId, user.id)),
			);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			throw new Error("Sandbox is not active");
		}

		// Rate limit: 30 requests per day per user
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const todayLogs = await db
			.select()
			.from(aiLogs)
			.where(and(eq(aiLogs.userId, user.id)));

		const todayCount = todayLogs.filter(
			(log) => new Date(log.createdAt) >= todayStart,
		).length;

		if (todayCount >= 30) {
			throw new Error(
				"Daily AI request limit reached (30 requests/day). Please try again tomorrow.",
			);
		}

		// Call Gemini
		const { sql, explanation, tokensUsed } = await generateSQL({
			prompt: input.prompt,
			engine: input.engine,
			sandboxDbName: sandbox.dbName,
		});

		// Log the request
		const [newLog] = await db
			.insert(aiLogs)
			.values({
				sandboxId: sandbox.id,
				userId: user.id,
				prompt: input.prompt,
				response: explanation,
				sqlGenerated: sql,
				executed: false,
				tokensUsed,
			})
			.returning();

		return {
			logId: newLog.id,
			sqlGenerated: sql,
			explanation,
			tokensUsed,
		};
	});
export const $aiExecute = createServerFn({ method: "POST" })
	.inputValidator(aiExecuteSchema)
	.handler(async ({ data }): Promise<QueryResult> => {
		const user = await getCurrentUser();

		// Fetch the AI log entry
		const [logEntry] = await db
			.select()
			.from(aiLogs)
			.where(and(eq(aiLogs.id, data.logId), eq(aiLogs.userId, user.id)));

		if (!logEntry) {
			throw new Error("AI log entry not found");
		}

		if (!logEntry.sqlGenerated) {
			throw new Error("No SQL to execute");
		}

		// Execute the SQL via $executeQuery logic
		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			throw new Error("Sandbox is not active");
		}

		checkForbiddenCommands(logEntry.sqlGenerated);

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
				const result = await pool.query(logEntry.sqlGenerated);
				const executionTimeMs = Date.now() - start;
				const columns = result.fields?.map((f) => f.name) ?? [];
				const plainRows = JSON.parse(JSON.stringify(result.rows ?? []));
				const rowsAffected = result.rowCount ?? 0;

				// Mark AI log as executed
				await db
					.update(aiLogs)
					.set({ executed: true })
					.where(eq(aiLogs.id, data.logId));

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

			const [rows] = await pool.query(logEntry.sqlGenerated);
			const executionTimeMs = Date.now() - start;

			let result: QueryResult;
			if (Array.isArray(rows) && rows.length > 0) {
				const columns = Object.keys(rows[0] as Record<string, unknown>);
				const plainRows = JSON.parse(JSON.stringify(rows));
				result = {
					columns,
					rows: plainRows,
					rowsAffected: plainRows.length,
					executionTimeMs,
				};
			} else {
				const mysqlResult = rows as mysql.ResultSetHeader;
				result = {
					columns: [],
					rows: [],
					rowsAffected: mysqlResult.affectedRows ?? 0,
					executionTimeMs,
				};
			}

			// Mark AI log as executed
			await db
				.update(aiLogs)
				.set({ executed: true })
				.where(eq(aiLogs.id, data.logId));

			return result;
		} finally {
			if (pool) {
				await pool.end();
			}
		}
	});

export const $getAiLogs = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<AiLogItem[]> => {
		const user = await getCurrentUser();

		// Verify sandbox belongs to this user
		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		// Fetch AI logs for this sandbox
		const logs = await db
			.select()
			.from(aiLogs)
			.where(eq(aiLogs.sandboxId, data.sandboxId))
			.orderBy(desc(aiLogs.createdAt))
			.limit(50);

		return logs.map((row) => ({
			id: row.id,
			prompt: row.prompt,
			response: row.response,
			sqlGenerated: row.sqlGenerated,
			executed: row.executed,
			tokensUsed: row.tokensUsed,
			createdAt: row.createdAt.toISOString(),
		}));
	});
