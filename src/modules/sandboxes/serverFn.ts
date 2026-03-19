import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "#/db";
import { sandboxes } from "#/db/schema";
import { auth } from "#/lib/auth";
import type {
	DashboardStats,
	DbEngine,
	DbRegion,
	SandboxDetail,
	SandboxListItem,
	SandboxStatus,
	SandboxTable,
} from "#/lib/types";
import {
	createSandboxSchema,
	extendSandboxSchema,
	sandboxIdSchema,
} from "./schema";

export const $getDashboardStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardStats> => {
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

		return {
			activeSandboxes: activeResult?.count ?? 0,
			totalCreated: totalResult?.count ?? 0,
			autoCleaned: expiredResult?.count ?? 0,
			aiQueriesThisMonth: 0,
		};
	},
);

export const $getSandboxes = createServerFn({ method: "GET" }).handler(
	async (): Promise<SandboxListItem[]> => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const userId = session.user.id;

		const rows = await db
			.select({
				id: sandboxes.id,
				displayName: sandboxes.displayName,
				engine: sandboxes.engine,
				region: sandboxes.region,
				status: sandboxes.status,
				host: sandboxes.host,
				port: sandboxes.port,
				dbName: sandboxes.dbName,
				dbUser: sandboxes.dbUser,
				connectionUrl: sandboxes.connectionUrl,
				sizeMb: sandboxes.maxSizeMb,
				maxSizeMb: sandboxes.maxSizeMb,
				createdAt: sandboxes.createdAt,
				expiredAt: sandboxes.expiredAt,
			})
			.from(sandboxes)
			.where(eq(sandboxes.userId, userId));

		return rows.map((row) => ({
			...row,
			engine: row.engine as DbEngine,
			region: row.region as DbRegion,
			status: row.status as SandboxStatus,
			createdAt: row.createdAt.toISOString(),
			expiredAt: row.expiredAt.toISOString(),
		}));
	},
);

export const $getSandboxById = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(
					eq(sandboxes.id, data.sandboxId),
					eq(sandboxes.userId, session.user.id),
				),
			);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		return {
			...sandbox,
			engine: sandbox.engine as DbEngine,
			region: sandbox.region as DbRegion,
			status: sandbox.status as SandboxStatus,
			sizeMb: 0,
			createdAt: sandbox.createdAt.toISOString(),
			expiredAt: sandbox.expiredAt.toISOString(),
		};
	});

export const $createSandbox = createServerFn({ method: "POST" })
	.inputValidator(createSandboxSchema)
	.handler(async (): Promise<SandboxDetail> => {
		throw new Error(
			"Sandbox creation not yet implemented - requires Docker container provisioning",
		);
	});

export const $extendSandbox = createServerFn({ method: "POST" })
	.inputValidator(extendSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(
					eq(sandboxes.id, data.sandboxId),
					eq(sandboxes.userId, session.user.id),
				),
			);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		const newExpiry = new Date(
			sandbox.expiredAt.getTime() + data.additionalHours * 60 * 60 * 1000,
		);

		const [updated] = await db
			.update(sandboxes)
			.set({ expiredAt: newExpiry, updatedAt: new Date() })
			.where(eq(sandboxes.id, data.sandboxId))
			.returning();

		return {
			...updated,
			engine: updated.engine as DbEngine,
			region: updated.region as DbRegion,
			status: updated.status as SandboxStatus,
			sizeMb: 0,
			createdAt: updated.createdAt.toISOString(),
			expiredAt: updated.expiredAt.toISOString(),
		};
	});

export const $deleteSandbox = createServerFn({ method: "POST" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<void> => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(
					eq(sandboxes.id, data.sandboxId),
					eq(sandboxes.userId, session.user.id),
				),
			);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		await db
			.update(sandboxes)
			.set({ status: "destroying", updatedAt: new Date() })
			.where(eq(sandboxes.id, data.sandboxId));
	});

export const $getSandboxTables = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxTable[]> => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(
					eq(sandboxes.id, data.sandboxId),
					eq(sandboxes.userId, session.user.id),
				),
			);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		throw new Error(
			"Get sandbox tables not yet implemented - requires connecting to sandbox DB",
		);
	});
