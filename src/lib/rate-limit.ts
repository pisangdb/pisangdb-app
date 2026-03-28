/**
 * Simple in-memory rate limiter for AI requests.
 * PRD spec: 30 AI requests per user per month.
 *
 * For production with multiple instances, use Redis instead.
 */

const AI_MONTHLY_LIMIT = 30;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

interface RateLimitEntry {
	count: number;
	windowStart: number;
}

const aiRateLimitMap = new Map<string, RateLimitEntry>();

function getDateKey(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getRateLimitKey(userId: string): string {
	return `ai:${userId}:${getDateKey()}`;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: Date;
}

export function checkAiRateLimit(userId: string): RateLimitResult {
	const key = getRateLimitKey(userId);
	const now = Date.now();
	const entry = aiRateLimitMap.get(key);

	// Clean up if window has passed or no entry
	if (!entry || now - entry.windowStart >= WINDOW_MS) {
		const newEntry = { count: 0, windowStart: now };
		aiRateLimitMap.set(key, newEntry);
		return {
			allowed: true,
			remaining: AI_MONTHLY_LIMIT,
			resetAt: new Date(now + WINDOW_MS),
		};
	}

	if (entry.count >= AI_MONTHLY_LIMIT) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: new Date(entry.windowStart + WINDOW_MS),
		};
	}

	return {
		allowed: true,
		remaining: AI_MONTHLY_LIMIT - entry.count,
		resetAt: new Date(entry.windowStart + WINDOW_MS),
	};
}

export function recordAiRequest(userId: string): void {
	const key = getRateLimitKey(userId);
	const now = Date.now();
	const entry = aiRateLimitMap.get(key);

	if (!entry || now - entry.windowStart >= WINDOW_MS) {
		// Start new window
		aiRateLimitMap.set(key, { count: 1, windowStart: now });
	} else {
		// Increment existing window
		entry.count++;
		aiRateLimitMap.set(key, entry);
	}
}

export function getAiRateLimitRemaining(userId: string): number {
	const key = getRateLimitKey(userId);
	const entry = aiRateLimitMap.get(key);
	if (!entry) return AI_MONTHLY_LIMIT;
	return Math.max(0, AI_MONTHLY_LIMIT - entry.count);
}
