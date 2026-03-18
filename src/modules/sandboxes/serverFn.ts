import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "#/db";
import { sandboxes } from "#/db/schema";
import { auth } from "#/lib/auth";
import { encryptPassword } from "#/lib/encryption";
import {
	buildConnectionUrl,
	ENGINE_PORTS,
	generateDbName,
	generateDbPassword,
	generateDbUser,
	getAdminPool,
	provisionMySQL,
	provisionPostgreSQL,
} from "#/lib/sandbox-provisioning";
import type {
	CreateSandboxInput,
	DashboardStats,
	DbEngine,
	DbRegion,
	ExtendSandboxInput,
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

const MAX_ACTIVE_SANDBOXES = 5;

async function getUserIdFromRequest(): Promise<string> {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return session.user.id;
}

function sanitizeDisplayName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "-")
		.slice(0, 20);
}

export const $getDashboardStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardStats> => {
		const userId = await getUserIdFromRequest();

		const allSandboxes = await db
			.select()
			.from(sandboxes)
			.where(eq(sandboxes.userId, userId));

		const activeCount = allSandboxes.filter(
			(s) => s.status === "active",
		).length;
		const expiredCount = allSandboxes.filter(
			(s) => s.status === "expired",
		).length;

		return {
			activeSandboxes: activeCount,
			totalCreated: allSandboxes.length,
			autoCleaned: expiredCount,
			aiQueriesThisMonth: 0,
		};
	},
);

export const $getSandboxes = createServerFn({ method: "GET" }).handler(
	async (): Promise<SandboxListItem[]> => {
		const userId = await getUserIdFromRequest();

		const rows = await db
			.select()
			.from(sandboxes)
			.where(eq(sandboxes.userId, userId))
			.orderBy(desc(sandboxes.createdAt));

		return rows.map((s) => ({
			id: s.id,
			displayName: s.displayName,
			engine: s.engine as DbEngine,
			region: s.region as DbRegion,
			status: s.status as SandboxStatus,
			host: s.host,
			port: s.port,
			dbName: s.dbName,
			dbUser: s.dbUser,
			connectionUrl: s.connectionUrl,
			sizeMb: 0,
			maxSizeMb: s.maxSizeMb,
			createdAt: s.createdAt.toISOString(),
			expiredAt: s.expiredAt.toISOString(),
		}));
	},
);

export const $getSandboxById = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const userId = await getUserIdFromRequest();

		const row = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, userId)),
			)
			.limit(1)
			.then((r) => r[0]);

		if (!row) {
			throw new Error("Sandbox not found");
		}

		const { decryptPassword } = await import("#/lib/encryption");
		const decryptedPassword = decryptPassword(row.dbPassword);

		return {
			id: row.id,
			displayName: row.displayName,
			engine: row.engine as DbEngine,
			region: row.region as DbRegion,
			status: row.status as SandboxStatus,
			host: row.host,
			port: row.port,
			dbName: row.dbName,
			dbUser: row.dbUser,
			dbPassword: decryptedPassword,
			connectionUrl: row.connectionUrl,
			sizeMb: 0,
			maxSizeMb: row.maxSizeMb,
			createdAt: row.createdAt.toISOString(),
			expiredAt: row.expiredAt.toISOString(),
		};
	});

