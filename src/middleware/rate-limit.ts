/**
 * Rate Limiting Middleware for PisangDB
 *
 * Implements in-memory rate limiting with sliding window algorithm.
 * Per PRD §12.4:
 * - Login: 5 requests / 15 min / IP
 * - Register: 3 requests / hour / IP
 * - Create Sandbox: 10 requests / hour / user
 * - SQL Query: 60 requests / min / user
 * - AI Generate: 30 requests / day / user
 *
 * @module middleware/rate-limit
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Rate limit entry stored in memory
 */
interface RateLimitEntry {
	/** Number of requests made in current window */
	count: number;
	/** Timestamp when the window resets (milliseconds) */
	resetTime: number;
}

/**
 * Configuration options for rate limiting
 */
export interface RateLimitOptions {
	/** Time window in milliseconds */
	windowMs: number;
	/** Maximum requests allowed per window */
	maxRequests: number;
	/** Function to generate a unique key for the client (IP or user ID) */
	keyGenerator: (request: Request) => string | Promise<string>;
	/** Custom error message when rate limit exceeded */
	message?: string;
	/** Whether to skip rate limiting (useful for health checks) */
	skip?: (request: Request) => boolean | Promise<boolean>;
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
	/** Whether the request is allowed */
	success: boolean;
	/** Maximum requests allowed */
	limit: number;
	/** Remaining requests in current window */
	remaining: number;
	/** Timestamp when the window resets (Unix seconds) */
	resetTime: number;
	/** Seconds until the window resets */
	retryAfter: number;
}

/**
 * Rate limit headers to include in responses
 */
export interface RateLimitHeaders {
	"X-RateLimit-Limit": string;
	"X-RateLimit-Remaining": string;
	"X-RateLimit-Reset": string;
}

// ============================================================================
// In-Memory Store
// ============================================================================

/**
 * In-memory store for rate limit entries
 * Key: client identifier (IP or user ID)
 * Value: rate limit entry with count and reset time
 */
const store = new Map<string, RateLimitEntry>();

/**
 * Cleanup interval in milliseconds (5 minutes)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Start periodic cleanup of expired entries
 * This prevents memory leaks from accumulating stale entries
 */
