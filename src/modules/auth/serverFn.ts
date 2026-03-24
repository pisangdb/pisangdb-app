import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "#/db";
import {
	accounts,
	aiLogs,
	sandboxes,
	sessions,
	userPreferences,
	users,
} from "#/db/schema";
import { auth } from "#/lib/auth";
import type { AuthUser, UserRole } from "#/lib/types";
import {
	changePasswordSchema,
	deleteAccountSchema,
	loginSchema,
	registerSchema,
	revokeSessionSchema,
	updatePreferencesSchema,
	updateProfileSchema,
} from "./schema";

export const $register = createServerFn({ method: "POST" })
	.inputValidator(registerSchema)
	.handler(async ({ data }): Promise<AuthUser> => {
		return {
			id: "",
			email: data.email,
			name: data.name,
			role: "user",
			image: null,
		};
	});

export const $login = createServerFn({ method: "POST" })
	.inputValidator(loginSchema)
	.handler(async ({ data }): Promise<AuthUser> => {
		return {
			id: "",
			email: data.email,
			name: "",
			role: "user",
			image: null,
		};
	});

export const $logout = createServerFn({ method: "POST" }).handler(
	async (): Promise<void> => {},
);

export const $getMe = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthUser | null> => {
		const request = getRequest();
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) return null;

		const user = session.user as typeof session.user & { role?: string };

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			role: (user.role ?? "user") as UserRole,
			image: user.image ?? null,
		};
	},
);

// ─── User Settings ────────────────────────────────────────────────────────────

export type UserSettings = {
	user: AuthUser;
	accounts: Array<{
		id: string;
		providerId: string;
		accountId: string;
	}>;
	preferences: {
		sandboxExpiryWarning: boolean;
		productUpdates: boolean;
	} | null;
};

export type SessionInfo = {
	id: string;
	token: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
	expiresAt: Date;
	isCurrent: boolean;
};

export type WorkspaceStats = {
	activeSandboxes: number;
	maxSandboxes: number;
	aiRequestsToday: number;
	maxAiRequestsPerDay: number;
	maxSizePerSandboxMb: number;
};

async function getCurrentSession() {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return { request, session, userId: session.user.id };
}

export const $getUserSettings = createServerFn({ method: "GET" }).handler(
	async (): Promise<UserSettings> => {
		const { session, userId } = await getCurrentSession();

		// Get user's connected accounts
		const userAccounts = await db
			.select({
				id: accounts.id,
				providerId: accounts.providerId,
				accountId: accounts.accountId,
			})
			.from(accounts)
			.where(eq(accounts.userId, userId));

		// Get user preferences
		const [prefs] = await db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, userId));

		const user = session.user as typeof session.user & { role?: string };

		return {
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: (user.role ?? "user") as UserRole,
				image: user.image ?? null,
			},
			accounts: userAccounts,
			preferences: prefs
				? {
						sandboxExpiryWarning: prefs.sandboxExpiryWarning,
						productUpdates: prefs.productUpdates,
					}
				: null,
		};
	},
);

export const $updateProfile = createServerFn({ method: "POST" })
	.inputValidator(updateProfileSchema)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { userId } = await getCurrentSession();

		await db
			.update(users)
			.set({ name: data.name, updatedAt: new Date() })
			.where(eq(users.id, userId));

		return { success: true };
	});

export const $changePassword = createServerFn({ method: "POST" })
	.inputValidator(changePasswordSchema)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { request, userId } = await getCurrentSession();

		// Check if user has credential account
		const [credentialAccount] = await db
			.select()
			.from(accounts)
			.where(
				and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")),
			);

		if (!credentialAccount) {
			throw new Error(
				"Password change is only available for email/password accounts",
			);
		}

		// Use better-auth API to change password
		await auth.api.changePassword({
			body: {
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
				revokeOtherSessions: true,
			},
			headers: request.headers,
		});

		return { success: true };
	});

export const $listSessions = createServerFn({ method: "GET" }).handler(
	async (): Promise<SessionInfo[]> => {
		const { request, userId } = await getCurrentSession();

		// Get current session token
		const currentSession = await auth.api.getSession({
			headers: request.headers,
		});
		const currentToken = currentSession?.session?.token;

		// Get all sessions for user
		const userSessions = await db
			.select()
			.from(sessions)
			.where(eq(sessions.userId, userId))
			.orderBy(sessions.createdAt);

		return userSessions.map((s) => ({
			id: s.id,
			token: s.token,
			ipAddress: s.ipAddress,
			userAgent: s.userAgent,
			createdAt: s.createdAt,
			expiresAt: s.expiresAt,
			isCurrent: s.token === currentToken,
		}));
	},
);

