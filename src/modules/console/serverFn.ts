import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { Pool } from "pg";
import { generateSql } from "#/lib/gemini-client";
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

const FORBIDDEN_COMMANDS = [
	"DROP DATABASE",
	"ALTER SYSTEM",
	"GRANT ALL",
	"GRANT",
	"REVOKE ALL",
	"REVOKE",
	"CREATE USER",
	"DROP USER",
	"CREATE ROLE",
	"DROP ROLE",
	"SHUTDOWN",
	"PG_TERMINATE_BACKEND",
	"PG_CANCEL_BACKEND",
];

const QUERY_TIMEOUT_MS = 30000;

function isQueryAllowed(query: string): boolean {
	const upperQuery = query.trim().toUpperCase();
	return !FORBIDDEN_COMMANDS.some((cmd) => upperQuery.includes(cmd));
}

async function getCurrentUser(): Promise<{ id: string; role: string }> {
	const request = getRequest();
	const session = await import("#/lib/auth").then((m) =>
		m.auth.api.getSession({ headers: request.headers }),
	);

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	return { id: session.user.id, role: session.user.role ?? "user" };
}

async function getSandboxWithAuth(sandboxId: string): Promise<{
	id: string;
	engine: string;
	region: string;
	dbName: string;
	dbUser: string;
	dbPassword: string;
	host: string;
	port: number;
	status: string;
}> {
	const user = await getCurrentUser();

	const appPool = new Pool({ connectionString: process.env.DATABASE_URL });
	const result = await appPool.query(
		"SELECT id, engine, region, db_name, db_user, db_password, host, port, status FROM sandboxes WHERE id = $1 AND user_id = $2",
		[sandboxId, user.id],
	);
	await appPool.end();

	const sandbox = result.rows[0];

	if (!sandbox) {
		throw new Error("Sandbox not found");
	}

	return sandbox;
}

function buildConnectionString(
	engine: string,
	host: string,
	port: number,
	dbName: string,
	user: string,
	password: string,
): string {
	if (engine === "postgresql") {
		return `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
	}
	return `mysql://${user}:${password}@${host}:${port}/${dbName}`;
}

export const $executeQuery = createServerFn({ method: "POST" })
	.inputValidator(executeQuerySchema)
	.handler(async ({ data }): Promise<QueryResult> => {
		const sandbox = await getSandboxWithAuth(data.sandboxId);

		if (sandbox.status !== "active") {
			throw new Error("Sandbox is not active");
		}

		if (!isQueryAllowed(data.query)) {
			throw new Error("This command is not allowed");
		}

		const connectionString = buildConnectionString(
			sandbox.engine,
			sandbox.host,
			sandbox.port,
			sandbox.dbName,
			sandbox.dbUser,
			sandbox.dbPassword,
		);

		const pool = new Pool({
			connectionString,
			statement_timeout: QUERY_TIMEOUT_MS,
		});

		const start = Date.now();

		try {
			const result = await pool.query(data.query);

			const columns = result.fields.map((f) => f.name);
			const rows = result.rows as Record<
				string,
				string | number | boolean | null
			>[];

			await pool.end();

			const appPool = new Pool({
				connectionString: process.env.DATABASE_URL,
			});
			await appPool.query(
				`INSERT INTO query_history (sandbox_id, query, status, execution_time_ms, rows_affected)
				 VALUES ($1, $2, 'success', $3, $4)`,
				[data.sandboxId, data.query, Date.now() - start, result.rowCount ?? 0],
			);
			await appPool.end();

			return {
				columns,
				rows,
				rowsAffected: result.rowCount ?? 0,
				executionTimeMs: Date.now() - start,
			};
		} catch (error) {
			await pool.end();

			const appPool = new Pool({
				connectionString: process.env.DATABASE_URL,
			});
			await appPool.query(
				`INSERT INTO query_history (sandbox_id, query, status, execution_time_ms, error_message)
				 VALUES ($1, $2, 'error', $3, $4)`,
				[
					data.sandboxId,
					data.query,
					Date.now() - start,
					error instanceof Error ? error.message : "Unknown error",
				],
			);
			await appPool.end();

			return {
				columns: [],
				rows: [],
				rowsAffected: 0,
				executionTimeMs: Date.now() - start,
			};
		}
	});

export const $getQueryHistory = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<QueryHistoryItem[]> => {
		await getCurrentUser();

		const appPool = new Pool({ connectionString: process.env.DATABASE_URL });
		const result = await appPool.query(
			`SELECT id, query, status, execution_time_ms, rows_affected, error_message, created_at
			 FROM query_history
			 WHERE sandbox_id = $1
			 ORDER BY created_at DESC
			 LIMIT 50`,
			[data.sandboxId],
		);
		await appPool.end();

		return result.rows.map((row) => ({
			id: row.id,
			query: row.query,
			status: row.status,
			executionTimeMs: row.execution_time_ms,
			rowsAffected: row.rows_affected,
			errorMessage: row.error_message,
			createdAt: row.created_at.toISOString(),
		}));
	});

