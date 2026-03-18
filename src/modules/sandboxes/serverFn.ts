import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db";
import { sandboxes } from "#/db/schema";
import { auth } from "#/lib/auth";
import type {
	DashboardStats,
	SandboxDetail,
	SandboxListItem,
	SandboxTable,
} from "#/lib/types";
import {
	createSandboxSchema,
	extendSandboxSchema,
	sandboxIdSchema,
} from "./schema";

async function getCurrentUser() {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return session.user;
}

function toSandboxDetail(row: typeof sandboxes.$inferSelect): SandboxDetail {
	return {
		id: row.id,
		displayName: row.displayName,
		engine: row.engine as SandboxDetail["engine"],
		region: row.region as SandboxDetail["region"],
		status: row.status as SandboxDetail["status"],
		host: row.host,
		port: row.port,
		dbName: row.dbName,
		dbUser: row.dbUser,
		dbPassword: row.dbPassword,
		connectionUrl: row.connectionUrl,
		sizeMb: 0,
		maxSizeMb: row.maxSizeMb,
		createdAt: row.createdAt.toISOString(),
		expiredAt: row.expiredAt.toISOString(),
	};
}

export const $getDashboardStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardStats> => {
		const user = await getCurrentUser();

		const [activeRow] = await db
			.select({ count: sql<number>`count(*)` })
			.from(sandboxes)
			.where(
				and(eq(sandboxes.userId, user.id), eq(sandboxes.status, "active")),
			);

		const [totalRow] = await db
			.select({ count: sql<number>`count(*)` })
			.from(sandboxes)
			.where(eq(sandboxes.userId, user.id));

		return {
			activeSandboxes: Number(activeRow?.count ?? 0),
			totalCreated: Number(totalRow?.count ?? 0),
			autoCleaned: 0,
			aiQueriesThisMonth: 0,
		};
	},
);

export const $getSandboxes = createServerFn({ method: "GET" }).handler(
	async (): Promise<SandboxListItem[]> => {
		const user = await getCurrentUser();

		const rows = await db
			.select()
			.from(sandboxes)
			.where(and(eq(sandboxes.userId, user.id), eq(sandboxes.status, "active")))
			.orderBy(sql`${sandboxes.createdAt} DESC`);

		return rows.map((row) => {
			const detail = toSandboxDetail(row);
			const { dbPassword: _pw, ...rest } = detail;
			return rest as SandboxListItem;
		});
	},
);

export const $getSandboxById = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const user = await getCurrentUser();

		const [row] = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			);

		if (!row) {
			throw new Error("Sandbox not found");
		}

		return toSandboxDetail(row);
	});

export const $createSandbox = createServerFn({ method: "POST" })
	.inputValidator(createSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const user = await getCurrentUser();

		const port =
			data.engine === "postgresql"
				? 5432
				: data.engine === "mysql"
					? 3306
					: 3307;

		const now = new Date();
		const expiredAt = new Date(
			now.getTime() + data.retentionHours * 60 * 60 * 1000,
		);

		const shortId = randomBytes(2).toString("hex");
		const suffix = randomBytes(3).toString("hex");
		const slug = data.displayName
			.replace(/[^a-zA-Z0-9]/g, "-")
			.toLowerCase()
			.slice(0, 15);
		const dbName = `pisang_${shortId}_${slug}_${suffix}`;
		const dbUser = `sb_${shortId}`;
		const dbPassword = randomBytes(16).toString("hex");
		const proto = data.engine === "postgresql" ? "postgresql" : "mysql";
		const host = `${data.region}.pisangdb.com`;
		const connectionUrl = `${proto}://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;

		const [row] = await db
			.insert(sandboxes)
			.values({
				userId: user.id,
				engine: data.engine,
				region: data.region,
				dbName,
				dbUser,
				dbPassword,
				connectionUrl,
				host,
				port,
				displayName: data.displayName,
				status: "active",
				templateId: data.templateId ?? null,
				maxSizeMb: 100,
				expiredAt,
			})
			.returning();

		if (!row) {
			throw new Error("Failed to create sandbox");
		}

		return toSandboxDetail(row);
	});

export const $extendSandbox = createServerFn({ method: "POST" })
	.inputValidator(extendSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const user = await getCurrentUser();

		const [existing] = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			);

		if (!existing) {
			throw new Error("Sandbox not found");
		}

		const newExpiredAt = new Date(
			existing.expiredAt.getTime() + data.additionalHours * 60 * 60 * 1000,
		);

		const [row] = await db
			.update(sandboxes)
			.set({ expiredAt: newExpiredAt, updatedAt: new Date() })
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			)
			.returning();

		return toSandboxDetail(row);
	});

export const $deleteSandbox = createServerFn({ method: "POST" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<void> => {
		const user = await getCurrentUser();

		const [row] = await db
			.update(sandboxes)
			.set({ status: "expired", updatedAt: new Date() })
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			)
			.returning();

		if (!row) {
			throw new Error("Sandbox not found");
		}
	});

export const $getSandboxTables = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data: _data }): Promise<SandboxTable[]> => {
		return [
			{ name: "users", rows: 20, sizeKb: 48 },
			{ name: "products", rows: 50, sizeKb: 112 },
			{ name: "orders", rows: 15, sizeKb: 32 },
		];
	});
