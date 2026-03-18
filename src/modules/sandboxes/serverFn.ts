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

function getSandboxPort(engine: string, region: string): number {
	const regionKey = region.toUpperCase();
	if (engine === "postgresql") {
		const url = process.env[`POSTGRES_SANDBOX_URL_${regionKey}`] ?? "";
		const match = url.match(/:(\d+)(?:\/|$)/);
		if (match) return parseInt(match[1], 10);
		return 5432;
	}
	if (engine === "mysql") {
		const url = process.env[`MYSQL_SANDBOX_URL_${regionKey}`] ?? "";
		const match = url.match(/:(\d+)(?:\/|$)/);
		if (match) return parseInt(match[1], 10);
		return 3306;
	}
	const envUrl = process.env[`MARIADB_SANDBOX_URL_${regionKey}`] ?? "";
	const match = envUrl.match(/:(\d+)(?:\/|$)/);
	if (match) return parseInt(match[1], 10);
	return 3307;
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
	const devPort = getSandboxPort(row.engine, row.region);
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

		const port = getSandboxPort(data.engine, data.region);

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
				const envUrl =
					process.env[`POSTGRES_SANDBOX_URL_${data.region.toUpperCase()}`] ??
					"";
				const urlMatch = envUrl.match(
					/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)/,
				);
				const pgHost = urlMatch?.[3] ?? "localhost";
				const pgPort = urlMatch?.[4] ?? String(port);

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
				} finally {
					await pgPool.end();
				}

				const targetPool = new Pool({
					host: pgHost,
					port: parseInt(pgPort, 10),
					database: dbName,
					user: "postgres",
					password: urlMatch?.[2] ?? "",
				});
				try {
					await targetPool.query(
						`GRANT CONNECT ON DATABASE "${dbName}" TO "${dbUser}"`,
					);
					await targetPool.query(
						`GRANT ALL PRIVILEGES ON SCHEMA public TO "${dbUser}"`,
					);
					await targetPool.query(
						`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`,
					);
					await targetPool.query(
						`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`,
					);
				} finally {
					await targetPool.end();
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
	.handler(async ({ data }): Promise<SandboxTable[]> => {
		const user = await getCurrentUser();

		const [sandbox] = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.id, data.sandboxId), eq(sandboxes.userId, user.id)),
			);

		if (!sandbox) {
			throw new Error("Sandbox not found");
		}

		if (sandbox.engine === "postgresql") {
			const pgUrl =
				process.env[`POSTGRES_SANDBOX_URL_${sandbox.region.toUpperCase()}`] ??
				"";
			const basePgUrl = pgUrl.replace(/\/[^/]*(\?|$)/, `/${sandbox.dbName}$1`);
			const sandboxPool = new Pool({ connectionString: basePgUrl });
			try {
				const result = await sandboxPool.query(
					`SELECT
						c.relname AS tablename,
						COALESCE(s.n_live_tup, 0)::integer AS n_live_tup,
						pg_total_relation_size(c.oid) AS pg_total_relation_size
					FROM pg_class c
					JOIN pg_namespace n ON n.oid = c.relnamespace
					LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
					WHERE n.nspname = 'public'
						AND c.relkind = 'r'
						AND c.relname NOT LIKE 'pg_%'
						AND c.relname NOT LIKE 'sql_%'
					ORDER BY c.relname`,
				);
				// pg returns frozen row objects — strip with JSON round-trip for safe serialization
				const plainResult = JSON.parse(JSON.stringify(result.rows)) as Array<{
					tablename: string;
					n_live_tup: number;
					pg_total_relation_size: number;
				}>;
				return plainResult.map((row) => ({
					name: row.tablename,
					rows: row.n_live_tup,
					sizeKb: row.pg_total_relation_size / 1024,
				}));
			} finally {
				await sandboxPool.end();
			}
		}

		// MySQL / MariaDB — connect directly to the sandbox database
		const mysqlUrlEnvKey =
			sandbox.engine === "mariadb"
				? `MARIADB_SANDBOX_URL_${sandbox.region.toUpperCase()}`
				: `MYSQL_SANDBOX_URL_${sandbox.region.toUpperCase()}`;
		const mysqlUrl = process.env[mysqlUrlEnvKey] ?? "";
		const sandboxUrl = mysqlUrl.replace(
			/\/[^/]*(\?|$)/,
			`/${sandbox.dbName}$1`,
		);
		const directPool = mysql.createPool(sandboxUrl);
		try {
			const [tables] = await directPool.query<
				Array<{
					TABLE_NAME: string;
					TABLE_ROWS: number;
					Data_length: bigint;
					Index_length: bigint;
				}>
			>(
				`SELECT
					TABLE_NAME,
					TABLE_ROWS,
					Data_length,
					Index_length
				FROM information_schema.tables
				WHERE table_schema = ?
					AND table_type = 'BASE TABLE'
				ORDER BY TABLE_NAME`,
				[sandbox.dbName],
			);
			// mysql2 may return frozen/proxied rows — strip with JSON round-trip for safe serialization
			const plainTables = JSON.parse(JSON.stringify(tables)) as Array<{
				TABLE_NAME: string;
				TABLE_ROWS: number;
				Data_length: number;
				Index_length: number;
			}>;
			return plainTables.map((row) => ({
				name: row.TABLE_NAME,
				rows: row.TABLE_ROWS ?? 0,
				sizeKb: (row.Data_length + row.Index_length) / 1024,
			}));
		} finally {
			await directPool.end();
		}
	});
