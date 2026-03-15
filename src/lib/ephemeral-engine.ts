import { and, eq, lte } from "drizzle-orm";
import { db, getSandboxAdminDb } from "#/db";
import { sandboxes } from "#/db/schema";
import { createLogger } from "#/lib/logger";

const log = createLogger("EphemeralEngine");

const CLEANUP_INTERVAL_MS = 30 * 1000;
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

let isRunning = false;
let cleanupInterval: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let lastHeartbeat: Date | null = null;

async function dropSandboxDatabase(
	dbName: string,
	dbUser: string,
): Promise<void> {
	const adminPool = getSandboxAdminDb();
	const client = await adminPool.connect();
	try {
		await client.query(
			"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1",
			[dbName],
		);
		await client.query(`DROP DATABASE IF EXISTS "${dbName}"`, []);
		await client.query(`DROP USER IF EXISTS "${dbUser}"`, []);
	} finally {
		client.release();
	}
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

				await dropSandboxDatabase(sandbox.dbName, sandbox.dbUser);

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
