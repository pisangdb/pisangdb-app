/**
 * Query Executor - SQL Query Execution for Sandbox Databases
 *
 * This module handles executing SQL queries against sandbox databases:
 * - Connects using sandbox credentials (not admin)
 * - Enforces 30-second query timeout
 * - Blocks dangerous SQL commands
 * - Logs queries to query_history table
 * - Returns structured results with execution metrics
 *
 * @see PRD §6.4 - SQL Console
 * @see PRD §6.4.2 - Safety Guards
 * @see PRD §12.2 - Sandbox Isolation
 */

import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { Pool as PgPool } from "pg";
import { db } from "#/db/index";
import { queryHistory, type Sandbox } from "#/db/schema";
import type { DatabaseEngine } from "#/lib/db-managers/interface";
import { createLogger } from "#/lib/logger";
import { decryptPassword } from "#/lib/session";

const log = createLogger("QueryExecutor");

// ============================================================================
// Constants
// ============================================================================

/** Query timeout in milliseconds (30 seconds per PRD §6.4.2) */
const QUERY_TIMEOUT_MS = 30_000;

/** Maximum rows to return in a single query result */
const MAX_RESULT_ROWS = 10_000;

/**
 * Blocked SQL commands that could be dangerous
 * @see PRD §6.4.2 - Safety Guards
 */
const BLOCKED_COMMANDS = [
	// Database-level operations
	/DROP\s+DATABASE/i,
	/CREATE\s+DATABASE/i,
	/ALTER\s+DATABASE/i,

	// System-level operations
	/ALTER\s+SYSTEM/i,
	/CREATE\s+EXTENSION/i,
	/DROP\s+EXTENSION/i,

	// File system access
	/COPY\s+.*\s+TO\s+/i,
	/COPY\s+.*\s+FROM\s+/i,
	/pg_read_file/i,
	/pg_write_file/i,
	/pg_stat_file/i,
	/pg_ls_dir/i,

	// User/role management
	/CREATE\s+USER/i,
	/CREATE\s+ROLE/i,
	/DROP\s+USER/i,
	/DROP\s+ROLE/i,
	/ALTER\s+USER/i,
	/ALTER\s+ROLE/i,

	// Privilege escalation
	/GRANT\s+ALL/i,
	/REVOKE\s+ALL/i,

	// Configuration
	/SET\s+session_preload_libraries/i,
	/LOAD\s+/i,
];

// ============================================================================
// Types
// ============================================================================

/**
 * Result of executing a SQL query
 */
export interface QueryResult {
	/** Whether the query executed successfully */
	success: boolean;

	/** Query results as array of row objects (for SELECT queries) */
	rows?: Array<Record<string, unknown>>;

	/** Number of rows returned (for SELECT) or affected (for INSERT/UPDATE/DELETE) */
	rowCount?: number;

	/** Execution time in milliseconds */
	executionTimeMs: number;

	/** Error message if query failed */
	error?: string;

	/** Error details for debugging (not exposed to user) */
	_errorDetails?: string;
}

/**
 * Validation result for SQL commands
 */
interface ValidationResult {
	valid: boolean;
	blockedCommand?: string;
}

// ============================================================================
// SQL Validation
// ============================================================================

/**
 * Check if a SQL query contains blocked commands
 *
 * @param sql - SQL query to validate
 * @returns Validation result with blocked command if found
 */
function validateSql(sql: string): ValidationResult {
	// Remove comments and normalize whitespace
	const normalizedSql = sql
		.replace(/--.*$/gm, "") // Remove single-line comments
		.replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();

	for (const pattern of BLOCKED_COMMANDS) {
		if (pattern.test(normalizedSql)) {
			// Extract the matched command for the error message
			const match = normalizedSql.match(pattern);
			return {
				valid: false,
				blockedCommand: match?.[0] ?? "blocked command",
			};
		}
	}

	return { valid: true };
}

// ============================================================================
// Query History Logging
// ============================================================================

