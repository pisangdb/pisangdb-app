import { and, eq, lte, or } from "drizzle-orm";
import { db } from "#/db";
import { sandboxes } from "#/db/schema";
import type { DbEngine } from "#/lib/types";

const CLEANUP_INTERVAL_MS = 30_000;
const GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRY_AGE_MS = 60 * 60 * 1000; // 1 hour max for retry

let isRunning = false;

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
		console.error("[EphemeralEngine] Error during cleanup:", error);
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

	cleanupExpiredSandboxes();

	const intervalId = setInterval(cleanupExpiredSandboxes, CLEANUP_INTERVAL_MS);

	return () => {
		console.log("[EphemeralEngine] Stopping ephemeral engine...");
		clearInterval(intervalId);
	};
}
