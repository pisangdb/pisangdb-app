import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, eq, gte, inArray, lt, ne } from "drizzle-orm";
import {
	type AuthUser,
	DEFAULT_TIER,
	MAX_SANDBOX_SIZE_MB,
	TIER_LIMITS,
	type UserRole,
} from "#/lib/types";
import {
	changePasswordSchema,
	deleteAccountSchema,
	loginSchema,
	registerSchema,
	revokeSessionSchema,
	updatePreferencesSchema,
	updateProfileSchema,
} from "./schema";

async function getAuthServerContext() {
	const [{ db }, schema, { auth }] = await Promise.all([
		import("#/db"),
		import("#/db/schema"),
		import("#/lib/auth"),
	]);

	return {
		auth,
		db,
		accounts: schema.accounts,
		aiLogs: schema.aiLogs,
		sandboxes: schema.sandboxes,
		sessions: schema.sessions,
		userPreferences: schema.userPreferences,
		users: schema.users,
	};
}

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

type SessionWithOptionalRole = {
	id: string;
	email: string;
	name: string;
	image?: string | null;
	role?: string;
};

export const $getMe = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthUser | null> => {
		const { auth } = await getAuthServerContext();
		const request = getRequest();
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) return null;

		return mapSessionUserToAuthUser(session.user as SessionWithOptionalRole);
	},
);

export type UserSettings = {
	user: AuthUser & {
		createdAt: string | null;
	};
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
	totalCreated: number;
	aiRequestsToday: number;
	maxAiRequestsPerDay: number;
	maxSizePerSandboxMb: number;
};

const AI_DAILY_LIMIT = 30;

function getTodayUtcRange() {
	const now = new Date();
	const start = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);
	const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

	return { end, start };
}

function mapSessionUserToAuthUser(user: SessionWithOptionalRole): AuthUser {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		role: (user.role ?? "user") as UserRole,
		image: user.image ?? null,
	};
}

function mapPreferences(
	prefs:
		| {
				sandboxExpiryWarning: boolean;
				productUpdates: boolean;
		  }
		| undefined,
): UserSettings["preferences"] {
	if (!prefs) {
		return null;
	}

	return {
		sandboxExpiryWarning: prefs.sandboxExpiryWarning,
		productUpdates: prefs.productUpdates,
	};
}

function getDefaultPreferences(): NonNullable<UserSettings["preferences"]> {
	return {
		sandboxExpiryWarning: true,
		productUpdates: false,
	};
}

async function getCurrentSession() {
	const { auth } = await getAuthServerContext();
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return { request, session, userId: session.user.id };
}

async function getCurrentSessionToken(headers: Headers) {
	const { auth } = await getAuthServerContext();
	const currentSession = await auth.api.getSession({ headers });
	return currentSession?.session?.token ?? null;
}

export const $getUserSettings = createServerFn({ method: "GET" }).handler(
	async (): Promise<UserSettings> => {
		const { accounts, db, userPreferences, users } =
			await getAuthServerContext();
		const { userId } = await getCurrentSession();

		const userAccounts = await db
			.select({
				id: accounts.id,
				providerId: accounts.providerId,
				accountId: accounts.accountId,
			})
			.from(accounts)
			.where(eq(accounts.userId, userId));

		let prefs:
			| {
					sandboxExpiryWarning: boolean;
					productUpdates: boolean;
			  }
			| undefined;
		try {
			[prefs] = await db
				.select()
				.from(userPreferences)
				.where(eq(userPreferences.userId, userId));
		} catch (error) {
			console.warn(
				"[auth] Failed to load user_preferences in $getUserSettings, using defaults",
				error,
			);
		}

		const [userRecord] = await db
			.select({
				createdAt: users.createdAt,
				email: users.email,
				id: users.id,
				image: users.image,
				name: users.name,
				role: users.role,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!userRecord) {
			throw new Error("User not found");
		}

		return {
			user: {
				email: userRecord.email,
				id: userRecord.id,
				image: userRecord.image ?? null,
				name: userRecord.name,
				role: userRecord.role as UserRole,
				createdAt: userRecord.createdAt?.toISOString() ?? null,
			},
			accounts: userAccounts,
			preferences: mapPreferences(prefs) ?? getDefaultPreferences(),
		};
	},
);

export const $updateProfile = createServerFn({ method: "POST" })
	.inputValidator(updateProfileSchema)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { db, users } = await getAuthServerContext();
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
		const { accounts, auth, db } = await getAuthServerContext();
		const { request, userId } = await getCurrentSession();

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
		const { db, sessions } = await getAuthServerContext();
		const { request, userId } = await getCurrentSession();
		const currentToken = await getCurrentSessionToken(request.headers);

		const userSessions = await db
			.select()
			.from(sessions)
			.where(eq(sessions.userId, userId))
			.orderBy(sessions.createdAt);

		return userSessions.map((session) => ({
			id: session.id,
			token: session.token,
			ipAddress: session.ipAddress,
			userAgent: session.userAgent,
			createdAt: session.createdAt,
			expiresAt: session.expiresAt,
			isCurrent: session.token === currentToken,
		}));
	},
);

export const $revokeSession = createServerFn({ method: "POST" })
	.inputValidator(revokeSessionSchema)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { db, sessions } = await getAuthServerContext();
		const { userId } = await getCurrentSession();

		const [targetSession] = await db
			.select()
			.from(sessions)
			.where(eq(sessions.token, data.token));

		if (!targetSession || targetSession.userId !== userId) {
			throw new Error("Session not found");
		}

		await db.delete(sessions).where(eq(sessions.token, data.token));

		return { success: true };
	});

