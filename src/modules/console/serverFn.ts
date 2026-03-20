import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, gte } from "drizzle-orm";
import mysql from "mysql2/promise";
import { Pool } from "pg";
import { db } from "#/db";
import { aiLogs, queryHistory, sandboxes } from "#/db/schema";
import { generateSQL } from "#/lib/ai";
import { auth } from "#/lib/auth";
import type {
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
	// Override host for development - allows connecting to local sandbox containers
	const devHost = process.env.SANDBOX_HOST ?? storedHost;
	const port = getSandboxPort(engine, region);
	return { host: devHost, port };
}

async function validateSandboxConnection(
	engine: string,
	host: string,
	port: number,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	try {
		if (engine === "postgresql") {
			const pool = new Pool({
				host,
				port,
				database: dbName,
				user: dbUser,
				password: dbPassword,
				max: 1,
				connectionTimeoutMillis: 5000,
			});
			await pool.query("SELECT 1");
			await pool.end();
		} else {
			const pool = mysql.createPool({
				host,
				port,
				database: dbName,
				user: dbUser,
				password: dbPassword,
				waitForConnections: true,
				connectionLimit: 1,
				connectTimeout: 5000,
			});
			await pool.query("SELECT 1");
			await pool.end();
		}
	} catch {
		throw new Error(
			`Cannot connect to sandbox database at ${host}:${port}. Please ensure the sandbox is running.`,
		);
	}
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

		const start = Date.now();
		let pool: Pool | mysql.Pool | undefined;

		// Use dev host/port override for local development
		const { host, port } = getSandboxConnection(
			sandbox.engine,
			sandbox.region,
			sandbox.host,
		);

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
				host,
				port,
				database: sandbox.dbName,
				user: sandbox.dbUser,
				password: sandbox.dbPassword,
				waitForConnections: true,
				connectionLimit: 5,
			});

			await pool.query("SET SESSION MAX_EXECUTION_TIME=30000");

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
			throw new Error("Sandbox not found");
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
		const user = await getCurrentUser();

		// Verify sandbox ownership
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

		// Check database connectivity before calling AI
		const { host, port } = getSandboxConnection(
			sandbox.engine,
			sandbox.region,
			sandbox.host,
		);

		await validateSandboxConnection(
			sandbox.engine,
			host,
			port,
			sandbox.dbName,
			sandbox.dbUser,
			sandbox.dbPassword,
		);

		// Rate limit: max 30 AI requests per user per day
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const [rateCount] = await db
			.select({ count: count() })
			.from(aiLogs)
			.where(
				and(eq(aiLogs.userId, user.id), gte(aiLogs.createdAt, todayStart)),
			);

		if (rateCount && rateCount.count >= 30) {
			throw new Error("Rate limit exceeded: 30 AI requests per day");
		}

		// Call Gemini AI to generate SQL
		let generated: { sql: string; explanation: string; tokensUsed: number };
		let fullResponse: string;

		try {
			generated = await generateSQL({
				prompt: data.prompt,
				engine: data.engine,
				sandboxDbName: sandbox.dbName,
			});
			fullResponse = `-- Explanation:\n${generated.explanation}\n\n-- Generated SQL:\n${generated.sql}`;
		} catch (err) {
			// Save failed attempt to ai_logs
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			fullResponse = `/* Error: ${errorMessage} */`;

			await db.insert(aiLogs).values({
				sandboxId: sandbox.id,
				userId: user.id,
				prompt: data.prompt,
				response: fullResponse,
				sqlGenerated: null,
				executed: false,
				tokensUsed: null,
			});

			throw err;
		}

		// Save successful generation to ai_logs
		const [logEntry] = await db
			.insert(aiLogs)
			.values({
				sandboxId: sandbox.id,
				userId: user.id,
				prompt: data.prompt,
				response: fullResponse,
				sqlGenerated: generated.sql,
				executed: false,
				tokensUsed: generated.tokensUsed,
			})
			.returning({ id: aiLogs.id });

		return {
			logId: logEntry.id,
			sqlGenerated: generated.sql,
			explanation: generated.explanation,
			tokensUsed: generated.tokensUsed,
		};
	});

export const $aiExecute = createServerFn({ method: "POST" })
	.inputValidator(aiExecuteSchema)
	.handler(async ({ data }): Promise<QueryResult> => {
		const user = await getCurrentUser();

		// Verify sandbox ownership
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

		// Verify ai_log exists and belongs to this sandbox/user
		const [logEntry] = await db
			.select()
			.from(aiLogs)
			.where(
				and(
					eq(aiLogs.id, data.logId),
					eq(aiLogs.sandboxId, sandbox.id),
					eq(aiLogs.userId, user.id),
				),
			);

		if (!logEntry) {
			throw new Error("AI log not found");
		}

		// Validate SQL before execution
		checkForbiddenCommands(data.sql);

		// Execute SQL against the sandbox database
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

				const result = await pool.query(data.sql);
				const executionTimeMs = Date.now() - start;

				const columns = result.fields?.map((f) => f.name) ?? [];
				const rows = result.rows ?? [];
				const rowsAffected = result.rowCount ?? 0;

				// Mark ai_log as executed
				await db
					.update(aiLogs)
					.set({ executed: true })
					.where(eq(aiLogs.id, data.logId));

				return { columns, rows, rowsAffected, executionTimeMs };
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

			await pool.query("SET SESSION MAX_EXECUTION_TIME=30000");

			const [rows] = await pool.query(data.sql);
			const executionTimeMs = Date.now() - start;

			let resultColumns: string[] = [];
			let resultRows: Record<string, string | number | boolean | null>[] = [];
			let rowsAffected = 0;

			if (Array.isArray(rows) && rows.length > 0) {
				resultColumns = Object.keys(rows[0] as Record<string, unknown>);
				resultRows = rows as unknown as Record<
					string,
					string | number | boolean | null
				>[];
				rowsAffected = rows.length;
			} else {
				const header = rows as mysql.ResultSetHeader;
				rowsAffected = header.affectedRows ?? 0;
			}

			// Mark ai_log as executed
			await db
				.update(aiLogs)
				.set({ executed: true })
				.where(eq(aiLogs.id, data.logId));

			return {
				columns: resultColumns,
				rows: resultRows,
				rowsAffected,
				executionTimeMs,
			};
		} finally {
			if (pool) {
				await pool.end();
			}
		}
	});

export const $getAiLogs = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<AiLogItem[]> => {
		// Return empty array if AI is not configured - graceful degradation
		// so the sandbox detail page can still load
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

		// Check if AI is configured
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			// Return empty array if no API key - graceful degradation
			return [];
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