/**
 * Log a query execution to the query_history table
 *
 * @param sandboxId - UUID of the sandbox
 * @param query - SQL query that was executed
 * @param status - 'success' or 'error'
 * @param executionTimeMs - Execution time in milliseconds
 * @param rowsAffected - Number of rows affected (optional)
 * @param errorMessage - Error message if failed (optional)
 */
async function logQuery(
	sandboxId: string,
	query: string,
	status: "success" | "error",
	executionTimeMs: number,
	rowsAffected?: number,
	errorMessage?: string,
): Promise<void> {
	try {
		await db.insert(queryHistory).values({
			sandboxId,
			query,
			status,
			executionTimeMs,
			rowsAffected: rowsAffected ?? null,
			errorMessage: errorMessage ?? null,
		});
	} catch (error) {
		// Log but don't throw - logging failure shouldn't break query execution
		log.error("Failed to log query history", { error });
	}
}

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Create a connection pool for a sandbox database
 * Uses sandbox credentials (not admin) for proper isolation
 *
 * @param sandbox - Sandbox record with connection details
 * @returns PostgreSQL connection pool, or null if decryption fails
 */
function createSandboxPool(sandbox: {
	dbName: string;
	dbUser: string;
	dbPassword: string;
	host: string;
	port: number;
	engine: DatabaseEngine;
}): PgPool | null | mysql.Connection {
	// Decrypt the password before use
	let decryptedPassword: string;
	try {
		decryptedPassword = decryptPassword(sandbox.dbPassword);
	} catch (error) {
		log.error("Failed to decrypt password", { error });
		return null;
	}

	const host =
		process.env.NODE_ENV === "development" && process.env.SANDBOX_HOST
			? process.env.SANDBOX_HOST
			: sandbox.host;

	if (sandbox.engine === "postgresql") {
		const connectionString = `postgresql://${sandbox.dbUser}:${encodeURIComponent(decryptedPassword)}@${host}:${sandbox.port}/${sandbox.dbName}`;
		return new PgPool({
			connectionString,
			max: 1,
			idleTimeoutMillis: 10_000,
			statement_timeout: QUERY_TIMEOUT_MS,
		});
	}

	// MySQL or MariaDB
	const connectionString = `mysql://${sandbox.dbUser}:${encodeURIComponent(decryptedPassword)}@${host}:${sandbox.port}/${sandbox.dbName}`;
	return mysql.createConnection({
		uri: connectionString,
		connectTimeout: QUERY_TIMEOUT_MS,
	});
}

// ============================================================================
// Public API: Query Execution
// ============================================================================

/**
 * Execute a SQL query against a sandbox database
 *
 * This function:
 * 1. Validates the SQL for blocked commands
 * 2. Creates a connection pool with sandbox credentials
 * 3. Executes the query with timeout enforcement
 * 4. Logs the result to query_history
 * 5. Returns structured results
 *
 * @param sandbox - Sandbox record from database
 * @param sql - SQL query to execute
 * @returns Query result with rows, execution time, and status
 *
 * @example
 * ```typescript
 * const result = await executeQuery(sandbox, "SELECT * FROM users LIMIT 10");
 * if (result.success) {
 *   console.log(`Found ${result.rowCount} rows in ${result.executionTimeMs}ms`);
 *   console.log(result.rows);
 * } else {
 *   console.error(`Query failed: ${result.error}`);
 * }
 * ```
 */
