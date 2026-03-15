import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const POOL_CONFIG = {
	max: 10, // PRD §15.4
	idleTimeoutMillis: 30000,
} as const;

let appPool: Pool | null = null;
let sandboxAdminPool: Pool | null = null;

/**
 * Get the application database pool (singleton)
 * Used for: users, sandboxes metadata, AI logs, query history
 */
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

/**
 * Get the sandbox admin pool (singleton)
 * Used for: provisioning PostgreSQL sandboxes (CREATE DATABASE, CREATE USER)
 * Must have superuser privileges
 */
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

/**
 * Drizzle ORM instance for the application database
 * Use this for type-safe queries on app metadata
 */
export const db = drizzle(getAppPool(), { schema });

/**
 * Get a Drizzle instance for the application database
 * Convenience function for explicit database access
 */
export function getAppDb() {
	return drizzle(getAppPool(), { schema });
}

/**
 * Get a raw pg Pool for sandbox admin operations
 * Use this for: CREATE DATABASE, CREATE USER, DROP DATABASE, DROP USER
 */
export function getSandboxAdminDb() {
	return getSandboxAdminPool();
}

/**
 * Close all database connections gracefully
 * Call this during application shutdown
 */
export async function closeConnections(): Promise<void> {
	const closePromises: Promise<void>[] = [];

	if (appPool) {
		closePromises.push(appPool.end());
		appPool = null;
	}

	if (sandboxAdminPool) {
		closePromises.push(sandboxAdminPool.end());
		sandboxAdminPool = null;
	}

	await Promise.all(closePromises);
}

export type { Pool } from "pg";