export const $revokeAllSessions = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ success: boolean }> => {
		const { db, sessions } = await getAuthServerContext();
		const { request, userId } = await getCurrentSession();
		const currentToken = await getCurrentSessionToken(request.headers);

		if (!currentToken) {
			throw new Error("No current session found");
		}

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
		const [{ db }, schema] = await Promise.all([
			import("#/db"),
			import("#/db/schema"),
		]);
		const { auth, sandboxes, users } = await getAuthServerContext();
		const { queryHistory, aiLogs, templates } = schema;
		const { request, userId } = await getCurrentSession();
		const currentSession = await auth.api.getSession({
			headers: request.headers,
		});
		const userEmail = currentSession?.user?.email;

		if (data.confirmationEmail !== userEmail) {
			throw new Error("Email confirmation does not match");
		}

		const userSandboxes = await db
			.select()
			.from(sandboxes)
			.where(eq(sandboxes.userId, userId));

		for (const sandbox of userSandboxes) {
			if (sandbox.status === "active") {
				try {
					const {
						deprovisionMariaDB,
						deprovisionMySQL,
						deprovisionPostgreSQL,
						getAdminPool,
					} = await import("#/lib/sandbox-provisioning");

					const engine = sandbox.engine as "postgresql" | "mysql" | "mariadb";
					const adminPool = getAdminPool(engine, sandbox.region);

					if (engine === "postgresql") {
						await deprovisionPostgreSQL(
							adminPool,
							sandbox.dbName,
							sandbox.dbUser,
							sandbox.region,
						);
					} else if (engine === "mysql") {
						await deprovisionMySQL(
							adminPool as import("mysql2/promise").Pool,
							sandbox.dbName,
							sandbox.dbUser,
						);
					} else {
						await deprovisionMariaDB(
							adminPool as import("mysql2/promise").Pool,
							sandbox.dbName,
							sandbox.dbUser,
						);
					}
				} catch (error) {
					console.error(`Failed to cleanup sandbox ${sandbox.id}:`, error);
				}
			}
		}

		// Manual cleanup of related records (defensive, in case migration not yet applied)
		// Delete in correct order respecting FK dependencies
		const userSandboxIds = userSandboxes.map((s) => s.id);

		// Delete query_history (depends on sandboxes)
		if (userSandboxIds.length > 0) {
			await db
				.delete(queryHistory)
				.where(inArray(queryHistory.sandboxId, userSandboxIds));
		}

		// Delete ai_logs (depends on sandboxes and users)
		// Delete by sandbox IDs first
		if (userSandboxIds.length > 0) {
			await db.delete(aiLogs).where(inArray(aiLogs.sandboxId, userSandboxIds));
		}
		// Then by user ID (handles any remaining ai_logs not linked to sandboxes)
		await db.delete(aiLogs).where(eq(aiLogs.userId, userId));

		// Delete sandboxes metadata (depends on users)
		await db.delete(sandboxes).where(eq(sandboxes.userId, userId));

		// Delete templates (depends on users)
		await db.delete(templates).where(eq(templates.userId, userId));

		// Delete user (accounts, sessions, user_preferences cascade automatically via FK)
		await db.delete(users).where(eq(users.id, userId));

		return { success: true };
	});

export const $getUserPreferences = createServerFn({ method: "GET" }).handler(
	async (): Promise<UserSettings["preferences"]> => {
		const { db, userPreferences } = await getAuthServerContext();
		const { userId } = await getCurrentSession();

		try {
			const [prefs] = await db
				.select()
				.from(userPreferences)
				.where(eq(userPreferences.userId, userId));

			return mapPreferences(prefs) ?? getDefaultPreferences();
		} catch (error) {
			console.warn(
				"[auth] Failed to load user_preferences in $getUserPreferences, using defaults",
				error,
			);
			return getDefaultPreferences();
		}
	},
);

export const $updateUserPreferences = createServerFn({ method: "POST" })
	.inputValidator(updatePreferencesSchema)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { db, userPreferences } = await getAuthServerContext();
		const { userId } = await getCurrentSession();

		const [existingPreference] = await db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, userId));

		if (existingPreference) {
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
		const { aiLogs, db, sandboxes } = await getAuthServerContext();
		const { userId } = await getCurrentSession();
		const { end, start } = getTodayUtcRange();

		const [activeResult] = await db
			.select({ count: count() })
			.from(sandboxes)
			.where(and(eq(sandboxes.userId, userId), eq(sandboxes.status, "active")));

		const [totalCreatedResult] = await db
			.select({ count: count() })
			.from(sandboxes)
			.where(eq(sandboxes.userId, userId));

		const [aiResult] = await db
			.select({ count: count() })
			.from(aiLogs)
			.where(
				and(
					eq(aiLogs.userId, userId),
					gte(aiLogs.createdAt, start),
					lt(aiLogs.createdAt, end),
				),
			);

		return {
			activeSandboxes: activeResult?.count ?? 0,
			maxSandboxes: TIER_LIMITS[DEFAULT_TIER],
			totalCreated: totalCreatedResult?.count ?? 0,
			aiRequestsToday: aiResult?.count ?? 0,
			maxAiRequestsPerDay: AI_DAILY_LIMIT,
			maxSizePerSandboxMb: MAX_SANDBOX_SIZE_MB,
		};
	},
);
