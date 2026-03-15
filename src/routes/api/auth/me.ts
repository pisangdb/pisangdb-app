/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's profile.
 * Per PRD §10.1:
 * - Protected by requireAuth middleware
 * - Returns user object without password_hash
 * - Includes sandbox count
 */

import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { count, eq } from "drizzle-orm";
import { db } from "#/db";
import { sandboxes, users } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import { verifyToken } from "#/lib/session";

const SESSION_COOKIE_NAME = "session";

export const Route = createFileRoute("/api/auth/me")({
	server: {
		handlers: {
			GET: async () => {
				const token = getCookie(SESSION_COOKIE_NAME);

				if (!token) {
					return errorResponse(
						"authentication_required",
						"Authentication required",
						401,
					);
				}

				const payload = await verifyToken(token);
				if (!payload) {
					return errorResponse(
						"invalid_session",
						"Invalid or expired session",
						401,
					);
				}

				const userId = payload.userId;

				const [user] = await db
					.select({
						id: users.id,
						email: users.email,
						name: users.name,
						role: users.role,
						createdAt: users.createdAt,
					})
					.from(users)
					.where(eq(users.id, userId))
					.limit(1);

				if (!user) {
					return errorResponse("not_found", "User not found", 404);
				}

				const [sandboxResult] = await db
					.select({ count: count() })
					.from(sandboxes)
					.where(eq(sandboxes.userId, userId));

				const sandboxCount = sandboxResult?.count ?? 0;

				return successResponse({
					user: {
						id: user.id,
						email: user.email,
						name: user.name,
						role: user.role,
						createdAt: user.createdAt.toISOString(),
					},
					sandboxCount,
				});
			},
		},
	},
});
