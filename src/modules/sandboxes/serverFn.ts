import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, eq } from "drizzle-orm";
import type { Pool as MySqlPool } from "mysql2/promise";
import type { Pool } from "pg";
import {
	createMariadbAdminPool,
	createMysqlAdminPool,
	createPgAdminPool,
	db,
} from "#/db";
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

// ─── Sandbox Creation Helpers ─────────────────────────────────────────────

function generateSandboxCredentials(
	userId: string,
	displayName: string,
	engine: string,
): {
	dbName: string;
	dbUser: string;
	dbPassword: string;
	host: string;
	port: number;
	connectionUrl: string;
} {
	const shortUid = userId.slice(0, 8);
	const randomSuffix = crypto.randomBytes(3).toString("hex");
	const safeName = displayName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 20);

	const dbName = `pisang_${shortUid}_${safeName}_${randomSuffix}`;
	const dbUser = `sb_${crypto.randomBytes(4).toString("hex")}`;
	const dbPassword = crypto.randomBytes(16).toString("base64url");

	const region = "id";
	const host = `${region}.pisangdb.com`;
	const port =
		engine === "postgresql" ? 5432 : engine === "mysql" ? 3306 : 3307;

	const encodedPassword = encodeURIComponent(dbPassword);
	const connectionUrl =
		engine === "postgresql"
			? `postgresql://${dbUser}:${encodedPassword}@${host}:${port}/${dbName}`
			: `mysql://${dbUser}:${encodedPassword}@${host}:${port}/${dbName}`;

	return { dbName, dbUser, dbPassword, host, port, connectionUrl };
}

async function cleanupPartialSandbox(
	engine: string,
	pool: Pool | MySqlPool | null,
	dbName: string,
	dbUser: string,
): Promise<void> {
	if (!pool) return;

	try {
		if (engine === "postgresql") {
			const pgPool = pool as Pool;
			await pgPool.query(
				`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}'`,
			);
			await pgPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
			await pgPool.query(`DROP USER IF EXISTS "${dbUser}"`);
		} else {
			const myPool = pool as MySqlPool;
			await myPool.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
			await myPool.execute(`DROP USER IF EXISTS '${dbUser}'@'%'`);
		}
	} catch {}
}

async function provisionPostgresql(
	pool: Pool,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	const safeDbName = `"${dbName}"`;
	const safeUser = `"${dbUser}"`;
	const escapedPassword = dbPassword.replace(/'/g, "''");

	await pool.query(
		`CREATE USER ${safeUser} WITH PASSWORD '${escapedPassword}' NOSUPERUSER NOCREATEROLE NOCREATEDB NOLOGIN`,
	);
	await pool.query(`CREATE DATABASE ${safeDbName} OWNER ${safeUser}`);
	await pool.query(`GRANT CONNECT ON DATABASE ${safeDbName} TO ${safeUser}`);
	await pool.query(`GRANT USAGE ON SCHEMA public TO ${safeUser}`);
	await pool.query(`GRANT CREATE ON SCHEMA public TO ${safeUser}`);
	await pool.query(
		`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${safeUser}`,
	);
	await pool.query(
		`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${safeUser}`,
	);
	await pool.query(
		`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${safeUser}`,
	);
	await pool.query(
		`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${safeUser}`,
	);
	await pool.query(`ALTER USER ${safeUser} SET statement_timeout = '30s'`);
}

async function provisionMysql(
	pool: MySqlPool,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	const escapedUser = dbUser.replace(/'/g, "''");
	const escapedPassword = dbPassword.replace(/'/g, "''");

	await pool.execute(
		`CREATE USER '${escapedUser}'@'%' IDENTIFIED WITH mysql_native_password BY '${escapedPassword}'`,
	);
	await pool.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
	await pool.execute(
		`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON \`${dbName}\`.* TO '${escapedUser}'@'%'`,
	);
	await pool.execute(
		`GRANT USAGE ON *.* TO '${escapedUser}'@'%' WITH MAX_USER_CONNECTIONS 5`,
	);
	await pool.execute(`FLUSH PRIVILEGES`);
}

async function provisionMariadb(
	pool: MySqlPool,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	const escapedUser = dbUser.replace(/'/g, "''");
	const escapedPassword = dbPassword.replace(/'/g, "''");

	await pool.execute(
		`CREATE USER '${escapedUser}'@'%' IDENTIFIED BY '${escapedPassword}'`,
	);
	await pool.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
	await pool.execute(
		`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON \`${dbName}\`.* TO '${escapedUser}'@'%'`,
	);
	await pool.execute(
		`GRANT USAGE ON *.* TO '${escapedUser}'@'%' WITH MAX_USER_CONNECTIONS 5`,
	);
	await pool.execute(`FLUSH PRIVILEGES`);
}

// ─── $createSandbox ───────────────────────────────────────────────────────

export const $createSandbox = createServerFn({ method: "POST" })
	.inputValidator(createSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const userId = session.user.id;

		const MAX_ACTIVE = 5;
		const [activeResult] = await db
			.select({ count: count() })
			.from(sandboxes)
			.where(and(eq(sandboxes.userId, userId), eq(sandboxes.status, "active")));

		if ((activeResult?.count ?? 0) >= MAX_ACTIVE) {
			throw new Error(`Maximum of ${MAX_ACTIVE} active sandboxes allowed`);
		}

		const { dbName, dbUser, dbPassword, host, port, connectionUrl } =
			generateSandboxCredentials(userId, data.displayName, data.engine);

		try {
			if (data.engine === "postgresql") {
				const rawPool = createPgAdminPool(data.region);
				await provisionPostgresql(rawPool, dbName, dbUser, dbPassword);
			} else if (data.engine === "mysql") {
				const rawPool = createMysqlAdminPool(data.region);
				await provisionMysql(rawPool, dbName, dbUser, dbPassword);
			} else {
				const rawPool = createMariadbAdminPool(data.region);
				await provisionMariadb(rawPool, dbName, dbUser, dbPassword);
			}

			const expiredAt = new Date(
				Date.now() + data.retentionHours * 60 * 60 * 1000,
			);

			const [created] = await db
				.insert(sandboxes)
				.values({
					userId,
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
					expiredAt,
				})
				.returning();

			return {
				...created,
				engine: created.engine as DbEngine,
				region: created.region as DbRegion,
				status: created.status as SandboxStatus,
				sizeMb: 0,
				createdAt: created.createdAt.toISOString(),
				expiredAt: created.expiredAt.toISOString(),
			};
		} catch (err) {
			const cleanupPool =
				data.engine === "postgresql"
					? createPgAdminPool(data.region)
					: data.engine === "mysql"
						? createMysqlAdminPool(data.region)
						: createMariadbAdminPool(data.region);
			await cleanupPartialSandbox(
				data.engine,
				cleanupPool as Pool | MySqlPool | null,
				dbName,
				dbUser,
			);
			throw err instanceof Error ? err : new Error("Failed to create sandbox");
		}
	});

// ─── $extendSandbox ───────────────────────────────────────────────────────

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

// ─── $deleteSandbox ───────────────────────────────────────────────────────

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

// ─── $getSandboxTables ────────────────────────────────────────────────────

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