function startCleanup(): void {
	setInterval(() => {
		const now = Date.now();
		let cleaned = 0;

		// Use Array.from to avoid downlevelIteration issues
		const entries = Array.from(store.entries());
		for (const [key, entry] of entries) {
			if (entry.resetTime < now) {
				store.delete(key);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			console.log(`[RateLimit] Cleaned ${cleaned} expired entries`);
		}
	}, CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load
startCleanup();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract client IP address from request
 * Handles various proxy headers (X-Forwarded-For, X-Real-IP)
 *
 * @param request - The incoming request
 * @returns Client IP address or 'unknown' if not found
 */
export function getClientIp(request: Request): string {
	// Check X-Forwarded-For header (common with proxies/load balancers)
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		// X-Forwarded-For can contain multiple IPs, first is the client
		const ips = forwardedFor.split(",").map((ip) => ip.trim());
		if (ips[0]) {
			return ips[0];
		}
	}

	// Check X-Real-IP header (used by some proxies)
	const realIp = request.headers.get("x-real-ip");
	if (realIp) {
		return realIp;
	}

	// Fallback to 'unknown' if no IP found
	// This should rarely happen in production with proper proxy setup
	return "unknown";
}

/**
 * Convert milliseconds to seconds (for headers)
 */
function msToSeconds(ms: number): number {
	return Math.ceil(ms / 1000);
}

/**
 * Create rate limit headers object
 */
function createHeaders(result: RateLimitResult): RateLimitHeaders {
	return {
		"X-RateLimit-Limit": String(result.limit),
		"X-RateLimit-Remaining": String(result.remaining),
		"X-RateLimit-Reset": String(result.resetTime),
	};
}

// ============================================================================
// Core Rate Limiting Logic
// ============================================================================

/**
 * Check and update rate limit for a client
 *
 * Uses sliding window algorithm:
 * - If no entry exists or window expired, create new entry
 * - If within window, increment count
 * - Return result with limit info
 *
 * @param key - Client identifier (IP or user ID)
 * @param windowMs - Window duration in milliseconds
 * @param maxRequests - Maximum requests per window
 * @returns Rate limit result
 */
function checkRateLimit(
	key: string,
	windowMs: number,
	maxRequests: number,
): RateLimitResult {
	const now = Date.now();
	const entry = store.get(key);

	// Case 1: No entry exists or window has expired
	if (!entry || entry.resetTime <= now) {
		const resetTime = now + windowMs;
		store.set(key, { count: 1, resetTime });

		return {
			success: true,
			limit: maxRequests,
			remaining: maxRequests - 1,
			resetTime: Math.floor(resetTime / 1000),
			retryAfter: 0,
		};
	}

	// Case 2: Within window, increment count
	entry.count++;

	// Check if limit exceeded
	if (entry.count > maxRequests) {
		const retryAfter = msToSeconds(entry.resetTime - now);

		return {
			success: false,
			limit: maxRequests,
			remaining: 0,
			resetTime: Math.floor(entry.resetTime / 1000),
			retryAfter,
		};
	}

	// Request allowed
	return {
		success: true,
		limit: maxRequests,
		remaining: maxRequests - entry.count,
		resetTime: Math.floor(entry.resetTime / 1000),
		retryAfter: 0,
	};
}

// ============================================================================
// Rate Limit Middleware Factory
// ============================================================================

/**
 * Create a rate limiting middleware function
 *
 * @param options - Rate limit configuration
 * @returns Middleware function that checks rate limits
 *
 * @example
 * ```typescript
 * const limiter = rateLimit({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   maxRequests: 5,
 *   keyGenerator: (req) => getClientIp(req),
 *   message: 'Too many login attempts, please try again later'
 * });
 *
 * // In your route handler:
 * const result = await limiter(request);
 * if (!result.success) {
 *   return new Response(result.message, { status: 429, headers: result.headers });
 * }
 * ```
 */
export function rateLimit(options: RateLimitOptions): (
	request: Request,
) => Promise<{
	success: boolean;
	headers: RateLimitHeaders;
	retryAfter: number;
	message: string;
}> {
	const {
		windowMs,
		maxRequests,
		keyGenerator,
		message = "Too many requests, please try again later.",
		skip,
	} = options;

	return async (request: Request) => {
		// Check if rate limiting should be skipped
		if (skip) {
			const shouldSkip = await skip(request);
			if (shouldSkip) {
				return {
					success: true,
					headers: createHeaders({
						success: true,
						limit: maxRequests,
						remaining: maxRequests,
						resetTime: Math.floor((Date.now() + windowMs) / 1000),
						retryAfter: 0,
					}),
					retryAfter: 0,
					message: "",
				};
			}
		}

		// Generate key for this client
		const key = await keyGenerator(request);

		// Check rate limit
		const result = checkRateLimit(key, windowMs, maxRequests);
		const headers = createHeaders(result);

		return {
			success: result.success,
			headers,
			retryAfter: result.retryAfter,
			message: result.success ? "" : message,
		};
	};
}

// ============================================================================
// Pre-configured Rate Limiters (per PRD §12.4)
// ============================================================================

/**
 * Login rate limiter
 * - 5 requests per 15 minutes per IP
 * - Prevents brute force attacks on login endpoint
 */
export const loginRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	maxRequests: 5,
	keyGenerator: getClientIp,
	message: "Too many login attempts. Please try again in 15 minutes.",
});

/**
 * Register rate limiter
 * - 3 requests per hour per IP
 * - Prevents automated account creation
 */
export const registerRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	maxRequests: 3,
	keyGenerator: getClientIp,
	message: "Too many registration attempts. Please try again in 1 hour.",
});

