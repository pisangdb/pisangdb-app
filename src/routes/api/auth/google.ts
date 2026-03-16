/**
 * Google OAuth Initiation Endpoint for PisangDB
 *
 * GET /api/auth/google
 *
 * Per PRD §6.1.3:
 * - Login via Google OAuth for faster onboarding
 * - Auto-create account if not registered
 * - State parameter for CSRF protection
 *
 * Security considerations:
 * - State parameter stored in HTTP-only cookie for CSRF protection
 * - State is cryptographically random (32 bytes)
 * - Redirect URI validated against environment variable
 * - Only active when GOOGLE_CLIENT_ID is set
 */

import { randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// Configuration
// ============================================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// OAuth state cookie name
const OAUTH_STATE_COOKIE_NAME = "google_oauth_state";
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
 * Get Google OAuth authorization URL
 * @param state - CSRF protection state parameter
 * @returns Full Google authorization URL
 */
function getGoogleAuthUrl(state: string): string {
	if (!GOOGLE_CLIENT_ID) {
		throw new Error("GOOGLE_CLIENT_ID is not configured");
	}

	// Use GOOGLE_REDIRECT_URI if set, otherwise construct from BASE_URL
	const redirectUri =
		GOOGLE_REDIRECT_URI || `${BASE_URL}/api/auth/google/callback`;

	const params = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		scope: "openid email profile", // Request email and profile access
		state: state,
		response_type: "code",
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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
			sameSite: "lax", // 'lax' allows OAuth redirect from Google
			maxAge: OAUTH_STATE_EXPIRY_SECONDS,
			path: "/",
		},
	};
}

// ============================================================================
// API Route Handler
// ============================================================================

export const Route = createFileRoute("/api/auth/google")({
	server: {
		handlers: {
			GET: async () => {
				// Step 1: Validate environment configuration
				if (!GOOGLE_CLIENT_ID) {
					console.error("[Google OAuth] GOOGLE_CLIENT_ID is not configured");
					const response: OAuthErrorResponse = {
						success: false,
						error: "Google OAuth is not configured. Please contact support.",
					};
					return new Response(JSON.stringify(response), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Step 2: Generate state parameter for CSRF protection
				const state = generateState();

				// Step 3: Build Google authorization URL
				let authUrl: string;
				try {
					authUrl = getGoogleAuthUrl(state);
				} catch (error) {
					console.error("[Google OAuth] Error building auth URL:", error);
					const response: OAuthErrorResponse = {
						success: false,
						error: "Failed to initiate Google OAuth. Please try again.",
					};
					return new Response(JSON.stringify(response), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Step 4: Create state cookie for CSRF verification on callback
				const stateCookie = createStateCookie(state);

				// Step 5: Redirect to Google with state cookie set
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