export const $aiGenerate = createServerFn({ method: "POST" })
	.inputValidator(aiGenerateSchema)
	.handler(async ({ data }): Promise<AiGenerateResult> => {
		const user = await getCurrentUser();
		const input = data as AiGenerateInput;

		const sandbox = await getSandboxWithAuth(input.sandboxId);

		const appPool = new Pool({ connectionString: process.env.DATABASE_URL });
		const countResult = await appPool.query(
			"SELECT COUNT(*) as count FROM ai_logs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'",
			[user.id],
		);
		await appPool.end();

		const dailyCount = Number(countResult.rows[0].count) || 0;
		if (dailyCount >= 30) {
			throw new Error("AI rate limit exceeded. Max 30 requests per day.");
		}

		let sqlResult: { sql: string; explanation: string; tokensUsed: number };
		try {
			sqlResult = await generateSql(
				input.prompt,
				sandbox.engine as "postgresql" | "mysql" | "mariadb",
				input.mode || input.mode || "schema",
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "AI generation failed";
			throw new Error(message);
		}

		const insertPool = new Pool({
			connectionString: process.env.DATABASE_URL,
		});
		const logResult = await insertPool.query(
			`INSERT INTO ai_logs (sandbox_id, user_id, prompt, response, sql_generated, executed, tokens_used)
			 VALUES ($1, $2, $3, $4, $5, false, $6)
			 RETURNING id`,
			[
				input.sandboxId,
				user.id,
				input.prompt,
				sqlResult.explanation,
				sqlResult.sql,
				sqlResult.tokensUsed,
			],
		);
		await insertPool.end();

		return {
			logId: logResult.rows[0].id,
			sqlGenerated: sqlResult.sql,
			explanation: sqlResult.explanation,
			tokensUsed: sqlResult.tokensUsed,
		};
	});

export const $aiExecute = createServerFn({ method: "POST" })
	.inputValidator(aiExecuteSchema)
	.handler(async ({ data }): Promise<QueryResult> => {
		const user = await getCurrentUser();
		const { logId, sandboxId, sql } = data;

		const sandbox = await getSandboxWithAuth(sandboxId);

		const appPool = new Pool({ connectionString: process.env.DATABASE_URL });
		const logResult = await appPool.query(
			"SELECT id FROM ai_logs WHERE id = $1 AND sandbox_id = $2 AND user_id = $3",
			[logId, sandboxId, user.id],
		);
		await appPool.end();

		if (logResult.rows.length === 0) {
			throw new Error("AI log not found");
		}

		if (!isQueryAllowed(sql)) {
			throw new Error("This command is not allowed");
		}

		const connectionString = buildConnectionString(
			sandbox.engine,
			sandbox.host,
			sandbox.port,
			sandbox.dbName,
			sandbox.dbUser,
			sandbox.dbPassword,
		);

		const pool = new Pool({
			connectionString,
			statement_timeout: QUERY_TIMEOUT_MS,
		});

		const start = Date.now();

		try {
			const result = await pool.query(sql);
			await pool.end();

			const updatePool = new Pool({
				connectionString: process.env.DATABASE_URL,
			});
			await updatePool.query(
				"UPDATE ai_logs SET executed = true WHERE id = $1",
				[logId],
			);
			await updatePool.end();

			const columns = result.fields.map((f) => f.name);
			const rows = result.rows as Record<
				string,
				string | number | boolean | null
			>[];

			return {
				columns,
				rows,
				rowsAffected: result.rowCount ?? 0,
				executionTimeMs: Date.now() - start,
			};
		} catch (_error) {
			await pool.end();

			return {
				columns: [],
				rows: [],
				rowsAffected: 0,
				executionTimeMs: Date.now() - start,
			};
		}
	});

export const $getAiLogs = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<AiLogItem[]> => {
		await getCurrentUser();

		const appPool = new Pool({ connectionString: process.env.DATABASE_URL });
		const result = await appPool.query(
			`SELECT id, prompt, response, sql_generated, executed, tokens_used, created_at
			 FROM ai_logs
			 WHERE sandbox_id = $1
			 ORDER BY created_at DESC
			 LIMIT 50`,
			[data.sandboxId],
		);
		await appPool.end();

		return result.rows.map((row) => ({
			id: row.id,
			prompt: row.prompt,
			response: row.response,
			sqlGenerated: row.sql_generated,
			executed: row.executed,
			tokensUsed: row.tokens_used,
			createdAt: row.created_at.toISOString(),
		}));
	});
