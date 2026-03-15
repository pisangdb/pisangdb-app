/**
 * Sandbox API Endpoints for PisangDB
 *
 * GET /api/sandboxes - List all active sandboxes for authenticated user
 * POST /api/sandboxes - Create a new sandbox
 *
 * Per PRD §10.2 (GET):
 * - Protected by authentication
 * - Returns only user's own sandboxes
 * - Sorted by created_at DESC
 * - No pagination for MVP (max 5 sandboxes per user)
 * - Masks db_password in response
 *
 * Per PRD §6.2.1 (POST):
 * - Create sandbox with engine, region, name, and retention time
 * - MVP: PostgreSQL only, Indonesia region only
 * - Max 5 active sandboxes per user (quota)
 * - Generate unique db_name, db_user, and password
 * - Auto-cleanup based on TTL
 *
 * Per PRD §12.4:
 * - Rate limit: 10 requests / hour / user (POST)
 *
 * Per PRD §12.2:
 * - Dedicated user per sandbox (isolation)
 * - Statement timeout: 30 seconds
 * - Connection limit: 5 per user
 */

import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { sandboxes } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import {
	createSandboxDatabase,
	generateDbUser,
	generatePassword,
	generateUniqueSandboxName,
} from "#/lib/sandbox-manager";
import { encryptPassword, verifyToken } from "#/lib/session";
import {
	addRateLimitHeaders,
	createSandboxRateLimit,
} from "#/middleware/rate-limit";

// ============================================================================
// Constants
// ============================================================================

const SESSION_COOKIE_NAME = "session";

/** Maximum active sandboxes per user (PRD §6.2.1) */
const MAX_ACTIVE_SANDBOXES = 5;

/** Default host for Indonesia region (PRD §8.3) */
const DEFAULT_HOST = "id.pisangdb.com";

/** PostgreSQL default port */
const POSTGRESQL_PORT = 5432;

/** Maximum database size in MB (PRD §6.2.1) */
const DEFAULT_MAX_SIZE_MB = 100;

// ============================================================================
// Input Validation Schema (POST)
// ============================================================================

const createSandboxSchema = z.object({
	// MVP: PostgreSQL only
	engine: z
		.literal("postgresql")
		.refine(
			(val) => val === "postgresql",
			"Only PostgreSQL engine is supported in MVP",
		),
	// MVP: Indonesia region only
	region: z
		.literal("id")
		.refine(
			(val) => val === "id",
			"Only Indonesia (id) region is supported in MVP",
		),
	// Sandbox display name (1-50 characters)
	name: z
		.string()
		.min(1, "Sandbox name is required")
		.max(50, "Sandbox name must be 50 characters or less")
		.regex(
			/^[a-zA-Z0-9_-]+$/,
			"Sandbox name can only contain letters, numbers, underscores, and hyphens",
		),
	// Retention time in hours (1 hour to 7 days = 168 hours)
	retention_hours: z
		.number()
		.int("Retention hours must be an integer")
		.min(1, "Minimum retention is 1 hour")
		.max(168, "Maximum retention is 7 days (168 hours)"),
	// Template ID (null for MVP - no templates)
	template_id: z.null().optional(),
});

// ============================================================================
// Response Types (POST)
// ============================================================================

// ============================================================================
// Route Definition
// ============================================================================

