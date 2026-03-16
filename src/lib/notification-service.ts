import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "#/db";
import { notifications, sandboxes } from "#/db/schema";

const EXPIRY_WARNING_MINUTES = 30;
const EXPIRY_WARNING_MS = EXPIRY_WARNING_MINUTES * 60 * 1000;

export async function checkAndSendExpiryWarnings(): Promise<number> {
	const now = new Date();
	const warningThreshold = new Date(now.getTime() + EXPIRY_WARNING_MS);

	const sandboxesToWarn = await db
		.select({
			id: sandboxes.id,
			userId: sandboxes.userId,
			displayName: sandboxes.displayName,
			expiredAt: sandboxes.expiredAt,
		})
		.from(sandboxes)
		.where(
			and(
				eq(sandboxes.status, "active"),
				gt(sandboxes.expiredAt, now),
				lt(sandboxes.expiredAt, warningThreshold),
			),
		)
		.limit(10);

	if (sandboxesToWarn.length === 0) {
		return 0;
	}

	let notificationsCreated = 0;

	for (const sandbox of sandboxesToWarn) {
		const existingNotification = await db
			.select({ id: notifications.id })
			.from(notifications)
			.where(
				and(
					eq(notifications.sandboxId, sandbox.id),
					eq(notifications.type, "expiry_warning"),
				),
			)
			.limit(1);

		if (existingNotification.length > 0) {
			continue;
		}

		const minutesLeft = Math.round(
			(sandbox.expiredAt.getTime() - now.getTime()) / 60000,
		);

		await db.insert(notifications).values({
			sandboxId: sandbox.id,
			userId: sandbox.userId,
			type: "expiry_warning",
			message: `Your sandbox "${sandbox.displayName}" will expire in ${minutesLeft} minutes`,
		});

		notificationsCreated++;
	}

	return notificationsCreated;
}

export async function getUnreadNotifications(userId: string) {
	return db
		.select({
			id: notifications.id,
			sandboxId: notifications.sandboxId,
			type: notifications.type,
			message: notifications.message,
			createdAt: notifications.createdAt,
			readAt: notifications.readAt,
		})
		.from(notifications)
		.where(eq(notifications.userId, userId))
		.orderBy(sql`${notifications.createdAt} DESC`)
		.limit(20);
}

export async function markNotificationAsRead(notificationId: string) {
	await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(eq(notifications.id, notificationId));
}
