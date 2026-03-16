import { drizzle } from "drizzle-orm/node-postgres";
import mysql from "mysql2/promise";
import { Pool } from "pg";
import * as schema from "./schema";

export const db = drizzle(
	new Pool({ connectionString: process.env.DATABASE_URL }),
	{ schema },
);

const POOL_CONFIG = {
	max: 10,
	idleTimeoutMillis: 30000,
} as const;

let appPool: Pool | null = null;
let sandboxAdminPool: Pool | null = null;
const mysqlPools = new Map<string, mysql.Pool>();
const mariadbPools = new Map<string, mysql.Pool>();

export function getAppPool(): Pool {
	if (!appPool) {
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) {
			throw new Error("DATABASE_URL environment variable is not set");
		}
		appPool = new Pool({
			connectionString: databaseUrl,
			...POOL_CONFIG,
		});
		appPool.on("error", (err) => {
			console.error("[AppPool] Unexpected error on idle client:", err);
		});
	}
	return appPool;
}

export function getSandboxAdminPool(): Pool {
	if (!sandboxAdminPool) {
		const sandboxUrl = process.env.POSTGRES_SANDBOX_URL;
		if (!sandboxUrl) {
			throw new Error("POSTGRES_SANDBOX_URL environment variable is not set");
		}
		sandboxAdminPool = new Pool({
			connectionString: sandboxUrl,
			...POOL_CONFIG,
		});
		sandboxAdminPool.on("error", (err) => {
			console.error("[SandboxAdminPool] Unexpected error on idle client:", err);
		});
	}
	return sandboxAdminPool;
}

export function getMysqlAdminPool(region: string): mysql.Pool {
	const key = `MYSQL_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);

	let pool = mysqlPools.get(key);
	if (!pool) {
		pool = mysql.createPool(url);
		mysqlPools.set(key, pool);
	}
	return pool;
}

export function getMariadbAdminPool(region: string): mysql.Pool {
	const key = `MARIADB_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);

	let pool = mariadbPools.get(key);
	if (!pool) {
		pool = mysql.createPool(url);
		mariadbPools.set(key, pool);
	}
	return pool;
}

export function createPgAdminPool(region: string) {
	const key = `POSTGRES_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);
	return new Pool({ connectionString: url });
}

export function createMysqlAdminPool(region: string) {
	const key = `MYSQL_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);
	return mysql.createPool(url);
}

export function createMariadbAdminPool(region: string) {
	const key = `MARIADB_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);
	return mysql.createPool(url);
}