export async function executeQuery(
	sandbox: Pick<
		Sandbox,
		"id" | "dbName" | "dbUser" | "dbPassword" | "host" | "port" | "engine"
	> & { engine: DatabaseEngine },
	sql: string,
): Promise<QueryResult> {
	const startTime = Date.now();

	// Step 1: Validate SQL for blocked commands
	const validation = validateSql(sql);
	if (!validation.valid) {
		const executionTimeMs = Date.now() - startTime;
		await logQuery(
			sandbox.id,
			sql,
			"error",
			executionTimeMs,
			undefined,
			`Blocked command: ${validation.blockedCommand}`,
		);

		return {
			success: false,
			executionTimeMs,
			error: `Query contains blocked command: ${validation.blockedCommand}. This operation is not allowed for security reasons.`,
		};
	}

	// Step 2: Validate engine type
	const supportedEngines: DatabaseEngine[] = ["postgresql", "mysql", "mariadb"];
	if (!supportedEngines.includes(sandbox.engine)) {
		const executionTimeMs = Date.now() - startTime;
		return {
			success: false,
			executionTimeMs,
			error: `Unknown engine: ${sandbox.engine}`,
		};
	}

	let pgPool: PgPool | null = null;
	let mysqlConn: mysql.Connection | null = null;

	try {
		// Step 3: Create connection with sandbox credentials
		if (sandbox.engine === "postgresql") {
			pgPool = createSandboxPool(sandbox) as PgPool | null;
			if (!pgPool) {
				const executionTimeMs = Date.now() - startTime;
				return {
					success: false,
					executionTimeMs,
					error: "Failed to connect to the database. Invalid credentials.",
				};
			}

			// Execute PostgreSQL query with timeout
			const result = await Promise.race([
				pgPool.query(sql),
				new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("Query timeout exceeded")),
						QUERY_TIMEOUT_MS,
					),
				),
			]);

			const executionTimeMs = Date.now() - startTime;
			const rows = (result.rows || []).slice(0, MAX_RESULT_ROWS);
			const rowCount = result.rowCount ?? rows.length;

			await logQuery(sandbox.id, sql, "success", executionTimeMs, rowCount);

			return {
				success: true,
				rows,
				rowCount,
				executionTimeMs,
			};
		}

		// MySQL or MariaDB
		mysqlConn = createSandboxPool(sandbox) as mysql.Connection | null;
		if (!mysqlConn) {
			const executionTimeMs = Date.now() - startTime;
			return {
				success: false,
				executionTimeMs,
				error: "Failed to connect to the database. Invalid credentials.",
			};
		}

		// Execute MySQL/MariaDB query with timeout
		const [mysqlResult] = await Promise.race([
			mysqlConn.execute(sql),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("Query timeout exceeded")),
					QUERY_TIMEOUT_MS,
				),
			),
		]);

		const executionTimeMs = Date.now() - startTime;

		// MySQL result structure is different from PostgreSQL
		const rows =
			"rows" in mysqlResult
				? (mysqlResult.rows || []).slice(0, MAX_RESULT_ROWS)
				: [];
		const rowCount =
			"affectedRows" in mysqlResult
				? mysqlResult.affectedRows || 0
				: rows.length || 0;

		await logQuery(sandbox.id, sql, "success", executionTimeMs, rowCount);

		return {
			success: true,
			rows,
			rowCount,
			executionTimeMs,
		};
	} catch (error) {
		const executionTimeMs = Date.now() - startTime;

		// Extract error message
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		const errorDetails = error instanceof Error ? error.stack : String(error);

		// Log failed query
		await logQuery(
			sandbox.id,
			sql,
			"error",
			executionTimeMs,
			undefined,
			errorMessage,
		);

		// Return user-friendly error
		return {
			success: false,
			executionTimeMs,
			error: formatErrorMessage(errorMessage, sandbox.engine),
			_errorDetails: errorDetails,
		};
	} finally {
		// Step 7: Always clean up connections
		if (pgPool) {
			try {
				await pgPool.end();
			} catch (error) {
				log.error("Failed to close PostgreSQL pool", { error });
			}
		}
		if (mysqlConn) {
			try {
				await mysqlConn.end();
			} catch (error) {
				log.error("Failed to close MySQL connection", { error });
			}
		}
	}
}

/**
 * Format error messages for user display
 * Removes internal details and provides helpful context
 *
 * @param message - Raw error message from PostgreSQL
 * @returns User-friendly error message
 */
