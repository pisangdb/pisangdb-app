import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { Pool } from "pg";
import { db } from "#/db";
import { aiLogs, queryHistory, sandboxes } from "#/db/schema";
import { generateSQL } from "#/lib/ai";
import { auth } from "#/lib/auth";
import { NotFoundError, UnauthorizedError } from "#/lib/errors";
import { checkAiRateLimit, recordAiRequest } from "#/lib/rate-limit";
import { getSandboxConnection } from "#/lib/sandbox-provisioning";
import type {
	AiGenerateResult,
	AiLogItem,
	DbEngine,
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
		throw new UnauthorizedError();
	}
	return session.user;
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
			throw new NotFoundError("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			throw new Error("Sandbox is not active");
		}

		checkForbiddenCommands(data.query);

		const start = Date.now();
		let pool: Pool | mysql.Pool | undefined;

		// Use dev host/port override for local development
		const { host, port } = getSandboxConnection(
			sandbox.engine as DbEngine,
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
			throw new NotFoundError("Sandbox not found");
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

		// Check AI rate limit (30 req/day/user per PRD)
		const rateLimit = checkAiRateLimit(user.id);
		if (!rateLimit.allowed) {
			throw new Error(
				`AI rate limit exceeded. Try again at ${rateLimit.resetAt.toLocaleTimeString()}.`,
			);
		}

		const sandbox = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			)
			.then((rows) => rows[0]);

		if (!sandbox) {
			throw new NotFoundError("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			throw new Error("Sandbox is not active");
		}

		const { sql, explanation, tokensUsed } = await generateSQL({
			prompt: data.prompt,
			engine: data.engine,
			sandboxDbName: sandbox.dbName,
		});

		// Record successful AI request for rate limiting
		recordAiRequest(user.id);

		const [log] = await db
			.insert(aiLogs)
			.values({
				sandboxId: sandbox.id,
				userId: user.id,
				prompt: data.prompt,
				response: explanation,
				sqlGenerated: sql,
				executed: false,
				tokensUsed,
			})
			.returning();

		return {
			logId: log.id.toString(),
			sqlGenerated: sql,
			explanation,
			tokensUsed,
		};
	});

export const $aiExecute = createServerFn({ method: "POST" })
	.inputValidator(aiExecuteSchema)
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
			throw new NotFoundError("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			throw new Error("Sandbox is not active");
		}

		checkForbiddenCommands(data.sql);

		const start = Date.now();
		let pool: Pool | mysql.Pool | undefined;

		const { host, port } = getSandboxConnection(
			sandbox.engine as DbEngine,
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

				const result = await pool.query(data.sql);
				const executionTimeMs = Date.now() - start;

				const columns = result.fields?.map((f) => f.name) ?? [];
				const rows = result.rows ?? [];
				const rowsAffected = result.rowCount ?? 0;

				await db.insert(queryHistory).values({
					sandboxId: sandbox.id,
					query: data.sql,
					status: "success",
					executionTimeMs,
					rowsAffected,
				});

				// Mark AI log as executed
				if (data.logId) {
					await db
						.update(aiLogs)
						.set({ executed: true })
						.where(eq(aiLogs.id, data.logId));
				}

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

			if (Array.isArray(rows) && rows.length > 0) {
				const columns = Object.keys(rows[0] as Record<string, unknown>);

				await db.insert(queryHistory).values({
					sandboxId: sandbox.id,
					query: data.sql,
					status: "success",
					executionTimeMs,
					rowsAffected: Array.isArray(rows) ? rows.length : 0,
				});

				// Mark AI log as executed
				if (data.logId) {
					await db
						.update(aiLogs)
						.set({ executed: true })
						.where(eq(aiLogs.id, data.logId));
				}

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
				query: data.sql,
				status: "success",
				executionTimeMs,
				rowsAffected,
			});

			// Mark AI log as executed
			if (data.logId) {
				await db
					.update(aiLogs)
					.set({ executed: true })
					.where(eq(aiLogs.id, data.logId));
			}

			return { columns: [], rows: [], rowsAffected, executionTimeMs };
		} catch (error) {
			const executionTimeMs = Date.now() - start;
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			await db.insert(queryHistory).values({
				sandboxId: sandbox.id,
				query: data.sql,
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
			throw new NotFoundError("Sandbox not found");
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
