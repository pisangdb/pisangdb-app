import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { Pool } from "pg";
import { getDbManager } from "#/lib/db-managers/interface";
import type {
	CreateSandboxInput,
	DashboardStats,
	ExtendSandboxInput,
	SandboxDetail,
	SandboxListItem,
	SandboxTable,
} from "#/lib/types";
import {
	createSandboxSchema,
	extendSandboxSchema,
	sandboxIdSchema,
} from "./schema";

const ENGINE_PORTS: Record<string, number> = {
	postgresql: 5432,
	mysql: 3306,
	mariadb: 3307,
};

const MAX_ACTIVE_SANDBOXES = 5;
const MAX_LIFETIME_HOURS = 168;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function generateRandomString(length: number): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

function generateDbName(displayName: string, userId: string): string {
	const shortId = userId.slice(0, 4);
	const sanitized = displayName
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "_")
		.slice(0, 20);
	const suffix = generateRandomString(6);
	return `pisang_${shortId}_${sanitized}_${suffix}`;
}

function generateDbUser(): string {
	return `sb_${generateRandomString(8)}`;
}

function generateDbPassword(): string {
	return randomBytes(24).toString("base64url").slice(0, 32);
}

async function getCurrentUser(): Promise<{ id: string; role: string }> {
	const request = getRequest();
	const session = await import("#/lib/auth").then((m) =>
		m.auth.api.getSession({ headers: request.headers }),
	);

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	return { id: session.user.id, role: session.user.role ?? "user" };
}

function getAdminUrl(engine: string, region: string): string {
	const key = `${engine.toUpperCase()}_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) {
		throw new Error(`${key} environment variable is not set`);
	}
	return url;
}

function rowToSandboxDetail(row: Record<string, unknown>): SandboxDetail {
	return {
		id: row.id as string,
		displayName: row.display_name as string,
		engine: row.engine as SandboxDetail["engine"],
		region: row.region as SandboxDetail["region"],
		status: row.status as SandboxDetail["status"],
		host: row.host as string,
		port: row.port as number,
		dbName: row.db_name as string,
		dbUser: row.db_user as string,
		dbPassword: row.db_password as string,
		connectionUrl: row.connection_url as string,
		sizeMb: 0,
		maxSizeMb: row.max_size_mb as number,
		createdAt: (row.created_at as Date).toISOString(),
		expiredAt: (row.expired_at as Date).toISOString(),
	};
}

function rowToSandboxListItem(row: Record<string, unknown>): SandboxListItem {
	const detail = rowToSandboxDetail(row);
	const { dbPassword: _, ...listItem } = detail;
	return listItem;
}

export const $getDashboardStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardStats> => {
		const user = await getCurrentUser();

		const result = await pool.query(
			`
			SELECT 
				COUNT(*) FILTER (WHERE status = 'active') as active_count,
				COUNT(*) as total_count,
				COUNT(*) FILTER (WHERE status = 'expired') as expired_count
			FROM sandboxes WHERE user_id = $1
			`,
			[user.id],
		);

		const row = result.rows[0];
		const activeCount = Number(row.active_count) || 0;
		const totalCount = Number(row.total_count) || 0;
		const expiredCount = Number(row.expired_count) || 0;

		const aiResult = await pool.query(
			"SELECT COUNT(*) as count FROM ai_logs WHERE user_id = $1",
			[user.id],
		);

		return {
			activeSandboxes: activeCount,
			totalCreated: totalCount,
			autoCleaned: expiredCount,
			aiQueriesThisMonth: Number(aiResult.rows[0].count) || 0,
		};
	},
);

export const $getSandboxes = createServerFn({ method: "GET" }).handler(
	async (): Promise<SandboxListItem[]> => {
		const user = await getCurrentUser();

		const result = await pool.query(
			"SELECT * FROM sandboxes WHERE user_id = $1 ORDER BY created_at DESC",
			[user.id],
		);

		return result.rows.map(rowToSandboxListItem);
	},
);

export const $getSandboxById = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const user = await getCurrentUser();

		const result = await pool.query(
			"SELECT * FROM sandboxes WHERE id = $1 LIMIT 1",
			[data.sandboxId],
		);

		const sandbox = result.rows[0];

		if (!sandbox || sandbox.user_id !== user.id) {
			throw new Error("Sandbox not found");
		}

		return rowToSandboxDetail(sandbox);
	});

export const $createSandbox = createServerFn({ method: "POST" })
	.inputValidator(createSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const user = await getCurrentUser();
		const input = data as CreateSandboxInput;

		const countResult = await pool.query(
			"SELECT COUNT(*) as count FROM sandboxes WHERE user_id = $1 AND status = 'active'",
			[user.id],
		);

		const activeCount = Number(countResult.rows[0].count) || 0;

		if (activeCount >= MAX_ACTIVE_SANDBOXES) {
			throw new Error(
				`Maximum ${MAX_ACTIVE_SANDBOXES} active sandboxes allowed`,
			);
		}

		const dbName = generateDbName(input.displayName, user.id);
		const dbUser = generateDbUser();
		const dbPassword = generateDbPassword();
		const port = ENGINE_PORTS[input.engine];
		const host = `${input.region}.pisangdb.com`;

		const proto = input.engine === "postgresql" ? "postgresql" : "mysql";
		const connectionUrl = `${proto}://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;

		const adminUrl = getAdminUrl(input.engine, input.region);
		const manager = await getDbManager(
			input.engine as "postgresql" | "mysql" | "mariadb",
			adminUrl,
		);

		await manager.createSandboxDatabase({
			dbName,
			dbUser,
			dbPassword,
			host,
			port,
		});

		const now = new Date();
		const expiredAt = new Date(
			now.getTime() + input.retentionHours * 60 * 60 * 1000,
		);

		const result = await pool.query(
			`
			INSERT INTO sandboxes 
				(user_id, engine, region, db_name, db_user, db_password, connection_url, host, port, display_name, status, template_id, expired_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			RETURNING *
			`,
			[
				user.id,
				input.engine,
				input.region,
				dbName,
				dbUser,
				dbPassword,
				connectionUrl,
				host,
				port,
				input.displayName,
				"active",
				input.templateId ?? null,
				expiredAt,
			],
		);

		const sandbox = result.rows[0];

		if (!sandbox) {
			throw new Error("Failed to create sandbox");
		}

		return rowToSandboxDetail(sandbox);
	});

