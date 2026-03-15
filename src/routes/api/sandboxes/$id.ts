/**
 * GET /api/sandboxes/:id
 * DELETE /api/sandboxes/:id
 * PATCH /api/sandboxes/:id/extend
 *
 * GET: Returns detailed information about a specific sandbox.
 * Per PRD §10.2:
 * - Protected by authentication
 * - Returns full credentials (owner can see password)
 * - Includes database size in MB
 * - Includes remaining TTL
 *
 * DELETE: Deletes a sandbox and its database.
 * Per PRD §6.2.5:
 * - Protected by authentication
 * - Only owner can delete
 * - Status transitions: active → destroying → expired
 * - Terminates all connections
 * - Drops database and user
 * - Returns 204 No Content on success
 *
 * PATCH (extend): Extends sandbox TTL.
 * Per PRD §6.2.4:
 * - Extension options: +1h, +6h, +12h, +24h
 * - Max total lifetime: 7 days from creation
 * - Only owner can extend
 * - Only active sandboxes can be extended
 */

import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, getSandboxAdminPool } from "#/db";
import { sandboxes } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import {
	dropSandboxDatabase,
	terminateConnections,
} from "#/lib/sandbox-manager";
import { verifyToken } from "#/lib/session";

const SESSION_COOKIE_NAME = "session";

