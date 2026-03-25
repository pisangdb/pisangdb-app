import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import type mysql from "mysql2/promise";
import type { Pool } from "pg";
import { NotFoundError, UnauthorizedError } from "#/lib/errors";
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

async function getConsoleServerContext() {
	const [{ db }, schema, { auth }] = await Promise.all([
		import("#/db"),
		import("#/db/schema"),
		import("#/lib/auth"),
	]);

	return {
		auth,
		db,
		aiLogs: schema.aiLogs,
		queryHistory: schema.queryHistory,
		sandboxes: schema.sandboxes,
	};
}

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

type SandboxRow = {
	id: string;
	userId: string;
	engine: string;
	region: string;
	status: string;
	host: string;
	dbName: string;
	dbUser: string;
	dbPassword: string;
};

async function getCurrentUser() {
	const { auth } = await getConsoleServerContext();
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new UnauthorizedError();
	}
	return session.user;
}

async function getOwnedSandbox(
	sandboxId: string,
	userId: string,
): Promise<SandboxRow> {
	const { db, sandboxes } = await getConsoleServerContext();
	const [sandbox] = await db
		.select()
		.from(sandboxes)
		.where(and(eq(sandboxes.id, sandboxId), eq(sandboxes.userId, userId)));

	if (!sandbox) {
		throw new NotFoundError("Sandbox not found");
	}

	if (sandbox.status !== "active") {
		throw new Error("Sandbox is not active");
	}

	return sandbox as SandboxRow;
}

async function insertQueryHistoryEntry(params: {
	sandboxId: string;
	query: string;
	status: "success" | "error";
	executionTimeMs: number;
	rowsAffected?: number;
	errorMessage?: string;
}) {
	const { db, queryHistory } = await getConsoleServerContext();
	await db.insert(queryHistory).values(params);
}

async function markAiLogExecuted(logId: number | null | undefined) {
	if (!logId) {
		return;
	}

	const { aiLogs, db } = await getConsoleServerContext();
	await db.update(aiLogs).set({ executed: true }).where(eq(aiLogs.id, logId));
}

async function executeSandboxQuery(params: {
	sandbox: SandboxRow;
	query: string;
}): Promise<QueryResult> {
	const { sandbox, query } = params;
	const start = Date.now();
	let pool: Pool | mysql.Pool | undefined;

	const [{ Pool: PgPool }, mysqlModule, { getSandboxConnection }] =
		await Promise.all([
			import("pg"),
			import("mysql2/promise"),
			import("#/lib/sandbox-provisioning"),
		]);

	const { host, port } = getSandboxConnection(
		sandbox.engine as DbEngine,
		sandbox.region,
		sandbox.host,
	);

	try {
		if (sandbox.engine === "postgresql") {
			pool = new PgPool({
				host,
				port,
				database: sandbox.dbName,
				user: sandbox.dbUser,
				password: sandbox.dbPassword,
				max: 5,
			});

			await pool.query("SET statement_timeout = '30s'");

			const result = await pool.query(query);
			const executionTimeMs = Date.now() - start;
			const columns = result.fields?.map((field) => field.name) ?? [];
			const rows = result.rows ?? [];
			const rowsAffected = result.rowCount ?? 0;

			await insertQueryHistoryEntry({
				sandboxId: sandbox.id,
				query,
				status: "success",
				executionTimeMs,
				rowsAffected,
			});

			return { columns, rows, rowsAffected, executionTimeMs };
		}

		pool = mysqlModule.createPool({
			host,
			port,
			database: sandbox.dbName,
			user: sandbox.dbUser,
			password: sandbox.dbPassword,
			waitForConnections: true,
			connectionLimit: 5,
		});

		await pool.query("SET SESSION MAX_EXECUTION_TIME=30000");

		const [rows] = await pool.query(query);
		const executionTimeMs = Date.now() - start;

		if (Array.isArray(rows) && rows.length > 0) {
			const columns = Object.keys(rows[0] as Record<string, unknown>);
			const rowsAffected = rows.length;

			await insertQueryHistoryEntry({
				sandboxId: sandbox.id,
				query,
				status: "success",
				executionTimeMs,
				rowsAffected,
			});

			return {
				columns,
				rows: rows as Record<string, string | number | boolean | null>[],
				rowsAffected,
				executionTimeMs,
			};
		}

		const result = rows as mysql.ResultSetHeader;
		const rowsAffected = result.affectedRows ?? 0;

		await insertQueryHistoryEntry({
			sandboxId: sandbox.id,
			query,
			status: "success",
			executionTimeMs,
			rowsAffected,
		});

		return { columns: [], rows: [], rowsAffected, executionTimeMs };
	} catch (error) {
		const executionTimeMs = Date.now() - start;
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		await insertQueryHistoryEntry({
			sandboxId: sandbox.id,
			query,
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
}

export const $executeQuery = createServerFn({ method: "POST" })
	.inputValidator(executeQuerySchema)
	.handler(async ({ data }): Promise<QueryResult> => {
		const user = await getCurrentUser();
		const sandbox = await getOwnedSandbox(data.sandboxId, user.id);

		checkForbiddenCommands(data.query);

		return executeSandboxQuery({
			sandbox,
			query: data.query,
		});
	});

export const $getQueryHistory = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<QueryHistoryItem[]> => {
		const { db, queryHistory } = await getConsoleServerContext();
		const user = await getCurrentUser();
		await getOwnedSandbox(data.sandboxId, user.id);

		const history = await db
			.select()
			.from(queryHistory)
			.where(eq(queryHistory.sandboxId, data.sandboxId))
			.orderBy(desc(queryHistory.createdAt))
			.limit(50);

		return history.map((entry) => ({
			id: entry.id,
			query: entry.query,
			status: entry.status as "success" | "error",
			executionTimeMs: entry.executionTimeMs,
			rowsAffected: entry.rowsAffected,
			errorMessage: entry.errorMessage,
			createdAt: entry.createdAt.toISOString(),
		}));
	});

export const $aiGenerate = createServerFn({ method: "POST" })
	.inputValidator(aiGenerateSchema)
	.handler(async ({ data }): Promise<AiGenerateResult> => {
		const { aiLogs, db } = await getConsoleServerContext();
		const [{ checkAiRateLimit, recordAiRequest }, { generateSQL }] =
			await Promise.all([import("#/lib/rate-limit"), import("#/lib/ai")]);
		const user = await getCurrentUser();

		const rateLimit = checkAiRateLimit(user.id);
		if (!rateLimit.allowed) {
			throw new Error(
				`AI rate limit exceeded. Try again at ${rateLimit.resetAt.toLocaleTimeString()}.`,
			);
		}

		const sandbox = await getOwnedSandbox(data.sandboxId, user.id);

		const { sql, explanation, tokensUsed } = await generateSQL({
			prompt: data.prompt,
			engine: data.engine,
			sandboxDbName: sandbox.dbName,
		});

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
		const sandbox = await getOwnedSandbox(data.sandboxId, user.id);

		checkForbiddenCommands(data.sql);
		const result = await executeSandboxQuery({
			sandbox,
			query: data.sql,
		});

		await markAiLogExecuted(data.logId);

		return result;
	});

export const $getAiLogs = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<AiLogItem[]> => {
		const { aiLogs, db } = await getConsoleServerContext();
		const { isAiConfigured } = await import("#/lib/ai");
		const user = await getCurrentUser();
		await getOwnedSandbox(data.sandboxId, user.id);

		if (!isAiConfigured()) {
			return [];
		}

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