export const $extendSandbox = createServerFn({ method: "POST" })
	.inputValidator(extendSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const user = await getCurrentUser();
		const input = data as ExtendSandboxInput;

		const result = await pool.query(
			"SELECT * FROM sandboxes WHERE id = $1 LIMIT 1",
			[input.sandboxId],
		);

		const sandbox = result.rows[0];

		if (!sandbox || sandbox.user_id !== user.id) {
			throw new Error("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			throw new Error("Can only extend active sandboxes");
		}

		const createdTime = (sandbox.created_at as Date).getTime();
		const maxExpiry = new Date(
			createdTime + MAX_LIFETIME_HOURS * 60 * 60 * 1000,
		);
		const newExpiry = new Date(
			(sandbox.expired_at as Date).getTime() +
				input.additionalHours * 60 * 60 * 1000,
		);

		if (newExpiry > maxExpiry) {
			throw new Error(
				`Maximum lifetime is ${MAX_LIFETIME_HOURS} hours from creation`,
			);
		}

		const updateResult = await pool.query(
			"UPDATE sandboxes SET expired_at = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
			[newExpiry, input.sandboxId],
		);

		const updated = updateResult.rows[0];

		if (!updated) {
			throw new Error("Failed to extend sandbox");
		}

		return rowToSandboxDetail(updated);
	});

export const $deleteSandbox = createServerFn({ method: "POST" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<void> => {
		const user = await getCurrentUser();

		const result = await pool.query(
			"SELECT * FROM sandboxes WHERE id = $1 LIMIT 1",
			[data.sandboxId],
		);

		const sandbox = result.rows[0];

		if (!sandbox || sandbox.user_id !== user.id) {
			throw new Error("Sandbox not found");
		}

		await pool.query(
			"UPDATE sandboxes SET status = 'destroying', updated_at = NOW() WHERE id = $1",
			[data.sandboxId],
		);

		try {
			const adminUrl = getAdminUrl(
				sandbox.engine as string,
				sandbox.region as string,
			);
			const manager = await getDbManager(
				sandbox.engine as "postgresql" | "mysql" | "mariadb",
				adminUrl,
			);

			await manager.terminateConnections(sandbox.db_name as string);
			await manager.dropSandboxDatabase(
				sandbox.db_name as string,
				sandbox.db_user as string,
			);
		} catch (error) {
			console.error("Error dropping sandbox database:", error);
		}

		await pool.query(
			"UPDATE sandboxes SET status = 'expired', updated_at = NOW() WHERE id = $1",
			[data.sandboxId],
		);
	});

export const $getSandboxTables = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxTable[]> => {
		const user = await getCurrentUser();

		const result = await pool.query(
			"SELECT * FROM sandboxes WHERE id = $1 LIMIT 1",
			[data.sandboxId],
		);

		const sandbox = result.rows[0];

		if (!sandbox || sandbox.user_id !== user.id) {
			throw new Error("Sandbox not found");
		}

		if (sandbox.status !== "active") {
			return [];
		}

		return [];
	});
