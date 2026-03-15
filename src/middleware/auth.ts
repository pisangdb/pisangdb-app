/**
 * Authentication Middleware for PisangDB
 *
 * Per PRD §6.1.2:
 * - JWT stored in HTTP-only cookies (not headers)
 * - Session management with 7-day expiry
 * - Role-based access control (user | admin)
 *
 * Three middleware variants:
 * - requireAuth: Protected routes, throws 401 if not authenticated
 * - optionalAuth: Attaches user if present, doesn't reject
 * - requireAdmin: Requires admin role, throws 403 if not admin
 */

import { createMiddleware } from "@tanstack/react-start";
import { getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { type UserRole, users } from "#/db/schema";
import { createLogger } from "#/lib/logger";
import { verifyToken } from "#/lib/session";

const log = createLogger("Auth");

const SESSION_COOKIE_NAME = "session";

export interface AuthContext {
	userId: string;
}

export interface AdminContext extends AuthContext {
	userRole: UserRole;
}

class AuthError extends Error {
	constructor(
		public code: "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_TOKEN",
		message: string,
		public statusCode: number,
	) {
		super(message);
		this.name = "AuthError";
	}
}

async function getUserIdFromSession(): Promise<string | null> {
	const token = getCookie(SESSION_COOKIE_NAME);
	if (!token) {
		return null;
	}
	const payload = await verifyToken(token);
	return payload?.userId ?? null;
}

export const requireAuth = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const userId = await getUserIdFromSession();

		if (!userId) {
			log.warn("Authentication failed: No valid session");
			setResponseStatus(401);
			throw new AuthError(
				"UNAUTHORIZED",
				"Authentication required. Please log in.",
				401,
			);
		}

		log.info("User authenticated", { userId });

		return next({
			context: {
				userId,
			},
		});
	},
);

export const optionalAuth = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const userId = await getUserIdFromSession();
		return next({
			context: {
				userId: userId ?? undefined,
			},
		});
	},
);

export const requireAdmin = createMiddleware({ type: "function" })
	.middleware([requireAuth])
	.server(async ({ context, next }) => {
		const [user] = await db
			.select({ role: users.role })
			.from(users)
			.where(eq(users.id, context.userId))
			.limit(1);

		if (!user) {
			log.warn("Admin check failed: User not found");
			setResponseStatus(401);
			throw new AuthError("UNAUTHORIZED", "User not found.", 401);
		}

		if (user.role !== "admin") {
			log.warn("Admin access denied for user", { userId: context.userId });
			setResponseStatus(403);
			throw new AuthError("FORBIDDEN", "Admin access required.", 403);
		}

		return next({
			context: {
				userId: context.userId,
				userRole: user.role,
			},
		});
	});

export type RequireAuthContext = typeof requireAuth extends {
	server: (args: { context: infer C }) => unknown;
}
	? C
	: never;

export type OptionalAuthContext = typeof optionalAuth extends {
	server: (args: { context: infer C }) => unknown;
}
	? C
	: never;

export type RequireAdminContext = typeof requireAdmin extends {
	server: (args: { context: infer C }) => unknown;
}
	? C
	: never;
