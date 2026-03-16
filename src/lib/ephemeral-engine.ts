import { Pool } from "pg";
import type { DatabaseEngine } from "#/lib/db-managers/interface";
import { getDbManager } from "#/lib/db-managers/interface";

const log = {
	info: (msg: string, data?: Record<string, unknown>) => {
		console.log(`[EphemeralEngine] ${msg}`, data ?? "");
	},
	error: (msg: string, data?: Record<string, unknown>) => {
		console.error(`[EphemeralEngine] ${msg}`, data ?? "");
	},
	debug: (msg: string, data?: Record<string, unknown>) => {
		console.log(`[EphemeralEngine] ${msg}`, data ?? "");
	},
};

const CLEANUP_INTERVAL_MS = 30 * 1000;
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

const ENGINE_ADMIN_URLS: Record<DatabaseEngine, string> = {
	postgresql: process.env.POSTGRES_SANDBOX_URL || "",
	mysql: process.env.MYSQL_SANDBOX_URL || "",
	mariadb: process.env.MARIADB_SANDBOX_URL || "",
};

let isRunning = false;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let lastHeartbeat: Date | null = null;
let started = false;

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
	await dbManager.terminateConnections(dbName);
	await dbManager.dropSandboxDatabase(dbName, dbUser);
}

async function cleanupExpiredSandboxes(): Promise<void> {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		const result = await pool.query(
			`SELECT id, engine, db_name, db_user, status 
			 FROM sandboxes 
			 WHERE status = 'active' AND expired_at <= NOW()`,
		);

		const expiredSandboxes = result.rows;

		if (expiredSandboxes.length > 0) {
			log.info("Found expired sandboxes", { count: expiredSandboxes.length });
		}

		for (const sandbox of expiredSandboxes) {
			try {
				log.info("Cleaning up sandbox", { dbName: sandbox.db_name });

				await pool.query(
					"UPDATE sandboxes SET status = 'destroying', updated_at = NOW() WHERE id = $1",
					[sandbox.id],
				);

				await dropSandboxDatabase(
					sandbox.engine as DatabaseEngine,
					sandbox.db_name,
					sandbox.db_user,
				);

				await pool.query(
					"UPDATE sandboxes SET status = 'expired', updated_at = NOW() WHERE id = $1",
					[sandbox.id],
				);

				log.info("Sandbox expired", { dbName: sandbox.db_name });
			} catch (error) {
				log.error("Failed to cleanup sandbox", {
					dbName: sandbox.db_name,
					error: error instanceof Error ? error.message : "Unknown error",
				});

				await pool.query(
					"UPDATE sandboxes SET status = 'expired', updated_at = NOW() WHERE id = $1",
					[sandbox.id],
				);
			}
		}
	} catch (error) {
		log.error("Cleanup error", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
	} finally {
		await pool.end();
	}
}

async function checkAndSendExpiryWarnings(): Promise<void> {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		const now = new Date();
		const warningThreshold = new Date(now.getTime() + 30 * 60 * 1000);

		const result = await pool.query(
			`SELECT id, user_id, display_name, expired_at 
			 FROM sandboxes 
			 WHERE status = 'active' 
			 AND expired_at > NOW() 
			 AND expired_at <= $1`,
			[warningThreshold],
		);

		const sandboxesToWarn = result.rows;

		for (const sandbox of sandboxesToWarn) {
			const existingResult = await pool.query(
				`SELECT id FROM notifications 
				 WHERE sandbox_id = $1 AND type = 'expiry_warning' 
				 AND created_at > NOW() - INTERVAL '30 minutes'`,
				[sandbox.id],
			);

			if (existingResult.rows.length > 0) {
				continue;
			}

			const minutesLeft = Math.round(
				(new Date(sandbox.expired_at).getTime() - now.getTime()) / 60000,
			);

			await pool.query(
				`INSERT INTO notifications (sandbox_id, user_id, type, message)
				 VALUES ($1, $2, 'expiry_warning', $3)`,
				[
					sandbox.id,
					sandbox.user_id,
					`Your sandbox "${sandbox.display_name}" will expire in ${minutesLeft} minutes`,
				],
			);

			log.info("Sent expiry warning", { sandboxId: sandbox.id });
		}
	} catch (error) {
		log.error("Expiry warning check failed", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
	} finally {
		await pool.end();
	}
}

function heartbeat(): void {
	lastHeartbeat = new Date();
	log.debug("Heartbeat", { timestamp: lastHeartbeat.toISOString() });
}

function ensureStarted(): void {
	if (started) return;
	started = true;
	startEphemeralEngine();
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

export function triggerCleanup(): void {
	ensureStarted();
	cleanupExpiredSandboxes().catch((err) =>
		log.error("Manual cleanup failed", err),
	);
}

export function triggerExpiryWarningCheck(): void {
	ensureStarted();
	checkAndSendExpiryWarnings().catch((err) =>
		log.error("Expiry warning check failed", err),
	);
}
