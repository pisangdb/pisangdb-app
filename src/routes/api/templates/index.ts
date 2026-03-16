/**
 * Templates API Endpoints for PisangDB
 *
 * GET /api/templates - List all available templates
 *
 * Per PRD §10.5:
 * - Protected by authentication
 * - Returns templates filtered by engine (optional query param)
 * - Includes built-in templates and user-created templates
 *
 * Per PRD §6.6.1:
 * Built-in templates:
 * - Blank (no template)
 * - E-commerce (users, products, categories, orders, order_items)
 * - Blog (users, posts, comments, tags, post_tags)
 * - Inventory (warehouses, products, stock_movements)
 */

import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { templates } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import { verifyToken } from "#/lib/session";

const SESSION_COOKIE_NAME = "session";

// Query parameter validation
const querySchema = z.object({
	engine: z.enum(["postgresql", "mysql", "mariadb"]).optional(),
});

export const Route = createFileRoute("/api/templates/")({
	server: {
		handlers: {
			// ========================================================================
			// GET /api/templates - List all available templates
			// ========================================================================
			GET: async ({ request }) => {
				// Step 1: Authenticate user
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

				// Step 2: Parse query parameters
				const url = new URL(request.url);
				const queryParams = Object.fromEntries(url.searchParams);
				const validationResult = querySchema.safeParse(queryParams);

				if (!validationResult.success) {
					const details = validationResult.error.issues.map((issue) => ({
						field: issue.path.join("."),
						code: "invalid_field",
						message: issue.message,
					}));
					return errorResponse(
						"validation_error",
						"Invalid query parameters",
						400,
						details,
					);
				}

				const { engine } = validationResult.data;

				// Step 3: Query templates
				// Return built-in templates + user's own templates
				try {
					const allTemplates = await db
						.select({
							id: templates.id,
							name: templates.name,
							description: templates.description,
							engine: templates.engine,
							isBuiltin: templates.isBuiltin,
							createdAt: templates.createdAt,
						})
						.from(templates)
						.where(
							engine
								? or(templates.isBuiltin, eq(templates.engine, engine))
								: undefined,
						);

					// Filter by engine if specified
					const filteredTemplates = engine
						? allTemplates.filter((t) => t.engine === engine)
						: allTemplates;

					// Transform response
					const formattedTemplates = filteredTemplates.map((t) => ({
						id: t.id,
						name: t.name,
						description: t.description,
						engine: t.engine,
						is_builtin: t.isBuiltin,
						created_at: t.createdAt.toISOString(),
					}));

					return successResponse({ templates: formattedTemplates });
				} catch (dbError) {
					console.error("[GetTemplates] Database error:", dbError);
					return errorResponse(
						"internal_server_error",
						"Failed to fetch templates",
						500,
					);
				}
			},

			// ========================================================================
			// POST /api/templates - Create a custom template
			// ========================================================================
			POST: async ({ request }) => {
				// Step 1: Authenticate user
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

				// Step 2: Parse request body
				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return errorResponse("invalid_json_body", "Invalid JSON body", 400);
				}

				const schema = z.object({
					name: z
						.string()
						.min(1, "Name is required")
						.max(50, "Name must be 50 characters or less"),
					description: z
						.string()
						.max(255, "Description must be 255 characters or less")
						.optional(),
					engine: z.enum(["postgresql", "mysql", "mariadb"]),
					ddlSql: z.string().min(1, "DDL SQL is required"),
					seedSql: z.string().optional().default(""),
				});

				const parsed = schema.safeParse(body);
				if (!parsed.success) {
					const firstError = parsed.error.issues[0];
					return errorResponse(
						"VALIDATION_ERROR",
						firstError?.message ?? "Invalid request",
						400,
					);
				}

				const { name, description, engine, ddlSql, seedSql } = parsed.data;

				// Step 3: Create template
				try {
					const result = await db
						.insert(templates)
						.values({
							name,
							description,
							engine,
							ddlSql,
							seedSql,
							isBuiltin: false,
							userId,
						})
						.returning({
							id: templates.id,
							name: templates.name,
							description: templates.description,
							engine: templates.engine,
							isBuiltin: templates.isBuiltin,
							createdAt: templates.createdAt,
						});

					const template = result[0];

					return successResponse(
						{
							template: {
								id: template.id,
								name: template.name,
								description: template.description,
								engine: template.engine,
								is_builtin: template.isBuiltin,
								created_at: template.createdAt.toISOString(),
							},
						},
						201,
					);
				} catch (dbError) {
					console.error("[CreateTemplate] Database error:", dbError);
					return errorResponse(
						"internal_server_error",
						"Failed to create template",
						500,
					);
				}
			},
		},
	},
});
