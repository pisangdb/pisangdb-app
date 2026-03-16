interface RateLimitConfig {
	windowMs: number;
	max: number;
	message?: string;
}

interface RateLimitResult {
	success: boolean;
	message?: string;
	headers?: {
		"X-RateLimit-Limit": string;
		"X-RateLimit-Remaining": string;
		"X-RateLimit-Reset": string;
	};
}

const requests = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(config: RateLimitConfig) {
	const { windowMs, max, message = "Too many requests, please try again later." } = config;

	return async (request: { headers: { get: (name: string) => string | null } }): Promise<RateLimitResult> => {
		const ip = request.headers.get("x-forwarded-for") ?? 
			request.headers.get("x-real-ip") ?? 
			"unknown";
		const key = ip;
		const now = Date.now();

		const entry = requests.get(key);
		if (entry && now < entry.resetTime) {
			if (entry.count >= max) {
				return {
					success: false,
					message,
					headers: {
						"X-RateLimit-Limit": String(max),
						"X-RateLimit-Remaining": "0",
						"X-RateLimit-Reset": String(entry.resetTime),
					},
				};
			}
			entry.count++;
		} else {
			requests.set(key, { count: 1, resetTime: now + windowMs });
		}

		const currentEntry = requests.get(key)!;
		return {
			success: true,
			headers: {
				"X-RateLimit-Limit": String(max),
				"X-RateLimit-Remaining": String(Math.max(0, max - currentEntry.count)),
				"X-RateLimit-Reset": String(currentEntry.resetTime),
			},
		};
	};
}

export function addRateLimitHeaders(
	response: Response,
	headers?: RateLimitResult["headers"],
): Response {
	if (!headers) return response;
	
	const newHeaders = new Headers(response.headers);
	newHeaders.set("X-RateLimit-Limit", headers["X-RateLimit-Limit"]);
	newHeaders.set("X-RateLimit-Remaining", headers["X-RateLimit-Remaining"]);
	newHeaders.set("X-RateLimit-Reset", headers["X-RateLimit-Reset"]);
	
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
}

export const aiRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 30,
	message: "AI rate limit exceeded. Max 30 requests per hour.",
});

export const sandboxRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 10,
	message: "Sandbox rate limit exceeded. Max 10 per hour.",
});

export const createSandboxRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 10,
	message: "Sandbox creation rate limit exceeded. Max 10 sandboxes per hour.",
});

export const aiGenerateRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 30,
	message: "AI generation rate limit exceeded. Max 30 requests per hour.",
});

export function createRateLimitResponse(message: string, headers?: RateLimitResult["headers"]): Response {
	return addRateLimitHeaders(
		new Response(JSON.stringify({ error: message }), {
			status: 429,
			headers: { "Content-Type": "application/json" },
		}),
		headers,
	);
}
