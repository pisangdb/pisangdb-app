const EXPIRING_SOON_THRESHOLD_SECONDS = 30 * 60; // 30 minutes

export function formatTtl(seconds: number): string {
	if (seconds <= 0) return "Expired";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) return `${h}h ${m}m left`;
	if (m > 0) return `${m}m ${s}s left`;
	return `${s}s left`;
}

export function isExpiringSoon(seconds: number): boolean {
	return seconds > 0 && seconds <= EXPIRING_SOON_THRESHOLD_SECONDS;
}
