import { Pool } from "pg";

const EXPIRY_WARNING_MINUTES = 30;
const EXPIRY_WARNING_MS = EXPIRY_WARNING_MINUTES * 60 * 1000;

export async function checkAndSendExpiryWarnings(): Promise<number> {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		const now = new Date();
		const warningThreshold = new Date(now.getTime() + EXPIRY_WARNING_MS);

		const sandboxesResult = await pool.query(
			`SELECT id, user_id, display_name, expired_at, status
			 FROM sandboxes
			 WHERE status = 'active'
			 AND expired_at > NOW()
			 AND expired_at <= $1
			 LIMIT 10`,
			[warningThreshold],
		);

		const sandboxesToWarn = sandboxesResult.rows;

		if (sandboxesToWarn.length === 0) {
			return 0;
		}

		let notificationsCreated = 0;

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

			notificationsCreated++;
		}

		return notificationsCreated;
	} finally {
		await pool.end();
	}
}

export async function getUnreadNotifications(userId: string) {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		const result = await pool.query(
			`SELECT id, sandbox_id, type, message, created_at, read_at
			 FROM notifications
			 WHERE user_id = $1
			 ORDER BY created_at DESC
			 LIMIT 20`,
			[userId],
		);

		return result.rows.map((row) => ({
			id: row.id,
			sandboxId: row.sandbox_id,
			type: row.type,
			message: row.message,
			createdAt: row.created_at,
			readAt: row.read_at,
		}));
	} finally {
		await pool.end();
	}
}

export async function markNotificationAsRead(notificationId: string) {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		await pool.query("UPDATE notifications SET read_at = $1 WHERE id = $2", [
			new Date(),
			notificationId,
		]);
	} finally {
		await pool.end();
	}
}
