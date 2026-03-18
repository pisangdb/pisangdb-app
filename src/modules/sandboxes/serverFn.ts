import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { Pool } from "pg";

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

function createPgAdminPool(region: string) {
	const key = `POSTGRES_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);
	return new Pool({ connectionString: url });
}

function createMysqlAdminPool(region: string, engine: "mysql" | "mariadb") {
	const key =
		engine === "mariadb"
			? `MARIADB_SANDBOX_URL_${region.toUpperCase()}`
			: `MYSQL_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);
	return mysql.createPool(url);
}

async function getCurrentUser() {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return session.user;
}

function toSandboxDetail(row: typeof sandboxes.$inferSelect): SandboxDetail {
	const devHost = process.env.SANDBOX_HOST ?? row.host;
	const devPort =
		process.env.NODE_ENV === "development" || devHost === "localhost"
			? row.engine === "postgresql"
				? 5432
				: 3306
			: row.port;
	const proto = row.engine === "postgresql" ? "postgresql" : "mysql";
	const devConnectionUrl = `${proto}://${row.dbUser}:${row.dbPassword}@${devHost}:${devPort}/${row.dbName}`;

	return {
		id: row.id,
		displayName: row.displayName,
		engine: row.engine as SandboxDetail["engine"],
		region: row.region as SandboxDetail["region"],
		status: row.status as SandboxDetail["status"],
		host: devHost,
		port: devPort,
		dbName: row.dbName,
		dbUser: row.dbUser,
		dbPassword: row.dbPassword,
		connectionUrl: devConnectionUrl,
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
		const host = process.env.SANDBOX_HOST ?? `${data.region}.pisangdb.com`;
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
				maxSizeMb: 100,
				expiredAt,
				...(data.templateId?.trim() && { templateId: data.templateId }),
			})
			.returning();

		if (!row) {
			throw new Error("Failed to create sandbox");
		}

		try {
			if (data.engine === "postgresql") {
				const pgPool = createPgAdminPool(data.region);
				try {
					await pgPool.query(`CREATE DATABASE "${dbName}"`);
					await pgPool.query(
						`CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'`,
					);
					await pgPool.query(
						`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`,
					);
					await pgPool.query(
						`ALTER USER "${dbUser}" NOSUPERUSER NOCREATEDB NOCREATEROLE`,
					);
					await pgPool.query(
						`ALTER USER "${dbUser}" SET statement_timeout = '30s'`,
					);
					await pgPool.query(
						`GRANT CONNECT ON DATABASE "${dbName}" TO "${dbUser}"`,
					);
					await pgPool.query(
						`GRANT ALL PRIVILEGES ON SCHEMA public TO "${dbUser}"`,
					);
				} finally {
					await pgPool.end();
				}
			} else {
				const mysqlPool = createMysqlAdminPool(data.region, data.engine);
				try {
					await mysqlPool.query(`CREATE DATABASE \`${dbName}\``);
					await mysqlPool.query(`CREATE USER ?@'%' IDENTIFIED BY ?`, [
						dbUser,
						dbPassword,
					]);
					await mysqlPool.query(
						`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON ${dbName}.* TO ?@'%'`,
						[dbUser],
					);
					await mysqlPool.query(`FLUSH PRIVILEGES`);
				} finally {
					await mysqlPool.end();
				}
			}
		} catch (dbError) {
			await db.delete(sandboxes).where(eq(sandboxes.id, row.id));
			const msg = dbError instanceof Error ? dbError.message : "Unknown error";
			throw new Error(`Failed to provision database: ${msg}`);
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
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			);

		if (!row) {
			throw new Error("Sandbox not found");
		}

		// Mark as destroying immediately
		await db
			.update(sandboxes)
			.set({ status: "destroying", updatedAt: new Date() })
			.where(eq(sandboxes.id, data.sandboxId));

		try {
			if (row.engine === "postgresql") {
				const pgPool = createPgAdminPool(row.region);
				try {
					await pgPool.query(
						`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
						[row.dbName],
					);
					await pgPool.query(`DROP DATABASE IF EXISTS "${row.dbName}"`);
					await pgPool.query(`DROP USER IF EXISTS "${row.dbUser}"`);
				} finally {
					await pgPool.end();
				}
			} else {
				const mysqlPool = createMysqlAdminPool(
					row.region,
					row.engine as "mysql" | "mariadb",
				);
				try {
					await mysqlPool.query(
						`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'`,
						[row.dbUser],
					);
					await mysqlPool.query(`DROP USER IF EXISTS ?@'%'`, [row.dbUser]);
					await mysqlPool.query(`DROP DATABASE IF EXISTS \`${row.dbName}\``);
				} finally {
					await mysqlPool.end();
				}
			}
		} catch (cleanupError) {
			const msg =
				cleanupError instanceof Error ? cleanupError.message : "Unknown error";
			throw new Error(`Failed to cleanup database: ${msg}`);
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