export const $createSandbox = createServerFn({ method: "POST" })
	.inputValidator(createSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const userId = await getUserIdFromRequest();
		const input = data as CreateSandboxInput;

		const activeSandboxes = await db
			.select()
			.from(sandboxes)
			.where(and(eq(sandboxes.userId, userId), eq(sandboxes.status, "active")));

		if (activeSandboxes.length >= MAX_ACTIVE_SANDBOXES) {
			throw new Error(
				`Maximum ${MAX_ACTIVE_SANDBOXES} active sandboxes allowed. Please delete one to create a new sandbox.`,
			);
		}

		const userShortId = userId.slice(0, 4);
		const dbName = generateDbName(
			userShortId,
			sanitizeDisplayName(input.displayName),
		);
		const dbUser = generateDbUser();
		const dbPassword = generateDbPassword();
		const port = ENGINE_PORTS[input.engine];
		const host = `${input.region}.pisangdb.com`;
		const connectionUrl = buildConnectionUrl(
			input.engine,
			input.region,
			dbUser,
			dbPassword,
			dbName,
		);

		const encryptedPassword = encryptPassword(dbPassword);
		const now = new Date();
		const expiredAt = new Date(
			now.getTime() + input.retentionHours * 60 * 60 * 1000,
		);

		const adminPool = getAdminPool(input.engine, input.region);

		try {
			if (input.engine === "postgresql") {
				await provisionPostgreSQL(adminPool, dbName, dbUser, dbPassword);
			} else {
				await provisionMySQL(adminPool, dbName, dbUser, dbPassword);
			}
		} catch (err) {
			console.error("Failed to provision database:", err);
			throw new Error("Failed to create database. Please try again.");
		}

		const [created] = await db
			.insert(sandboxes)
			.values({
				userId,
				engine: input.engine,
				region: input.region,
				dbName,
				dbUser,
				dbPassword: encryptedPassword,
				connectionUrl,
				host,
				port,
				displayName: input.displayName,
				status: "active",
				expiredAt,
				maxSizeMb: 100,
			})
			.returning();

		return {
			id: created.id,
			displayName: created.displayName,
			engine: created.engine as DbEngine,
			region: created.region as DbRegion,
			status: created.status as SandboxStatus,
			host: created.host,
			port: created.port,
			dbName: created.dbName,
			dbUser: created.dbUser,
			dbPassword: dbPassword,
			connectionUrl: created.connectionUrl,
			sizeMb: 0,
			maxSizeMb: created.maxSizeMb,
			createdAt: created.createdAt.toISOString(),
			expiredAt: created.expiredAt.toISOString(),
		};
	});

export const $extendSandbox = createServerFn({ method: "POST" })
	.inputValidator(extendSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const userId = await getUserIdFromRequest();
		const input = data as ExtendSandboxInput;

		const row = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, input.sandboxId), eq(sandboxes.userId, userId)),
			)
			.limit(1)
			.then((r) => r[0]);

		if (!row) {
			throw new Error("Sandbox not found");
		}

		if (row.status !== "active") {
			throw new Error("Can only extend active sandboxes");
		}

		const maxLifetime = new Date(
			row.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000,
		);
		const newExpiry = new Date(
			Math.min(
				row.expiredAt.getTime() + input.additionalHours * 60 * 60 * 1000,
				maxLifetime.getTime(),
			),
		);

		const [updated] = await db
			.update(sandboxes)
			.set({ expiredAt: newExpiry, updatedAt: new Date() })
			.where(eq(sandboxes.id, input.sandboxId))
			.returning();

		const { decryptPassword } = await import("#/lib/encryption");
		const decryptedPassword = decryptPassword(updated.dbPassword);

		return {
			id: updated.id,
			displayName: updated.displayName,
			engine: updated.engine as DbEngine,
			region: updated.region as DbRegion,
			status: updated.status as SandboxStatus,
			host: updated.host,
			port: updated.port,
			dbName: updated.dbName,
			dbUser: updated.dbUser,
			dbPassword: decryptedPassword,
			connectionUrl: updated.connectionUrl,
			sizeMb: 0,
			maxSizeMb: updated.maxSizeMb,
			createdAt: updated.createdAt.toISOString(),
			expiredAt: updated.expiredAt.toISOString(),
		};
	});

export const $deleteSandbox = createServerFn({ method: "POST" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<void> => {
		const userId = await getUserIdFromRequest();

		const row = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, userId)),
			)
			.limit(1)
			.then((r) => r[0]);

		if (!row) {
			throw new Error("Sandbox not found");
		}

		await db
			.update(sandboxes)
			.set({ status: "destroying", updatedAt: new Date() })
			.where(eq(sandboxes.id, data.sandboxId));

		const adminPool = getAdminPool(
			row.engine as DbEngine,
			row.region as DbRegion,
		);

		try {
			if (row.engine === "postgresql") {
				const { deprovisionPostgreSQL } = await import(
					"#/lib/sandbox-provisioning"
				);
				await deprovisionPostgreSQL(adminPool, row.dbName, row.dbUser);
			} else {
				const { deprovisionMySQL } = await import("#/lib/sandbox-provisioning");
				await deprovisionMySQL(adminPool, row.dbName, row.dbUser);
			}
		} catch (err) {
			console.error("Failed to deprovision database:", err);
		}

		await db
			.update(sandboxes)
			.set({ status: "expired", updatedAt: new Date() })
			.where(eq(sandboxes.id, data.sandboxId));
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
