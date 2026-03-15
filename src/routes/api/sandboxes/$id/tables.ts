/**
 * GET /api/sandboxes/:id/tables
 *
 * Returns list of tables in a sandbox database with metadata.
 * Per PRD §6.2.3:
 * - Protected by authentication
 * - Only owner can access
 * - Returns table name, row count, and size in KB
 * - Connects as sandbox user (not admin)
 */

import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { db } from "#/db";
import { sandboxes } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import { verifyToken } from "#/lib/session";

const SESSION_COOKIE_NAME = "session";

export const Route = createFileRoute("/api/sandboxes/$id/tables")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { id } = params;

				// Step 1: Authenticate user
				const token = getCookie(SESSION_COOKIE_NAME);

				if (!token) {
					return errorResponse("authentication_required", "Authentication required", 401);
				}

				const payload = await verifyToken(token);
				if (!payload) {
					return errorResponse(
						"authentication_required",
						"Invalid or expired session",
						401,
					);
				}

				const userId = payload.userId;

				// Step 2: Fetch sandbox by ID
				const [sandbox] = await db
					.select()
					.from(sandboxes)
					.where(eq(sandboxes.id, id))
					.limit(1);

				// Step 3: Return 404 if not found
				if (!sandbox) {
					return errorResponse("sandbox_not_found", "Sandbox not found", 404);
				}

				// Step 4: Verify ownership - return 403 if not owner
				if (sandbox.userId !== userId) {
					return errorResponse("access_denied", "Access denied", 403);
				}

				// Step 5: Check if sandbox is active
				if (sandbox.status === "expired" || sandbox.status === "destroying") {
					return errorResponse("sandbox_expired", "Sandbox has expired", 410);
				}

				// Step 6: Connect to sandbox database using sandbox credentials
				// Per PRD §12.2 - Connect as sandbox user, not admin
				const { host, port, dbName, dbUser, dbPassword, engine } = sandbox;

				// Only PostgreSQL is supported for now
				if (engine !== "postgresql") {
					return errorResponse(
						"unsupported_engine",
						"Table listing is only supported for PostgreSQL sandboxes",
						400,
					);
				}

				// Build connection string for sandbox database
				const connectionString = `postgresql://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;

				let sandboxPool: Pool | null = null;

				try {
					// Create a new pool for this sandbox connection
					sandboxPool = new Pool({
						connectionString,
						max: 1, // Single connection for this query
						idleTimeoutMillis: 5000,
					});

					const client = await sandboxPool.connect();

					try {
						// Step 7: Query table names from information_schema
						const tablesResult = await client.query(`
							SELECT table_name
							FROM information_schema.tables
							WHERE table_schema = 'public'
							ORDER BY table_name
						`);

						// Step 8: Query row counts from pg_stat_user_tables
						const statsResult = await client.query(`
							SELECT relname, n_live_tup
							FROM pg_stat_user_tables
						`);

						// Step 9: Query table sizes from pg_class
						const sizeResult = await client.query(`
							SELECT relname, pg_relation_size(oid) / 1024 as size_kb
							FROM pg_class
							WHERE relkind = 'r'
						`);

						// Build lookup maps for stats and sizes
						const statsMap = new Map(
							statsResult.rows.map((row) => [row.relname, row.n_live_tup ?? 0]),
						);

						const sizeMap = new Map(
							sizeResult.rows.map((row) => [row.relname, row.size_kb ?? 0]),
						);

						// Step 10: Combine results
						const tables = tablesResult.rows.map((row) => ({
							name: row.table_name,
							rows: statsMap.get(row.table_name) ?? 0,
							sizeKb: sizeMap.get(row.table_name) ?? 0,
						}));

						return successResponse(tables);
					} finally {
						client.release();
					}
				} catch (error) {
					console.error(
						`[TablesAPI] Failed to query tables for sandbox ${id}:`,
						error,
					);

					return errorResponse(
						"internal_server_error",
						"Failed to query database tables",
						500,
					);
				} finally {
					// Clean up the pool
					if (sandboxPool) {
						await sandboxPool.end();
					}
				}
			},
		},
	},
});
