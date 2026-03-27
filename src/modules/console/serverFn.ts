import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, gte, lt } from "drizzle-orm";
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

const AI_DAILY_LIMIT = 30;

function getTodayUtcRange() {
	const now = new Date();
	const start = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);
	const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

	return { end, start };
}

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

function sanitizeExecutableSql(query: string): string {
	return query
		.trim()
		.replace(/^```(?:sql)?\s*/i, "")
		.replace(/\s*```$/i, "");
}

function getEngineSyntaxHint(
	engine: DbEngine,
	query: string,
	errorMessage: string,
): string | null {
	const upperQuery = query.toUpperCase();
	const upperError = errorMessage.toUpperCase();

	if (engine === "postgresql") {
		if (
			upperQuery.includes("AUTO_INCREMENT") ||
			query.includes("`") ||
			upperQuery.includes("ENGINE=") ||
			upperQuery.includes("ON UPDATE CURRENT_TIMESTAMP")
		) {
			return "This SQL looks like MySQL/MariaDB syntax, but the selected sandbox uses PostgreSQL.";
		}
	}

	if (engine === "mysql" || engine === "mariadb") {
		if (
			upperQuery.includes("TIMESTAMPTZ") ||
			upperQuery.includes("BIGSERIAL") ||
			upperQuery.includes("SERIAL PRIMARY KEY") ||
			upperQuery.includes(" ILIKE ") ||
			upperQuery.includes(" RETURNING ")
		) {
			return `This SQL looks like PostgreSQL syntax, but the selected sandbox uses ${engine === "mysql" ? "MySQL" : "MariaDB"}.`;
		}
	}

	if (
		engine === "postgresql" &&
		(upperError.includes("AUTO_INCREMENT") ||
			upperError.includes("SYNTAX ERROR"))
	) {
		return "PostgreSQL supports multiple statements here, but every statement still must use PostgreSQL syntax.";
	}

	return null;
}

function splitSqlStatements(query: string): string[] {
	const statements: string[] = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let inBacktick = false;
	let inLineComment = false;
	let inBlockComment = false;

	for (let index = 0; index < query.length; index += 1) {
		const char = query[index];
		const next = query[index + 1];

		if (inLineComment) {
			current += char;
			if (char === "\n") {
				inLineComment = false;
			}
			continue;
		}

		if (inBlockComment) {
			current += char;
			if (char === "*" && next === "/") {
				current += next;
				inBlockComment = false;
				index += 1;
			}
			continue;
		}

		if (inSingleQuote) {
			current += char;
			if (char === "'" && next === "'") {
				current += next;
				index += 1;
				continue;
			}
			if (char === "'") {
				inSingleQuote = false;
			}
			continue;
		}

		if (inDoubleQuote) {
			current += char;
			if (char === '"') {
				inDoubleQuote = false;
			}
			continue;
		}

		if (inBacktick) {
			current += char;
			if (char === "`") {
				inBacktick = false;
			}
			continue;
		}

		if (char === "-" && next === "-") {
			current += char;
			current += next;
			inLineComment = true;
			index += 1;
			continue;
		}

		if (char === "/" && next === "*") {
			current += char;
			current += next;
			inBlockComment = true;
			index += 1;
			continue;
		}

		if (char === "'") {
			current += char;
			inSingleQuote = true;
			continue;
		}

		if (char === '"') {
			current += char;
			inDoubleQuote = true;
			continue;
		}

		if (char === "`") {
			current += char;
			inBacktick = true;
			continue;
		}

		if (char === ";") {
			const statement = current.trim();
			if (statement) {
				statements.push(statement);
			}
			current = "";
			continue;
		}

		current += char;
	}

	const trailing = current.trim();
	if (trailing) {
		statements.push(trailing);
	}

	return statements;
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

async function markAiLogExecuted(logId: string | null | undefined) {
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
	const { sandbox } = params;
	const query = sanitizeExecutableSql(params.query);
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
			...(sandbox.engine === "mariadb" && {
				authPlugin: "mysql_native_password",
			}),
		});

		if (sandbox.engine === "mysql") {
			await pool.query("SET SESSION MAX_EXECUTION_TIME=30000");
		} else {
			await pool.query("SET SESSION max_statement_time = 30");
		}

		const statements = splitSqlStatements(query);
		let columns: string[] = [];
		let resultRows: Record<string, string | number | boolean | null>[] = [];
		let rowsAffected = 0;

		for (const statement of statements) {
			const [rows] = await pool.query(statement);

			if (Array.isArray(rows) && rows.length > 0) {
				columns = Object.keys(rows[0] as Record<string, unknown>);
				resultRows = rows as Record<string, string | number | boolean | null>[];
				rowsAffected = resultRows.length;
				continue;
			}

			if (Array.isArray(rows)) {
				columns = [];
				resultRows = [];
				rowsAffected = rows.length;
				continue;
			}

			const result = rows as mysql.ResultSetHeader;
			columns = [];
			resultRows = [];
			rowsAffected += result.affectedRows ?? 0;
		}

		const executionTimeMs = Date.now() - start;

		await insertQueryHistoryEntry({
			sandboxId: sandbox.id,
			query,
			status: "success",
			executionTimeMs,
			rowsAffected,
		});

		return {
			columns,
			rows: resultRows,
			rowsAffected,
			executionTimeMs,
		};
	} catch (error) {
		const executionTimeMs = Date.now() - start;
		const rawErrorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const syntaxHint = getEngineSyntaxHint(
			sandbox.engine as DbEngine,
			query,
			rawErrorMessage,
		);
		const errorMessage = syntaxHint
			? `${syntaxHint} ${rawErrorMessage}`
			: rawErrorMessage;

		await insertQueryHistoryEntry({
			sandboxId: sandbox.id,
			query,
			status: "error",
			executionTimeMs,
			errorMessage,
		});

		throw new Error(errorMessage);
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
		const [{ generateSQL }] = await Promise.all([import("#/lib/ai")]);
		const user = await getCurrentUser();
		const { end, start } = getTodayUtcRange();

		const [usageResult] = await db
			.select({ count: count() })
			.from(aiLogs)
			.where(
				and(
					eq(aiLogs.userId, user.id),
					gte(aiLogs.createdAt, start),
					lt(aiLogs.createdAt, end),
				),
			);

		if ((usageResult?.count ?? 0) >= AI_DAILY_LIMIT) {
			throw new Error("AI daily limit reached. Try again tomorrow.");
		}

		const sandbox = await getOwnedSandbox(data.sandboxId, user.id);

		const { sql, explanation, tokensUsed } = await generateSQL({
			prompt: data.prompt,
			engine: data.engine,
			sandboxDbName: sandbox.dbName,
			mode: data.mode,
		});

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
		const { assertExecutableGeneratedSql } = await import("#/lib/ai");

		checkForbiddenCommands(data.sql);
		assertExecutableGeneratedSql(
			sanitizeExecutableSql(data.sql),
			sandbox.engine as DbEngine,
		);
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
