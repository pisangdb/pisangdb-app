import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, ne } from "drizzle-orm";
import type { Pool as MySqlPool } from "mysql2/promise";
import { Pool } from "pg";
import {
	createMariadbAdminPool,
	createMysqlAdminPool,
	createPgAdminPool,
	db,
} from "#/db";
import { sandboxes } from "#/db/schema";
import { auth } from "#/lib/auth";
import {
	deprovisionMariaDB,
	deprovisionMySQL,
	deprovisionPostgreSQL,
} from "#/lib/sandbox-provisioning";
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
				maxSizeMb: sandboxes.maxSizeMb,
				createdAt: sandboxes.createdAt,
				expiredAt: sandboxes.expiredAt,
			})
			.from(sandboxes)
			.where(
				and(
					eq(sandboxes.userId, userId),
					ne(sandboxes.status, "expired"),
					ne(sandboxes.status, "destroying"),
				),
			)
			.orderBy(desc(sandboxes.createdAt));

		return rows.map((row) => ({
			...row,
			engine: row.engine as DbEngine,
			region: row.region as DbRegion,
			status: row.status as SandboxStatus,
			sizeMb: 0, // actual size not stored; detail page fetches it on-demand
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

		const sizeMb = await getSandboxDatabaseSize(
			sandbox.engine as DbEngine,
			sandbox.region,
			sandbox.dbName,
		);

		return {
			...sandbox,
			engine: sandbox.engine as DbEngine,
			region: sandbox.region as DbRegion,
			status: sandbox.status as SandboxStatus,
			sizeMb,
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
	region: string,
): Promise<void> {
	if (!pool) return;

	try {
		if (engine === "postgresql") {
			await deprovisionPostgreSQL(pool as Pool, dbName, dbUser, region);
		} else if (engine === "mysql") {
			await deprovisionMySQL(pool as MySqlPool, dbName, dbUser);
		} else if (engine === "mariadb") {
			await deprovisionMariaDB(pool as MySqlPool, dbName, dbUser);
		}
	} catch (error) {
		// Error may be a plain object from driver — serialize safely
		const message =
			error instanceof Error
				? error.message
				: typeof error === "object" && error !== null
					? JSON.stringify(error)
					: String(error);
		console.error(`Failed to cleanup sandbox: ${message}`);
		throw error; // Re-throw so status doesn't get set to expired if cleanup fails
	}
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
		`CREATE USER ${safeUser} WITH PASSWORD '${escapedPassword}' NOSUPERUSER NOCREATEROLE NOCREATEDB LOGIN`,
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
				data.region,
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

		// Mark as destroying first
		await db
			.update(sandboxes)
			.set({ status: "destroying", updatedAt: new Date() })
			.where(eq(sandboxes.id, data.sandboxId));

		// Actually deprovision the database — always mark as expired afterwards
		// even if deprovision fails (so ephemeral engine won't retry a stuck sandbox)
		const cleanupPool =
			sandbox.engine === "postgresql"
				? createPgAdminPool(sandbox.region)
				: sandbox.engine === "mysql"
					? createMysqlAdminPool(sandbox.region)
					: createMariadbAdminPool(sandbox.region);

		try {
			await cleanupPartialSandbox(
				sandbox.engine,
				cleanupPool as Pool | MySqlPool | null,
				sandbox.dbName,
				sandbox.dbUser,
				sandbox.region,
			);
		} catch (deprovisionError) {
			console.error(
				"Deprovision failed, marking sandbox as expired anyway:",
				deprovisionError,
			);
		}

		// Always mark as expired — deprovision failure shouldn't leave it stuck at "destroying"
		await db
			.update(sandboxes)
			.set({ status: "expired", updatedAt: new Date() })
			.where(eq(sandboxes.id, data.sandboxId));
	});

// ─── Database Size Helper ────────────────────────────────────────────────

async function getSandboxDatabaseSize(
	engine: DbEngine,
	region: string,
	dbName: string,
): Promise<number> {
	try {
		if (engine === "postgresql") {
			const pool = createPgAdminPool(region);
			// pg_database_size returns bytes
			const result = await pool.query<{ pg_database_size: string }>(
				`SELECT pg_database_size($1) AS pg_database_size`,
				[dbName],
			);
			await pool.end();
			const bytes = parseInt(result.rows[0]?.pg_database_size ?? "0", 10);
			return Math.round(bytes / (1024 * 1024));
		} else {
			// MySQL or MariaDB — use information_schema
			const pool =
				engine === "mysql"
					? createMysqlAdminPool(region)
					: createMariadbAdminPool(region);
			const [result] = (await pool.query(
				`SELECT ROUND(SUM(Data_length + Index_length) / 1024 / 1024, 2) AS size_mb
				 FROM information_schema.tables
				 WHERE table_schema = ?`,
				[dbName],
			)) as [
				{
					"ROUND(SUM(Data_length + Index_length) / 1024 / 1024, 2)":
						| number
						| null;
				}[],
				unknown,
			];
			await pool.end();
			return Math.round(
				result[0]?.[
					"ROUND(SUM(Data_length + Index_length) / 1024 / 1024, 2)"
				] ?? 0,
			);
		}
	} catch {
		return 0;
	}
}

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

		// Connect to the sandbox database to get tables
		try {
			let tables: SandboxTable[] = [];

			if (sandbox.engine === "postgresql") {
				// Use SANDBOX_HOST override for local development (same as $executeQuery)
				const host = process.env.SANDBOX_HOST ?? sandbox.host;
				// Connect directly to the sandbox database using sandbox credentials
				const sandboxPool = new Pool({
					host,
					port: sandbox.port,
					database: sandbox.dbName,
					user: sandbox.dbUser,
					password: sandbox.dbPassword,
					max: 5,
				});
				const result = await sandboxPool.query<{
					table_name: string;
					table_rows: string;
					total_bytes: string;
				}>(
					`SELECT
						c.relname AS table_name,
						COALESCE(s.n_live_tup, 0)::text AS table_rows,
						pg_total_relation_length(c.oid)::text AS total_bytes
					FROM pg_class c
					LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
					LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
					WHERE c.relkind = 'r'
						AND n.nspname = 'public'
						AND NOT c.relname LIKE 'pisang_%'
					ORDER BY c.relname`,
				);
				tables = result.rows.map((row) => ({
					name: row.table_name,
					rows: parseInt(row.table_rows, 10) || 0,
					sizeKb: Math.round(parseInt(row.total_bytes, 10) / 1024) || 0,
				}));
				await sandboxPool.end();
			} else {
				// MySQL or MariaDB
				const pool =
					sandbox.engine === "mysql"
						? createMysqlAdminPool(sandbox.region)
						: createMariadbAdminPool(sandbox.region);
				const [result] = (await pool.query(
					`SHOW TABLE STATUS FROM \`${sandbox.dbName}\``,
				)) as [Record<string, number | string>[], unknown];
				tables = result.map((row) => ({
					name: row.Tables_in_db as string,
					rows: (row.Rows as number) || 0,
					sizeKb:
						Math.round(
							parseInt((row.Data_length as string) || "0", 10) / 1024,
						) || 0,
				}));
				await pool.end();
			}

			return tables;
		} catch {
			// If we can't connect to the sandbox DB (e.g., it's empty or not accessible), return empty
			return [];
		}
	});