function formatErrorMessage(
	message: string,
	engine: DatabaseEngine = "postgresql",
): string {
	// Common PostgreSQL error patterns
	if (engine === "postgresql") {
		if (message.includes("relation") && message.includes("does not exist")) {
			return "Table does not exist. Please check the table name and try again.";
		}
		if (message.includes("column") && message.includes("does not exist")) {
			return "Column does not exist. Please check the column name and try again.";
		}
		if (message.includes("syntax error")) {
			return "SQL syntax error. Please check your query and try again.";
		}
		if (message.includes("permission denied")) {
			return "Permission denied. You don't have access to perform this operation.";
		}
	}

	// Common MySQL/MariaDB error patterns
	if (engine === "mysql" || engine === "mariadb") {
		if (message.includes("Table") && message.includes("doesn't exist")) {
			return "Table does not exist. Please check the table name and try again.";
		}
		if (message.includes("Unknown column")) {
			return "Column does not exist. Please check the column name and try again.";
		}
		if (message.includes("syntax") && message.includes("error")) {
			return "SQL syntax error. Please check your query and try again.";
		}
		if (message.includes("denied")) {
			return "Permission denied. You don't have access to perform this operation.";
		}
	}

	// Common errors for all engines
	if (message.includes("Query timeout") || message.includes("timeout")) {
		return "Query timed out after 30 seconds. Please simplify your query or add appropriate indexes.";
	}

	if (message.includes("connection")) {
		return "Failed to connect to the database. The sandbox may be expired or unavailable.";
	}

	// Default: return sanitized message
	// Remove any potential sensitive information
	return message
		.replace(/password "[^"]*"/gi, 'password "***"')
		.replace(/user "[^"]*"/gi, 'user "***"')
		.replace(/database "[^"]*"/gi, 'database "***"')
		.slice(0, 500); // Limit message length
}

// ============================================================================
// Public API: Query History
// ============================================================================

/**
 * Get query history for a sandbox
 *
 * @param sandboxId - UUID of the sandbox
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of query history records
 */
export async function getQueryHistory(
	sandboxId: string,
	limit = 50,
): Promise<
	Array<{
		id: string;
		query: string;
		status: string;
		executionTimeMs: number | null;
		rowsAffected: number | null;
		errorMessage: string | null;
		createdAt: Date;
	}>
> {
	const history = await db
		.select({
			id: queryHistory.id,
			query: queryHistory.query,
			status: queryHistory.status,
			executionTimeMs: queryHistory.executionTimeMs,
			rowsAffected: queryHistory.rowsAffected,
			errorMessage: queryHistory.errorMessage,
			createdAt: queryHistory.createdAt,
		})
		.from(queryHistory)
		.where(eq(queryHistory.sandboxId, sandboxId))
		.orderBy(queryHistory.createdAt)
		.limit(limit);

	return history.map((h) => ({
		...h,
		createdAt: h.createdAt ?? new Date(),
	}));
}

// ============================================================================
// Public API: Utility Functions
// ============================================================================

/**
 * Check if a SQL query is safe to execute
 * Returns validation result without executing the query
 *
 * @param sql - SQL query to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateQuery(sql: string): {
	isValid: boolean;
	error?: string;
} {
	const validation = validateSql(sql);
	if (!validation.valid) {
		return {
			isValid: false,
			error: `Query contains blocked command: ${validation.blockedCommand}`,
		};
	}
	return { isValid: true };
}

/**
 * Get the list of blocked SQL commands
 * Useful for displaying to users what operations are not allowed
 *
 * @returns Array of blocked command descriptions
 */
export function getBlockedCommands(): string[] {
	return [
		"DROP DATABASE",
		"CREATE DATABASE",
		"ALTER DATABASE",
		"ALTER SYSTEM",
		"CREATE EXTENSION",
		"DROP EXTENSION",
		"COPY TO/FROM (file system access)",
		"pg_read_file, pg_write_file (file system functions)",
		"CREATE USER/ROLE",
		"DROP USER/ROLE",
		"ALTER USER/ROLE",
		"GRANT ALL",
		"REVOKE ALL",
		"SET session_preload_libraries",
		"LOAD (library loading)",
	];
}
