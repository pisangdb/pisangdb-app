import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { notifications } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import { verifyToken } from "#/lib/session";

const SESSION_COOKIE_NAME = "session";

export const Route = createFileRoute("/api/notifications/")({
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
						"INVALID_SESSION",
						"Invalid or expired session",
						401,
					);
				}

				const userId = payload.userId;

				const userNotifications = await db
					.select({
						id: notifications.id,
						sandboxId: notifications.sandboxId,
						type: notifications.type,
						message: notifications.message,
						readAt: notifications.readAt,
						createdAt: notifications.createdAt,
					})
					.from(notifications)
					.where(eq(notifications.userId, userId))
					.orderBy(notifications.createdAt)
					.limit(20);

				return successResponse({ notifications: userNotifications }, 200);
			},
		},
	},
});
