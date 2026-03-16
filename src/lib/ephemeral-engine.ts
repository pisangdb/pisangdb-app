import { and, eq, lte } from "drizzle-orm";
import { db } from "#/db";
import { sandboxes } from "#/db/schema";
import type { DatabaseEngine } from "#/lib/db-managers/interface";
import { getDbManager } from "#/lib/db-managers/interface";
import { createLogger } from "#/lib/logger";
import { checkAndSendExpiryWarnings } from "#/lib/notification-service";

const log = createLogger("EphemeralEngine");

const CLEANUP_INTERVAL_MS = 30 * 1000;

/** Engine-specific admin URLs for provisioning */
const ENGINE_ADMIN_URLS: Record<DatabaseEngine, string> = {
	postgresql: process.env.POSTGRES_SANDBOX_URL || "",
	mysql: process.env.MYSQL_SANDBOX_URL || "",
	mariadb: process.env.MARIADB_SANDBOX_URL || "",
};
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

let isRunning = false;
let cleanupInterval: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let lastHeartbeat: Date | null = null;

async function dropSandboxDatabase(
	engine: DatabaseEngine,
	dbName: string,
	dbUser: string,
): Promise<void> {
	const adminUrl = ENGINE_ADMIN_URLS[engine];
	if (!adminUrl) {
		log.error("No admin URL configured for engine", { engine });
		throw new Error(`No admin URL configured for engine: ${engine}`);
	}

	const dbManager = await getDbManager(engine, adminUrl);
	await dbManager.dropSandboxDatabase(dbName, dbUser);
}

async function cleanupExpiredSandboxes(): Promise<void> {
	try {
		const now = new Date();
		const expiredSandboxes = await db
			.select()
			.from(sandboxes)
			.where(
				and(eq(sandboxes.status, "active"), lte(sandboxes.expiredAt, now)),
			);

		if (expiredSandboxes.length > 0) {
			log.info("Found expired sandboxes", { count: expiredSandboxes.length });
		}

		for (const sandbox of expiredSandboxes) {
			try {
				log.info("Cleaning up sandbox", { dbName: sandbox.dbName });

				await db
					.update(sandboxes)
					.set({ status: "destroying", updatedAt: new Date() })
					.where(eq(sandboxes.id, sandbox.id));

				await dropSandboxDatabase(
					sandbox.engine as DatabaseEngine,
					sandbox.dbName,
					sandbox.dbUser,
				);

				await db
					.update(sandboxes)
					.set({ status: "expired", updatedAt: new Date() })
					.where(eq(sandboxes.id, sandbox.id));

				log.info("Sandbox expired", { dbName: sandbox.dbName });
			} catch (error) {
				log.error("Failed to cleanup sandbox", {
					dbName: sandbox.dbName,
					error,
				});
				await db
					.update(sandboxes)
					.set({ status: "expired", updatedAt: new Date() })
					.where(eq(sandboxes.id, sandbox.id));
			}
		}
	} catch (error) {
		log.error("Cleanup error", { error });
	}
}

function heartbeat(): void {
	lastHeartbeat = new Date();
	log.debug("Heartbeat", { timestamp: lastHeartbeat.toISOString() });
}

export function startEphemeralEngine(): void {
	if (isRunning) return;
	isRunning = true;

	log.info("Ephemeral engine started (server-side)");

	cleanupInterval = setInterval(cleanupExpiredSandboxes, CLEANUP_INTERVAL_MS);
	heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

	heartbeat();
	cleanupExpiredSandboxes();
	checkAndSendExpiryWarnings().catch((err) =>
		log.error("Expiry warning check failed", err),
	);
}

export function stopEphemeralEngine(): void {
	if (!isRunning) return;
	isRunning = false;

	if (cleanupInterval) {
		clearInterval(cleanupInterval);
		cleanupInterval = null;
	}

	if (heartbeatInterval) {
		clearInterval(heartbeatInterval);
		heartbeatInterval = null;
	}

	log.info("Ephemeral engine stopped");
}

export function getLastHeartbeat(): Date | null {
	return lastHeartbeat;
}