/**
 * Create Sandbox rate limiter
 * - 10 requests per hour per user
 * - Prevents resource exhaustion
 */
export const createSandboxRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	maxRequests: 10,
	keyGenerator: async (request: Request) => {
		// Extract user ID from session/cookie
		// For unauthenticated requests, fall back to IP
		const authHeader = request.headers.get("authorization");
		if (authHeader?.startsWith("Bearer ")) {
			// Use user ID from JWT (would need to decode)
			// For now, use the token itself as identifier
			return `user:${authHeader.slice(7, 20)}`;
		}

		// Fall back to IP for unauthenticated requests
		return `ip:${getClientIp(request)}`;
	},
	message: "Sandbox creation limit reached. Please try again in 1 hour.",
});

/**
 * SQL Query rate limiter
 * - 60 requests per minute per user
 * - Prevents database overload
 */
export const sqlQueryRateLimit = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	maxRequests: 60,
	keyGenerator: async (request: Request) => {
		// Extract user ID from session/cookie
		const authHeader = request.headers.get("authorization");
		if (authHeader?.startsWith("Bearer ")) {
			return `user:${authHeader.slice(7, 20)}`;
		}

		// Fall back to IP for unauthenticated requests
		return `ip:${getClientIp(request)}`;
	},
	message: "Too many SQL queries. Please slow down.",
});

/**
 * AI Generate rate limiter
 * - 30 requests per day per user
 * - Controls Gemini API costs
 */
export const aiGenerateRateLimit = rateLimit({
	windowMs: 24 * 60 * 60 * 1000, // 24 hours (1 day)
	maxRequests: 30,
	keyGenerator: async (request: Request) => {
		// Extract user ID from session/cookie
		const authHeader = request.headers.get("authorization");
		if (authHeader?.startsWith("Bearer ")) {
			return `user:${authHeader.slice(7, 20)}`;
		}

		// Fall back to IP for unauthenticated requests
		return `ip:${getClientIp(request)}`;
	},
	message:
		"AI generation limit reached (30 per day). Please try again tomorrow.",
});

/**
 * GitHub OAuth rate limiter
 * - 10 requests per 15 minutes per IP
 * - Prevents OAuth abuse
 */
export const githubOAuthRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	maxRequests: 10,
	keyGenerator: getClientIp,
	message: "Too many GitHub OAuth attempts. Please try again in 15 minutes.",
});

// ============================================================================
// Helper: Create 429 Response
// ============================================================================

/**
 * Create a standard 429 Too Many Requests response
 *
 * @param message - Error message to include
 * @param retryAfter - Seconds until rate limit resets
 * @param headers - Rate limit headers
 * @returns Response object with 429 status
 */
export function createRateLimitResponse(
	message: string,
	retryAfter: number,
	headers: RateLimitHeaders,
): Response {
	return new Response(
		JSON.stringify({
			success: false,
			error: message,
			retryAfter,
		}),
		{
			status: 429,
			headers: {
				"Content-Type": "application/json",
				"Retry-After": String(retryAfter),
				...headers,
			},
		},
	);
}

// ============================================================================
// Helper: Add Rate Limit Headers to Response
// ============================================================================

/**
 * Add rate limit headers to an existing Response
 *
 * @param response - Original response
 * @param headers - Rate limit headers to add
 * @returns New response with added headers
 */
export function addRateLimitHeaders(
	response: Response,
	headers: RateLimitHeaders,
): Response {
	const newHeaders = new Headers(response.headers);

	for (const [key, value] of Object.entries(headers)) {
		newHeaders.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
}

// ============================================================================
// Export: Clear Store (for testing)
// ============================================================================

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearRateLimitStore(): void {
	store.clear();
}

/**
 * Get current store size (useful for monitoring)
 */
export function getRateLimitStoreSize(): number {
	return store.size;
}
