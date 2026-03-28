import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, eq, gte, lt } from "drizzle-orm";
import {
	DEFAULT_TIER,
	type DashboardStats,
	TIER_LIMITS,
} from "#/lib/types";

async function getDashboardServerContext() {
	const [{ db }, schema, { auth }] = await Promise.all([
		import("#/db"),
		import("#/db/schema"),
		import("#/lib/auth"),
	]);

	return {
		aiLogs: schema.aiLogs,
		auth,
		db,
		sandboxes: schema.sandboxes,
	};
}

function getCurrentUtcMonthRange() {
	const now = new Date();
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const end = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
	);

	return { end, start };
}

export const $getDashboardStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardStats> => {
		const { aiLogs, auth, db, sandboxes } = await getDashboardServerContext();
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const userId = session.user.id;

		const [activeResult] = await db
			.select({ count: count() })
			.from(sandboxes)
			.where(and(eq(sandboxes.userId, userId), eq(sandboxes.status, "active")));

		const [totalResult] = await db
			.select({ count: count() })
			.from(sandboxes)
			.where(eq(sandboxes.userId, userId));

		const [expiredResult] = await db
			.select({ count: count() })
			.from(sandboxes)
			.where(
				and(eq(sandboxes.userId, userId), eq(sandboxes.status, "expired")),
			);

		const { end, start } = getCurrentUtcMonthRange();
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

		const tier = DEFAULT_TIER;
		const maxSandboxes = TIER_LIMITS[tier];

		return {
			activeSandboxes: activeResult?.count ?? 0,
			totalCreated: totalResult?.count ?? 0,
			autoCleaned: expiredResult?.count ?? 0,
			aiQueriesThisMonth: aiResult?.count ?? 0,
			tier,
			maxSandboxes,
		};
	},
);
