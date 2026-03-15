import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { desc, eq } from "drizzle-orm";
import { db } from "#/db";
import { aiLogs, sandboxes } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import { verifyToken } from "#/lib/session";

const SESSION_COOKIE_NAME = "session";

export const Route = createFileRoute("/api/sandboxes/$id/ai/logs")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { id } = params;

				// Authenticate
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

				// Verify sandbox ownership
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

				// Query AI logs for this sandbox, sorted by createdAt DESC
				const logs = await db
					.select({
						id: aiLogs.id,
						prompt: aiLogs.prompt,
						response: aiLogs.response,
						sqlGenerated: aiLogs.sqlGenerated,
						executed: aiLogs.executed,
						tokensUsed: aiLogs.tokensUsed,
						createdAt: aiLogs.createdAt,
					})
					.from(aiLogs)
					.where(eq(aiLogs.sandboxId, id))
					.orderBy(desc(aiLogs.createdAt));

				const formatted = logs.map((l) => ({
					id: l.id,
					prompt: l.prompt,
					response: l.response,
					sqlGenerated: l.sqlGenerated ?? null,
					executed: l.executed,
					tokensUsed: l.tokensUsed ?? null,
					createdAt:
						typeof l.createdAt === "string"
							? new Date(l.createdAt).toISOString()
							: (l.createdAt as Date).toISOString(),
				}));

				return successResponse({ logs: formatted }, 200);
			},
		},
	},
});
