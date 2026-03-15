import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { queryHistory, sandboxes } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import { executeQuery } from "#/lib/query-executor";
import { verifyToken } from "#/lib/session";

const SESSION_COOKIE_NAME = "session";

const querySchema = z.object({
	query: z.string().min(1, "Query is required").max(10000, "Query too long"),
});

export const Route = createFileRoute("/api/sandboxes/$id/query")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { id } = params;

				const token = getCookie(SESSION_COOKIE_NAME);
				if (!token) {
					return errorResponse(
						"AUTHENTICATION_REQUIRED",
						"Authentication required",
						401,
					);
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

				// Fetch sandbox to verify ownership
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

				// Query last 50 history records for this sandbox
				const historyRows = await db
					.select()
					.from(queryHistory)
					.where(eq(queryHistory.sandboxId, id))
					.orderBy(desc(queryHistory.createdAt))
					.limit(50);

				const history = historyRows.map((h) => ({
					id: h.id,
					query: h.query,
					status: h.status,
					executionTimeMs: h.executionTimeMs ?? 0,
					rowsAffected: h.rowsAffected ?? 0,
					errorMessage: h.errorMessage ?? null,
					createdAt: (h.createdAt as Date).toISOString(),
				}));

				return successResponse({ history }, 200);
			},

			POST: async ({ request, params }) => {
				const { id } = params;

				// Step 1: Authenticate
				const token = getCookie(SESSION_COOKIE_NAME);
				if (!token) {
					return errorResponse(
						"AUTHENTICATION_REQUIRED",
						"Authentication required",
						401,
					);
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

				// Step 2: Verify sandbox ownership
				const [sandbox] = await db
					.select()
					.from(sandboxes)
					.where(and(eq(sandboxes.id, id), eq(sandboxes.userId, userId)))
					.limit(1);

				if (!sandbox) {
					return errorResponse("not_found", "Sandbox not found", 404);
				}

				if (sandbox.status !== "active") {
					return errorResponse(
						"sandbox_inactive",
						"Sandbox is not active",
						400,
					);
				}

				// Step 3: Parse and validate query
				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return errorResponse("invalid_json_body", "Invalid JSON body", 400);
				}

				const validationResult = querySchema.safeParse(body);
				if (!validationResult.success) {
					return errorResponse("validation_error", "Invalid query", 400, [
						{
							field: "query",
							message:
								validationResult.error.errors?.[0]?.message ?? "Invalid query",
						},
					]);
				}

				const { query } = validationResult.data;

				// Step 4: Execute query
				const result = await executeQuery(sandbox, query);

				if (result.success) {
					return successResponse({
						rows: result.rows ?? [],
						rowCount: result.rowCount ?? 0,
						executionTimeMs: result.executionTimeMs,
					});
				}

				return errorResponse(
					"query_error",
					result.error ?? "Query failed",
					400,
				);
			},
		},
	},
});