export const $revokeSession = createServerFn({ method: "POST" })
	.inputValidator(revokeSessionSchema)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { userId } = await getCurrentSession();

		// Verify the session belongs to the current user
		const [targetSession] = await db
			.select()
			.from(sessions)
			.where(eq(sessions.token, data.token));

		if (!targetSession || targetSession.userId !== userId) {
			throw new Error("Session not found");
		}

		// Delete the session
		await db.delete(sessions).where(eq(sessions.token, data.token));

		return { success: true };
	});

export const $revokeAllSessions = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ success: boolean }> => {
		const { request, userId } = await getCurrentSession();

		// Get current session token to preserve it
		const currentSession = await auth.api.getSession({
			headers: request.headers,
		});
		const currentToken = currentSession?.session?.token;

		if (!currentToken) {
			throw new Error("No current session found");
		}

		// Delete all sessions except current
		await db
			.delete(sessions)
			.where(
				and(eq(sessions.userId, userId), ne(sessions.token, currentToken)),
			);

		return { success: true };
	},
);

export const $deleteAccount = createServerFn({ method: "POST" })
	.inputValidator(deleteAccountSchema)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { request, userId } = await getCurrentSession();
		const currentSession = await auth.api.getSession({
			headers: request.headers,
		});
		const userEmail = currentSession?.user?.email;

		// Verify email confirmation
		if (data.confirmationEmail !== userEmail) {
			throw new Error("Email confirmation does not match");
		}

		// Get all user's sandboxes that need cleanup
		const userSandboxes = await db
			.select()
			.from(sandboxes)
			.where(eq(sandboxes.userId, userId));

		// Cleanup each sandbox (drop database and user)
		for (const sandbox of userSandboxes) {
			if (sandbox.status === "active") {
				try {
					const { getAdminPool } = await import("#/lib/sandbox-provisioning");
					const {
						deprovisionPostgreSQL,
						deprovisionMySQL,
						deprovisionMariaDB,
					} = await import("#/lib/sandbox-provisioning");

					const engine = sandbox.engine as "postgresql" | "mysql" | "mariadb";
					const region = sandbox.region;
					const adminPool = getAdminPool(engine, region);

					if (engine === "postgresql") {
						await deprovisionPostgreSQL(
							adminPool,
							sandbox.dbName,
							sandbox.dbUser,
							region,
						);
					} else if (engine === "mysql") {
						await deprovisionMySQL(
							adminPool as import("mysql2/promise").Pool,
							sandbox.dbName,
							sandbox.dbUser,
						);
					} else if (engine === "mariadb") {
						await deprovisionMariaDB(
							adminPool as import("mysql2/promise").Pool,
							sandbox.dbName,
							sandbox.dbUser,
						);
					}
				} catch (error) {
					console.error(`Failed to cleanup sandbox ${sandbox.id}:`, error);
					// Continue with deletion even if cleanup fails
				}
			}
		}

		// Delete user (cascade will handle sessions, accounts, sandboxes, etc.)
		await db.delete(users).where(eq(users.id, userId));

		return { success: true };
	});

export const $getUserPreferences = createServerFn({ method: "GET" }).handler(
	async (): Promise<UserSettings["preferences"]> => {
		const { userId } = await getCurrentSession();

		const [prefs] = await db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, userId));

		if (!prefs) {
			// Return defaults if no preferences exist
			return {
				sandboxExpiryWarning: true,
				productUpdates: false,
			};
		}

		return {
			sandboxExpiryWarning: prefs.sandboxExpiryWarning,
			productUpdates: prefs.productUpdates,
		};
	},
);

export const $updateUserPreferences = createServerFn({ method: "POST" })
	.inputValidator(updatePreferencesSchema)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { userId } = await getCurrentSession();

		// Upsert preferences
		const existing = await db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, userId));

		if (existing.length > 0) {
			await db
				.update(userPreferences)
				.set({
					sandboxExpiryWarning: data.sandboxExpiryWarning,
					productUpdates: data.productUpdates,
					updatedAt: new Date(),
				})
				.where(eq(userPreferences.userId, userId));
		} else {
			await db.insert(userPreferences).values({
				id: crypto.randomUUID(),
				userId,
				sandboxExpiryWarning: data.sandboxExpiryWarning,
				productUpdates: data.productUpdates,
			});
		}

		return { success: true };
	});

export const $getWorkspaceStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<WorkspaceStats> => {
		const { userId } = await getCurrentSession();

		// Get active sandbox count
		const [activeResult] = await db
			.select({ count: count() })
			.from(sandboxes)
			.where(and(eq(sandboxes.userId, userId), eq(sandboxes.status, "active")));

		// Get AI requests today
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const [aiResult] = await db
			.select({ count: count() })
			.from(aiLogs)
			.where(eq(aiLogs.userId, userId));

		// TODO: Filter by created_at >= today when needed

		return {
			activeSandboxes: activeResult?.count ?? 0,
			maxSandboxes: 5,
			aiRequestsToday: aiResult?.count ?? 0,
			maxAiRequestsPerDay: 30,
			maxSizePerSandboxMb: 100,
		};
	},
);
