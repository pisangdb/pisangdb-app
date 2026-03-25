import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import type { Pool as MySqlPool } from "mysql2/promise";
import type { Pool } from "pg";
import {
	type DashboardStats,
	type DbEngine,
	type DbRegion,
	DEFAULT_TIER,
	type SandboxDetail,
	type SandboxListItem,
	type SandboxStatus,
	type SandboxTable,
	TIER_LIMITS,
} from "#/lib/types";
import {
	createSandboxSchema,
	extendSandboxSchema,
	sandboxIdSchema,
} from "./schema";

async function getSandboxesServerContext() {
	const [{ db }, schema, { auth }] = await Promise.all([
		import("#/db"),
		import("#/db/schema"),
		import("#/lib/auth"),
	]);

	return {
		auth,
		db,
		sandboxes: schema.sandboxes,
		templates: schema.templates,
	};
}

export const $getDashboardStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardStats> => {
		const { auth, db, sandboxes } = await getSandboxesServerContext();
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

		const tier = DEFAULT_TIER;
		const maxSandboxes = TIER_LIMITS[tier];

		return {
			activeSandboxes: activeResult?.count ?? 0,
			totalCreated: totalResult?.count ?? 0,
			autoCleaned: expiredResult?.count ?? 0,
			aiQueriesThisMonth: 0,
			tier,
			maxSandboxes,
		};
	},
);

async function getDatabaseNow(): Promise<Date> {
	const { db } = await getSandboxesServerContext();
	const result =
		await db.execute(sql<{ now: Date | string }>`select now() as now`);
	const currentTime = result.rows[0]?.now;

	const parsedTime =
		currentTime instanceof Date ? currentTime : new Date(currentTime);

	if (Number.isNaN(parsedTime.getTime())) {
		throw new Error("Failed to read current database time.");
	}

	return parsedTime;
}

export const $getSandboxes = createServerFn({ method: "GET" }).handler(
	async (): Promise<SandboxListItem[]> => {
		const { auth, db, sandboxes } = await getSandboxesServerContext();
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
			// Avoid per-sandbox admin DB queries on list page.
			sizeMb: 0,
			createdAt: row.createdAt.toISOString(),
			expiredAt: row.expiredAt.toISOString(),
		}));
	},
);

export const $getSandboxById = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const { auth, db, sandboxes } = await getSandboxesServerContext();
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

// ─── $createSandbox ───────────────────────────────────────────────────────

export const $createSandbox = createServerFn({ method: "POST" })
	.inputValidator(createSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const { auth, db, sandboxes, templates } =
			await getSandboxesServerContext();
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const userId = session.user.id;

		const maxActive = TIER_LIMITS[DEFAULT_TIER];
		const [activeResult] = await db
			.select({ count: count() })
			.from(sandboxes)
			.where(and(eq(sandboxes.userId, userId), eq(sandboxes.status, "active")));

		if ((activeResult?.count ?? 0) >= maxActive) {
			throw new Error(`Maximum of ${maxActive} active sandboxes allowed`);
		}

		const { dbName, dbUser, dbPassword, host, port, connectionUrl } = (
			await import("#/lib/sandbox-provisioning")
		).generateSandboxCredentials(
			userId,
			data.displayName,
			data.engine as DbEngine,
		);

		const engine = data.engine as DbEngine;
		const {
			getAdminPool,
			provisionMariaDB,
			provisionMySQL,
			provisionPostgreSQL,
			deprovisionMariaDB,
			deprovisionMySQL,
			deprovisionPostgreSQL,
		} = await import("#/lib/sandbox-provisioning");
		const adminPool = getAdminPool(engine, data.region);

		try {
			if (data.engine === "postgresql") {
				await provisionPostgreSQL(adminPool, dbName, dbUser, dbPassword);
			} else if (data.engine === "mysql") {
				await provisionMySQL(adminPool, dbName, dbUser, dbPassword);
			} else {
				await provisionMariaDB(adminPool, dbName, dbUser, dbPassword);
			}

			// Execute template SQL if provided
			let templateId: string | null = null;
			if (data.templateId) {
				const [template] = await db
					.select()
					.from(templates)
					.where(
						and(
							eq(templates.id, data.templateId),
							eq(templates.engine, data.engine),
						),
					)
					.limit(1);

				if (template) {
					templateId = template.id;
					await (await import("./template-helper")).executeTemplateSql(
						engine,
						data.region,
						dbName,
						dbUser,
						dbPassword,
						template.ddlSql,
						template.seedSql,
					);
				}
			}

			const databaseNow = await getDatabaseNow();
			const expiredAt = new Date(
				databaseNow.getTime() + data.retentionHours * 60 * 60 * 1000,
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
					templateId,
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
			try {
				if (data.engine === "postgresql") {
					await deprovisionPostgreSQL(adminPool, dbName, dbUser, data.region);
				} else if (data.engine === "mysql") {
					await deprovisionMySQL(adminPool, dbName, dbUser);
				} else {
					await deprovisionMariaDB(adminPool, dbName, dbUser);
				}
			} catch (cleanupError) {
				console.error("Failed to cleanup partial sandbox:", cleanupError);
			}
			throw err instanceof Error ? err : new Error("Failed to create sandbox");
		}
	});