export const Route = createFileRoute("/api/sandboxes/")({
	server: {
		handlers: {
			// ========================================================================
			// GET /api/sandboxes - List all active sandboxes for authenticated user
			// ========================================================================
			GET: async () => {
				const token = getCookie(SESSION_COOKIE_NAME);

				if (!token) {
					return errorResponse(
						"authentication_required",
						"Authentication required. Please log in.",
						401,
					);
				}

				const payload = await verifyToken(token);
				if (!payload) {
					return errorResponse(
						"authentication_required",
						"Invalid or expired session. Please log in again.",
						401,
					);
				}

				const userId = payload.userId;

				const userSandboxes = await db
					.select({
						id: sandboxes.id,
						engine: sandboxes.engine,
						region: sandboxes.region,
						displayName: sandboxes.displayName,
						status: sandboxes.status,
						host: sandboxes.host,
						port: sandboxes.port,
						dbName: sandboxes.dbName,
						dbUser: sandboxes.dbUser,
						createdAt: sandboxes.createdAt,
						expiredAt: sandboxes.expiredAt,
					})
					.from(sandboxes)
					.where(eq(sandboxes.userId, userId))
					.orderBy(desc(sandboxes.createdAt));

				const activeSandboxes = userSandboxes.filter(
					(sb) => sb.status !== "expired",
				);

				const now = new Date();
				const formattedSandboxes = activeSandboxes.map((sb) => {
					const expiredAt = new Date(sb.expiredAt);
					const ttlSeconds = Math.max(
						0,
						Math.floor((expiredAt.getTime() - now.getTime()) / 1000),
					);

					return {
						id: sb.id,
						engine: sb.engine,
						region: sb.region,
						displayName: sb.displayName,
						status: sb.status,
						host: sb.host,
						port: sb.port,
						dbName: sb.dbName,
						dbUser: sb.dbUser,
						dbPassword: "****", // Masked per security requirements
						ttl: ttlSeconds,
						createdAt: sb.createdAt.toISOString(),
						expiredAt: sb.expiredAt.toISOString(),
					};
				});

				return successResponse({ sandboxes: formattedSandboxes });
			},

			// ========================================================================
			// POST /api/sandboxes - Create a new sandbox
			// ========================================================================
			POST: async ({ request }) => {
				// Step 1: Apply rate limiting (10 requests / hour / user)
				const rateLimitResult = await createSandboxRateLimit(request);
				if (!rateLimitResult.success) {
					const resp = errorResponse(
						"rate_limit_exceeded",
						rateLimitResult.message,
						429,
					);
					return addRateLimitHeaders(resp, rateLimitResult.headers);
				}

				// Step 2: Authenticate user
				const token = getCookie(SESSION_COOKIE_NAME);
				if (!token) {
					return errorResponse(
						"authentication_required",
						"Authentication required. Please log in.",
						401,
					);
				}

				const payload = await verifyToken(token);
				if (!payload) {
					return errorResponse(
						"authentication_required",
						"Invalid or expired session. Please log in again.",
						401,
					);
				}

				const userId = payload.userId;

				// Step 3: Parse and validate request body
				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return errorResponse("invalid_json_body", "Invalid JSON body", 400);
				}

				const validationResult = createSandboxSchema.safeParse(body);
				if (!validationResult.success) {
					const details = validationResult.error.issues.map((issue) => ({
						field: issue.path.join("."),
						code: "invalid_field",
						message: issue.message,
					}));
					return errorResponse(
						"validation_error",
						"Request validation failed",
						400,
						details,
					);
				}

				const { name, retention_hours } = validationResult.data;

				// Step 4: Check quota (max 5 active sandboxes per user)
				try {
					const [activeCountResult] = await db
						.select({ count: count() })
						.from(sandboxes)
						.where(
							and(eq(sandboxes.userId, userId), eq(sandboxes.status, "active")),
						);

					const activeCount = activeCountResult?.count ?? 0;

					if (activeCount >= MAX_ACTIVE_SANDBOXES) {
						return errorResponse(
							"quota_exceeded",
							`Quota exceeded. You have ${activeCount} active sandboxes. Maximum allowed is ${MAX_ACTIVE_SANDBOXES}.`,
							403,
						);
					}
				} catch (dbError) {
					console.error(
						"[CreateSandbox] Database error checking quota:",
						dbError,
					);
					return errorResponse(
						"internal_server_error",
						"Internal server error",
						500,
					);
				}

				// Step 5: Generate sandbox credentials
				let dbName: string;
				let dbUser: string;
				let password: string;

				try {
					dbName = await generateUniqueSandboxName(userId, name);
					dbUser = generateDbUser();
					password = generatePassword();
				} catch (genError) {
					console.error(
						"[CreateSandbox] Failed to generate credentials:",
						genError,
					);
					return errorResponse(
						"credentials_generation_failed",
						"Failed to generate sandbox credentials",
						500,
					);
				}

				// Step 6: Create database and user in PostgreSQL
				try {
					await createSandboxDatabase(dbName, dbUser, password);
				} catch (dbError) {
					console.error("[CreateSandbox] Failed to create database:", dbError);
					return errorResponse(
						"provisioning_failed",
						"Failed to provision database. Please try again.",
						500,
					);
				}

				// Step 7: Encrypt password before storing
				const encryptedPassword = encryptPassword(password);

				// Step 8: Calculate expiration time
				const now = new Date();
				const expiredAt = new Date(
					now.getTime() + retention_hours * 60 * 60 * 1000,
				);

				// Step 9: Build connection URL
				// Format: postgresql://user:pass@host:port/dbname
				const connectionUrl = `postgresql://${dbUser}:${encodeURIComponent(password)}@${DEFAULT_HOST}:${POSTGRESQL_PORT}/${dbName}`;

				// Step 10: Create sandbox record in database
				let newSandbox: (typeof sandboxes.$inferSelect)[];
				try {
					newSandbox = await db
						.insert(sandboxes)
						.values({
							userId,
							engine: "postgresql",
							region: "id",
							dbName,
							dbUser,
							dbPassword: encryptedPassword,
							connectionUrl,
							host: DEFAULT_HOST,
							port: POSTGRESQL_PORT,
							displayName: name,
							status: "active",
							templateId: null,
							maxSizeMb: DEFAULT_MAX_SIZE_MB,
							expiredAt,
						})
						.returning();
				} catch (insertError) {
					console.error(
						"[CreateSandbox] Failed to create sandbox record:",
						insertError,
					);
					// Attempt cleanup
					try {
						const { dropSandboxDatabase } = await import(
							"#/lib/sandbox-manager"
						);
						await dropSandboxDatabase(dbName, dbUser);
					} catch (cleanupError) {
						console.error("[CreateSandbox] Cleanup failed:", cleanupError);
					}
					return errorResponse(
						"sandbox_creation_failed",
						"Failed to create sandbox record",
						500,
					);
				}

				const sandbox = newSandbox[0];
				if (!sandbox) {
					return errorResponse(
						"sandbox_creation_failed",
						"Failed to create sandbox",
						500,
					);
				}

				// Step 11: Build success response
				const sandboxPayload = {
					id: sandbox.id,
					display_name: sandbox.displayName,
					engine: sandbox.engine,
					region: sandbox.region,
					db_name: sandbox.dbName,
					host: sandbox.host,
					port: sandbox.port,
					db_user: sandbox.dbUser,
					db_password: password, // Return plain password for user to copy
					connection_url: connectionUrl,
					status: sandbox.status,
					created_at: sandbox.createdAt.toISOString(),
					expired_at: sandbox.expiredAt.toISOString(),
					max_size_mb: sandbox.maxSizeMb,
				};

				const responseData = {
					sandbox: sandboxPayload,
				};

				console.log(
					`[CreateSandbox] Created sandbox: ${dbName} for user ${userId}`,
				);

				return successResponse(responseData, 201);
			},
		},
	},
});