export const Route = createFileRoute("/api/sandboxes/$id")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { id } = params;

				const token = getCookie(SESSION_COOKIE_NAME);

				if (!token) {
					return errorResponse("authentication_required", "Authentication required", 401);
				}

				const payload = await verifyToken(token);
				if (!payload) {
					return errorResponse(
						"INVALID_SESSION",
						"Invalid or expired session",
						401,
					);
				}

				const userId = payload.userId;

				const [sandbox] = await db
					.select()
					.from(sandboxes)
					.where(eq(sandboxes.id, id))
					.limit(1);

				if (!sandbox) {
					return errorResponse("sandbox_not_found", "Sandbox not found", 404);
				}

				if (sandbox.userId !== userId) {
					return errorResponse("access_denied", "Access denied", 403);
				}

				if (sandbox.status === "expired" || sandbox.status === "destroying") {
					return errorResponse("sandbox_expired", "Sandbox has expired", 410);
				}

				const now = new Date();
				const expiredAt = new Date(sandbox.expiredAt);
				const ttlSeconds = Math.max(
					0,
					Math.floor((expiredAt.getTime() - now.getTime()) / 1000),
				);

				let sizeMb = 0;
				try {
					const pool = getSandboxAdminPool();
					const sizeResult = await pool.query(
						"SELECT pg_database_size($1) as size",
						[sandbox.dbName],
					);
					const sizeBytes = sizeResult.rows[0]?.size ?? 0;
					sizeMb = Math.round(sizeBytes / (1024 * 1024));
				} catch (error) {
					console.error(
						`[SandboxAPI] Failed to get database size for ${sandbox.dbName}:`,
						error,
					);
				}

				// Per PRD §6.2.1 - Connection String Formats
				let connectionString: string;
				const { host, port, dbName, dbUser, dbPassword } = sandbox;

				if (sandbox.engine === "postgresql") {
					connectionString = `postgresql://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;
				} else if (sandbox.engine === "mysql" || sandbox.engine === "mariadb") {
					connectionString = `mysql://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;
				} else {
					connectionString = `${sandbox.engine}://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;
				}

				return successResponse(
					{
						sandbox: {
							id: sandbox.id,
							engine: sandbox.engine,
							region: sandbox.region,
							displayName: sandbox.displayName,
							dbName: sandbox.dbName,
							dbUser: sandbox.dbUser,
							dbPassword: sandbox.dbPassword,
							connectionString,
							host: sandbox.host,
							port: sandbox.port,
							status: sandbox.status,
							ttl: ttlSeconds,
							sizeMb,
							maxSizeMb: sandbox.maxSizeMb,
							createdAt: sandbox.createdAt.toISOString(),
							expiredAt: sandbox.expiredAt.toISOString(),
						},
					},
					200,
				);
			},

			// PATCH /api/sandboxes/:id/extend - Extend sandbox TTL
			PATCH: async ({ request, params }) => {
				const { id } = params;

				// Step 1: Authenticate user
				const token = getCookie(SESSION_COOKIE_NAME);

				if (!token) {
					return errorResponse("authentication_required", "Authentication required", 401);
				}

				const payload = await verifyToken(token);
				if (!payload) {
					return errorResponse(
						"INVALID_SESSION",
						"Invalid or expired session",
						401,
					);
				}

				const userId = payload.userId;

				// Step 2: Parse and validate request body
				const extendSchema = z.object({
					extendHours: z.union([
						z.literal(1),
						z.literal(6),
						z.literal(12),
						z.literal(24),
					]),
				});

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return errorResponse("invalid_json_body", "Invalid JSON body", 400);
				}

				const validationResult = extendSchema.safeParse(body);
				if (!validationResult.success) {
					return errorResponse(
						"INVALID_REQUEST",
						validationResult.error.issues[0]?.message ??
							"Invalid extendHours. Must be 1, 6, 12, or 24",
						400,
					);
				}

				const { extendHours } = validationResult.data;

				// Step 3: Fetch sandbox
				const [sandbox] = await db
					.select()
					.from(sandboxes)
					.where(eq(sandboxes.id, id))
					.limit(1);

				// Step 4: Return 404 if not found
				if (!sandbox) {
					return errorResponse("sandbox_not_found", "Sandbox not found", 404);
				}

				// Step 5: Verify ownership
				if (sandbox.userId !== userId) {
					return errorResponse("access_denied", "Access denied", 403);
				}

				// Step 6: Verify sandbox is still active
				if (sandbox.status !== "active") {
					return errorResponse(
						"CANNOT_EXTEND_SANDBOX",
						"Cannot extend an expired or destroying sandbox",
						400,
					);
				}

				// Step 7: Calculate new expiration time
				// Max lifetime: 7 days from creation (per PRD §6.2.4)
				const MAX_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
				const extensionMs = extendHours * 60 * 60 * 1000;
				const newExpiredAt = new Date(
					sandbox.expiredAt.getTime() + extensionMs,
				);
				const maxAllowedExpiredAt = new Date(
					sandbox.createdAt.getTime() + MAX_LIFETIME_MS,
				);

				// Step 8: Enforce max lifetime
				if (newExpiredAt > maxAllowedExpiredAt) {
					return errorResponse(
						"EXTEND_BEYOND_MAX_LIFETIME",
						`Cannot extend beyond maximum lifetime of 7 days from creation. Maximum allowed expiration: ${maxAllowedExpiredAt.toISOString()}`,
						400,
					);
				}

				// Step 9: Update sandbox expiration
				const [updatedSandbox] = await db
					.update(sandboxes)
					.set({
						expiredAt: newExpiredAt,
						updatedAt: new Date(),
					})
					.where(eq(sandboxes.id, id))
					.returning();

				if (!updatedSandbox) {
					return errorResponse(
						"FAILED_UPDATE_SANDBOX",
						"Failed to update sandbox",
						500,
					);
				}

				// Step 10: Calculate new TTL
				const now = new Date();
				const ttlSeconds = Math.max(
					0,
					Math.floor(
						(updatedSandbox.expiredAt.getTime() - now.getTime()) / 1000,
					),
				);

				// Step 11: Return success response
				return successResponse(
					{
						sandbox: {
							id: updatedSandbox.id,
							displayName: updatedSandbox.displayName,
							expiredAt: updatedSandbox.expiredAt.toISOString(),
							ttl: ttlSeconds,
						},
					},
					200,
				);
			},

			DELETE: async ({ params }) => {
				const { id } = params;

				// Step 1: Authenticate user
				const token = getCookie(SESSION_COOKIE_NAME);

				if (!token) {
					return errorResponse("authentication_required", "Authentication required", 401);
				}

				const payload = await verifyToken(token);
				if (!payload) {
					return errorResponse(
						"INVALID_SESSION",
						"Invalid or expired session",
						401,
					);
				}

				const userId = payload.userId;

				// Step 2: Query sandbox by ID
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

				// Step 5: Check if sandbox is already expired/destroying
				if (sandbox.status === "expired" || sandbox.status === "destroying") {
					return errorResponse(
						"SANDBOX_DELETED",
						"Sandbox has already been deleted",
						410,
					);
				}

				// Step 6: Set status to "destroying" (prevents concurrent operations)
				await db
					.update(sandboxes)
					.set({ status: "destroying", updatedAt: new Date() })
					.where(eq(sandboxes.id, id));

				// Step 7: Clean up database resources
				// Per PRD §6.2.5 and §12.2
				try {
					// Terminate all active connections to the database
					await terminateConnections(sandbox.dbName);

					// Drop the database and user
					await dropSandboxDatabase(sandbox.dbName, sandbox.dbUser);
				} catch (error) {
					// Log error but continue - database might already be sandbox_expired
					// This handles edge cases where the database was manually deleted
					// or the cleanup worker already processed it
					console.error(
						`[SandboxAPI] Error during cleanup for sandbox ${id}:`,
						error,
					);
				}

				// Step 8: Set status to "expired"
				await db
					.update(sandboxes)
					.set({ status: "expired", updatedAt: new Date() })
					.where(eq(sandboxes.id, id));

				// Step 9: Return 204 No Content on success
				return new Response(null, { status: 204 });
			},
		},
	},
});