// ─── $extendSandbox ───────────────────────────────────────────────────────

export const $extendSandbox = createServerFn({ method: "POST" })
	.inputValidator(extendSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const { auth, db, sandboxes } = await getSandboxesServerContext();
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
		const { auth, db, sandboxes } = await getSandboxesServerContext();
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

		const engine = sandbox.engine as DbEngine;
		const {
			getAdminPool,
			deprovisionMariaDB,
			deprovisionMySQL,
			deprovisionPostgreSQL,
		} = await import("#/lib/sandbox-provisioning");
		const adminPool = getAdminPool(engine, sandbox.region);

		try {
			if (sandbox.engine === "postgresql") {
				await deprovisionPostgreSQL(
					adminPool,
					sandbox.dbName,
					sandbox.dbUser,
					sandbox.region,
				);
			} else if (sandbox.engine === "mysql") {
				await deprovisionMySQL(adminPool, sandbox.dbName, sandbox.dbUser);
			} else {
				await deprovisionMariaDB(adminPool, sandbox.dbName, sandbox.dbUser);
			}
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
	const { getAdminPool } = await import("#/lib/sandbox-provisioning");
	const adminPool = getAdminPool(engine, region);
	try {
		if (engine === "postgresql") {
			const pool = adminPool as Pool;
			const result = await pool.query<{ pg_database_size: string }>(
				`SELECT pg_database_size($1) AS pg_database_size`,
				[dbName],
			);
			const bytes = parseInt(result.rows[0]?.pg_database_size ?? "0", 10);
			return Math.round(bytes / (1024 * 1024));
		} else {
			const pool = adminPool as MySqlPool;
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
			return Math.round(
				result[0]?.[
					"ROUND(SUM(Data_length + Index_length) / 1024 / 1024, 2)"
				] ?? 0,
			);
		}
	} catch {
		return 0;
	} finally {
		if ("end" in adminPool && typeof adminPool.end === "function") {
			await adminPool.end();
		}
	}
}

// ─── $getSandboxTables ────────────────────────────────────────────────────

export const $getSandboxTables = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxTable[]> => {
		const { auth, db, sandboxes } = await getSandboxesServerContext();
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

		try {
			let tables: SandboxTable[] = [];
			const engine = sandbox.engine as DbEngine;

			if (sandbox.engine === "postgresql") {
				const [{ Pool: PgPool }, { getSandboxPort }] = await Promise.all([
					import("pg"),
					import("#/lib/sandbox-provisioning"),
				]);
				const { host, port } = {
					host: process.env.SANDBOX_HOST ?? sandbox.host,
					port: getSandboxPort(engine, sandbox.region),
				};
				const sandboxPool = new PgPool({
					host,
					port,
					database: sandbox.dbName,
					user: sandbox.dbUser,
					password: sandbox.dbPassword,
					max: 5,
				});
				const result = await sandboxPool.query<{
					tablename: string;
				}>(
					`SELECT tablename
					FROM pg_catalog.pg_tables
					WHERE schemaname = 'public'
					ORDER BY tablename`,
				);

				for (const row of result.rows) {
					const tableName = row.tablename;
					const countResult = await sandboxPool.query<{
						row_count: bigint;
						size_kb: bigint;
					}>(
						`SELECT
							(SELECT count(*) FROM "${tableName}") as row_count,
							coalesce(pg_table_size($1::regclass), 0) as size_kb
						`,
						[tableName],
					);
					const rowCount = Number(countResult.rows[0]?.row_count ?? 0);
					const sizeKb = Math.round(
						Number(countResult.rows[0]?.size_kb ?? 0) / 1024,
					);
					tables.push({
						name: tableName,
						rows: rowCount,
						sizeKb,
					});
				}
				await sandboxPool.end();
			} else {
				const pool = getAdminPool(engine, sandbox.region) as MySqlPool;
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
			return [];
		}
	});
