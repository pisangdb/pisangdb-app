import { and, eq, lte, or } from "drizzle-orm";
import { db } from "#/db";
import { sandboxes } from "#/db/schema";
import type { DbEngine } from "#/lib/types";

const CLEANUP_INTERVAL_MS = 30_000;
const GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRY_AGE_MS = 60 * 60 * 1000; // 1 hour max for retry
const DB_READY_TIMEOUT_MS = 60_000; // 1 minute max to wait for DB

let isRunning = false;

async function waitForDatabase(maxWaitMs: number): Promise<boolean> {
	const startTime = Date.now();
	while (Date.now() - startTime < maxWaitMs) {
		try {
			// Simple query to check if database is accessible
			await db.select({ count: sandboxes.id }).from(sandboxes).limit(1);
			return true;
		} catch {
			console.warn(
				`[EphemeralEngine] Database not ready yet, waiting... (${Math.round((Date.now() - startTime) / 1000)}s)`,
			);
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}
	return false;
}

async function cleanupExpiredSandboxes(): Promise<void> {
	if (isRunning) {
		return;
	}
	isRunning = true;

	try {
		const now = new Date();
		const gracePeriodDeadline = new Date(now.getTime() - GRACE_PERIOD_MS);
		const retryDeadline = new Date(now.getTime() - MAX_RETRY_AGE_MS);

		const expiredSandboxes = await db
			.select()
			.from(sandboxes)
			.where(
				or(
					and(
						eq(sandboxes.status, "active"),
						lte(sandboxes.expiredAt, gracePeriodDeadline),
					),
					and(
						eq(sandboxes.status, "destroying"),
						lte(sandboxes.updatedAt, retryDeadline),
					),
				),
			);

		if (expiredSandboxes.length === 0) {
			return;
		}

		console.log(
			`[EphemeralEngine] Found ${expiredSandboxes.length} sandbox(es) to clean up`,
		);

		for (const sandbox of expiredSandboxes) {
			await cleanupSandbox(sandbox);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorCode =
			error instanceof Error && "code" in error
				? (error as { code: string }).code
				: undefined;
		console.error(
			`[EphemeralEngine] Error during cleanup: ${errorMessage}${errorCode ? ` (code: ${errorCode})` : ""}`,
		);
		if (error instanceof Error && error.stack) {
			console.error(error.stack);
		}
	} finally {
		isRunning = false;
	}
}

async function cleanupSandbox(
	sandbox: typeof sandboxes.$inferSelect,
): Promise<void> {
	const sandboxId = sandbox.id.toString();
	const dbName = sandbox.dbName;
	const dbUser = sandbox.dbUser;
	const engine = sandbox.engine as DbEngine;
	const region = sandbox.region;

	console.log(
		`[EphemeralEngine] Cleaning up sandbox ${sandboxId} (${engine}:${dbName})`,
	);

	await db
		.update(sandboxes)
		.set({ status: "destroying", updatedAt: new Date() })
		.where(eq(sandboxes.id, sandbox.id));

	let cleanupError: Error | null = null;

	try {
		const {
			getAdminPool,
			deprovisionPostgreSQL,
			deprovisionMySQL,
			deprovisionMariaDB,
		} = await import("#/lib/sandbox-provisioning");
		const adminPool = getAdminPool(engine, region);

		if (engine === "postgresql") {
			await deprovisionPostgreSQL(adminPool, dbName, dbUser, region);
		} else if (engine === "mysql") {
			await deprovisionMySQL(adminPool, dbName, dbUser);
		} else if (engine === "mariadb") {
			await deprovisionMariaDB(adminPool, dbName, dbUser);
		}
	} catch (error) {
		cleanupError = error instanceof Error ? error : new Error(String(error));
		console.error(
			`[EphemeralEngine] Failed to cleanup sandbox ${sandboxId}:`,
			cleanupError,
		);
	}

	await db
		.update(sandboxes)
		.set({ status: "expired", updatedAt: new Date() })
		.where(eq(sandboxes.id, sandbox.id));

	if (cleanupError) {
		console.error(
			`[EphemeralEngine] Sandbox ${sandboxId} marked as expired but cleanup had errors`,
		);
	} else {
		console.log(
			`[EphemeralEngine] Successfully cleaned up sandbox ${sandboxId}`,
		);
	}
}

export function startEphemeralEngine(): () => void {
	console.log("[EphemeralEngine] Starting ephemeral engine...");

	// Start initialization in background but don't block
	const initDbReady = waitForDatabase(DB_READY_TIMEOUT_MS)
		.then((dbReady) => {
			if (!dbReady) {
				console.error(
					`[EphemeralEngine] Database not ready after ${DB_READY_TIMEOUT_MS}ms, cleanup will run anyway`,
				);
			} else {
				console.log("[EphemeralEngine] Database is ready");
			}
			return dbReady;
		})
		.catch((error) => {
			console.error("[EphemeralEngine] Error waiting for database:", error);
			return false;
		});

	import("#/lib/template-seeding")
		.then(({ ensureBuiltinTemplatesSeeded }) => ensureBuiltinTemplatesSeeded())
		.then(() => {
			console.log("[EphemeralEngine] Built-in templates are ready");
		})
		.catch((error) => {
			console.error(
				"[EphemeralEngine] Failed to seed built-in templates:",
				error,
			);
		});

	// Initial cleanup - wait for DB ready first if still initializing
	initDbReady.then(() => {
		cleanupExpiredSandboxes();
	});

	// Then run cleanup on interval
	const intervalId = setInterval(async () => {
		// Ensure DB is ready before each cleanup cycle
		const dbReady = await waitForDatabase(5000).catch(() => false);
		if (dbReady) {
			await cleanupExpiredSandboxes();
		} else {
			console.warn(
				"[EphemeralEngine] Skipping cleanup cycle - database not ready",
			);
		}
	}, CLEANUP_INTERVAL_MS);

	return () => {
		console.log("[EphemeralEngine] Stopping ephemeral engine...");
		clearInterval(intervalId);
	};
}
