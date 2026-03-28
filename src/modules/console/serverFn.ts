import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import type { RowDataPacket } from "mysql2";
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
import { AI_REQUESTS_PER_MONTH } from "#/lib/types";
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

const MAX_SCHEMA_CONTEXT_COLUMNS = 12;
const MAX_SCHEMA_CONTEXT_TABLES = 24;

function getCurrentUtcMonthRange() {
	const now = new Date();
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const end = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
	);

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
	port: number;
	dbName: string;
	dbUser: string;
	dbPassword: string;
};

type SchemaColumnRow = {
	columnDefault: string | null;
	columnKey: string | null;
	columnName: string;
	dataType: string;
	extra: string | null;
	isNullable: string | null;
	ordinalPosition: number;
	tableName: string;
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

function formatSchemaContext(rows: SchemaColumnRow[]): string | null {
	if (rows.length === 0) {
		return "No existing tables were found in this sandbox yet.";
	}

	const grouped = new Map<string, SchemaColumnRow[]>();
	for (const row of rows) {
		const current = grouped.get(row.tableName) ?? [];
		current.push(row);
		grouped.set(row.tableName, current);
	}

	const visibleTables = Array.from(grouped.entries()).slice(
		0,
		MAX_SCHEMA_CONTEXT_TABLES,
	);
	const lines: string[] = [];

	for (const [tableName, columns] of visibleTables) {
		lines.push(`Table ${tableName}:`);
		const visibleColumns = columns.slice(0, MAX_SCHEMA_CONTEXT_COLUMNS);

		for (const column of visibleColumns) {
			const parts = [column.columnName, column.dataType];
			if (column.columnKey === "PRI") {
				parts.push("PRIMARY KEY");
			}
			if (column.extra) {
				parts.push(column.extra);
			}
			parts.push(column.isNullable === "NO" ? "NOT NULL" : "NULLABLE");
			if (column.columnDefault !== null) {
				parts.push(`DEFAULT ${column.columnDefault}`);
			}
			lines.push(`- ${parts.join(" | ")}`);
		}

		if (columns.length > MAX_SCHEMA_CONTEXT_COLUMNS) {
			lines.push(
				`- ... ${columns.length - MAX_SCHEMA_CONTEXT_COLUMNS} more columns omitted`,
			);
		}
	}

	if (grouped.size > MAX_SCHEMA_CONTEXT_TABLES) {
		lines.push(
			`... ${grouped.size - MAX_SCHEMA_CONTEXT_TABLES} more tables omitted`,
		);
	}

	return lines.join("\n");
}

async function getSandboxSchemaContext(
	sandbox: SandboxRow,
): Promise<string | null> {
	const [{ getSandboxConnection }, mysqlModule, { Pool: PgPool }] =
		await Promise.all([
			import("#/lib/sandbox-provisioning"),
			import("mysql2/promise"),
			import("pg"),
		]);

	const { host, port } = getSandboxConnection(
		sandbox.engine as DbEngine,
		sandbox.region,
		sandbox.host,
		sandbox.port,
	);

	try {
		if (sandbox.engine === "postgresql") {
			const pool = new PgPool({
				host,
				port,
				database: sandbox.dbName,
				user: sandbox.dbUser,
				password: sandbox.dbPassword,
				max: 3,
			});

			try {
				const result = await pool.query<{
					column_default: string | null;
					column_name: string;
					data_type: string;
					is_nullable: string | null;
					ordinal_position: number;
					table_name: string;
				}>(
					`SELECT
						table_name,
						column_name,
						data_type,
						is_nullable,
						column_default,
						ordinal_position
					FROM information_schema.columns
					WHERE table_schema = 'public'
					ORDER BY table_name, ordinal_position`,
				);

				return formatSchemaContext(
					result.rows.map((row) => ({
						columnDefault: row.column_default,
						columnKey: null,
						columnName: row.column_name,
						dataType: row.data_type,
						extra: null,
						isNullable: row.is_nullable,
						ordinalPosition: row.ordinal_position,
						tableName: row.table_name,
					})),
				);
			} finally {
				await pool.end();
			}
		}

		const pool = mysqlModule.createPool({
			host,
			port,
			database: sandbox.dbName,
			user: sandbox.dbUser,
			password: sandbox.dbPassword,
			waitForConnections: true,
			connectionLimit: 3,
			...(sandbox.engine === "mariadb" && {
				authPlugin: "mysql_native_password",
			}),
		});

		try {
			const [rows] = await pool.query<Array<RowDataPacket & SchemaColumnRow>>(
				`SELECT
					table_name AS tableName,
					column_name AS columnName,
					data_type AS dataType,
					is_nullable AS isNullable,
					column_default AS columnDefault,
					column_key AS columnKey,
					extra AS extra,
					ordinal_position AS ordinalPosition
				FROM information_schema.columns
				WHERE table_schema = ?
				ORDER BY table_name, ordinal_position`,
				[sandbox.dbName],
			);

			return formatSchemaContext(rows);
		} finally {
			await pool.end();
		}
	} catch (error) {
		console.warn(
			`[ai] Failed to introspect schema for sandbox ${sandbox.id}`,
			error,
		);
		return null;
	}
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
		sandbox.port,
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
		const { end, start } = getCurrentUtcMonthRange();

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

		const sandbox = await getOwnedSandbox(data.sandboxId, user.id);
		if ((usageResult?.count ?? 0) >= AI_REQUESTS_PER_MONTH) {
			throw new Error("AI monthly limit reached. Try again next month.");
		}
		const schemaContext = await getSandboxSchemaContext(sandbox);

		const { sql, explanation, tokensUsed } = await generateSQL({
			prompt: data.prompt,
			engine: data.engine,
			sandboxDbName: sandbox.dbName,
			mode: data.mode,
			schemaContext,
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
