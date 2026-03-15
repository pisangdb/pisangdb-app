/**
 * GitHub OAuth Initiation Endpoint for PisangDB
 *
 * GET /api/auth/github
 *
 * Per PRD §6.1.3:
 * - Login via GitHub OAuth for faster onboarding
 * - Auto-create account if not registered
 * - State parameter for CSRF protection
 *
 * Security considerations:
 * - State parameter stored in HTTP-only cookie for CSRF protection
 * - State is cryptographically random (32 bytes)
 * - Redirect URI validated against environment variable
 */

import { randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// Configuration
// ============================================================================

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;

// OAuth state cookie name
const OAUTH_STATE_COOKIE_NAME = "oauth_state";
// State cookie expiration (5 minutes - enough for OAuth flow)
const OAUTH_STATE_EXPIRY_SECONDS = 300;

// ============================================================================
// Types
// ============================================================================

interface OAuthErrorResponse {
	success: false;
	error: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a cryptographically secure random state string
 * @returns Base64url-encoded random string
 */
function generateState(): string {
	return randomBytes(32).toString("base64url");
}

/**
 * Get GitHub OAuth authorization URL
 * @param state - CSRF protection state parameter
 * @returns Full GitHub authorization URL
 */
function getGitHubAuthUrl(state: string): string {
	if (!GITHUB_CLIENT_ID) {
		throw new Error("GITHUB_CLIENT_ID is not configured");
	}

	if (!GITHUB_REDIRECT_URI) {
		throw new Error("GITHUB_REDIRECT_URI is not configured");
	}

	const params = new URLSearchParams({
		client_id: GITHUB_CLIENT_ID,
		redirect_uri: GITHUB_REDIRECT_URI,
		scope: "user:email", // Request email access
		state: state,
		response_type: "code",
	});

	return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Create state cookie configuration for TanStack Start
 * @param state - The state value to store
 * @returns Cookie configuration object
 */
function createStateCookie(state: string): {
	name: string;
	value: string;
	options: {
		httpOnly: boolean;
		secure: boolean;
		sameSite: "strict" | "lax" | "none";
		maxAge: number;
		path: string;
	};
} {
	const isProduction = process.env.NODE_ENV === "production";

	return {
		name: OAUTH_STATE_COOKIE_NAME,
		value: state,
		options: {
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax", // 'lax' allows OAuth redirect from GitHub
			maxAge: OAUTH_STATE_EXPIRY_SECONDS,
			path: "/",
		},
	};
}

// ============================================================================
// API Route Handler
// ============================================================================

export const Route = createFileRoute("/api/auth/github")({
	server: {
		handlers: {
			GET: async () => {
				// Step 1: Validate environment configuration
				if (!GITHUB_CLIENT_ID) {
					console.error("[GitHub OAuth] GITHUB_CLIENT_ID is not configured");
					const response: OAuthErrorResponse = {
						success: false,
						error: "GitHub OAuth is not configured. Please contact support.",
					};
					return new Response(JSON.stringify(response), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}

				if (!GITHUB_REDIRECT_URI) {
					console.error("[GitHub OAuth] GITHUB_REDIRECT_URI is not configured");
					const response: OAuthErrorResponse = {
						success: false,
						error: "GitHub OAuth is not configured. Please contact support.",
					};
					return new Response(JSON.stringify(response), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Step 2: Generate state parameter for CSRF protection
				const state = generateState();

				// Step 3: Build GitHub authorization URL
				let authUrl: string;
				try {
					authUrl = getGitHubAuthUrl(state);
				} catch (error) {
					console.error("[GitHub OAuth] Error building auth URL:", error);
					const response: OAuthErrorResponse = {
						success: false,
						error: "Failed to initiate GitHub OAuth. Please try again.",
					};
					return new Response(JSON.stringify(response), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Step 4: Create state cookie for CSRF verification on callback
				const stateCookie = createStateCookie(state);

				// Step 5: Redirect to GitHub with state cookie set
				// The cookie will be verified in the callback handler
				return new Response(null, {
					status: 302,
					headers: {
						Location: authUrl,
						"Set-Cookie": `${stateCookie.name}=${stateCookie.value}; Path=${stateCookie.options.path}; HttpOnly; SameSite=${stateCookie.options.sameSite}; Max-Age=${stateCookie.options.maxAge}${stateCookie.options.secure ? "; Secure" : ""}`,
					},
				});
			},
		},
	},
});
