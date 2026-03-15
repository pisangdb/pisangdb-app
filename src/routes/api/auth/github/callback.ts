/**
 * GitHub OAuth Callback Endpoint for PisangDB
 *
 * GET /api/auth/github/callback
 *
 * Per PRD §6.1.3:
 * - Handles OAuth callback from GitHub
 * - Exchanges code for access token
 * - Fetches user info from GitHub API
 * - Creates new account or links existing account
 * - Creates session and redirects to dashboard
 *
 * Security considerations:
 * - State parameter verified against cookie (CSRF protection)
 * - Access token is NOT stored in database (only used temporarily)
 * - Email matching for account linking
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { users } from "#/db/schema";
import { createSessionCookie, generateToken } from "#/lib/session";

// ============================================================================
// Configuration
// ============================================================================

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const OAUTH_STATE_COOKIE_NAME = "oauth_state";

// ============================================================================
// Types
// ============================================================================

interface GitHubTokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
	error?: string;
	error_description?: string;
}

interface GitHubUser {
	id: number;
	login: string;
	email: string | null;
	name: string | null;
	avatar_url: string | null;
}

interface GitHubEmail {
	email: string;
	primary: boolean;
	verified: boolean;
	visibility: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from GitHub
 * @returns Access token response
 */
async function exchangeCodeForToken(
	code: string,
): Promise<GitHubTokenResponse> {
	if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
		throw new Error("GitHub OAuth credentials not configured");
	}

	const response = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: GITHUB_CLIENT_ID,
			client_secret: GITHUB_CLIENT_SECRET,
			code: code,
			redirect_uri: GITHUB_REDIRECT_URI,
		}),
	});

	if (!response.ok) {
		throw new Error(`GitHub token exchange failed: ${response.status}`);
	}

	return response.json();
}

/**
 * Fetch user info from GitHub API
 * @param accessToken - GitHub access token
 * @returns GitHub user object
 */
async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
	const response = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github.v3+json",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub user fetch failed: ${response.status}`);
	}

	return response.json();
}

/**
 * Fetch user emails from GitHub API
 * GitHub may not return email in user object, so we need to fetch separately
 * @param accessToken - GitHub access token
 * @returns Array of user emails
 */
async function fetchGitHubEmails(accessToken: string): Promise<GitHubEmail[]> {
	const response = await fetch("https://api.github.com/user/emails", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github.v3+json",
		},
	});

	if (!response.ok) {
		// If we can't fetch emails, return empty array
		// User might have email public in profile
		return [];
	}

	return response.json();
}

/**
 * Get primary verified email from GitHub emails
 * @param emails - Array of GitHub emails
 * @returns Primary verified email or null
 */
function getPrimaryEmail(emails: GitHubEmail[]): string | null {
	const primaryVerified = emails.find(
		(email) => email.primary && email.verified,
	);
	if (primaryVerified) {
		return primaryVerified.email;
	}

	const verified = emails.find((email) => email.verified);
	if (verified) {
		return verified.email;
	}

	return null;
}

/**
 * Clear OAuth state cookie
 * @returns Cookie string to clear the state cookie
 */
function clearStateCookie(): string {
	const isProduction = process.env.NODE_ENV === "production";
	return `${OAUTH_STATE_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=lax; Max-Age=0${isProduction ? "; Secure" : ""}`;
}

// ============================================================================
// API Route Handler
// ============================================================================

export const Route = createFileRoute("/api/auth/github/callback")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const code = url.searchParams.get("code");
				const state = url.searchParams.get("state");
				const error = url.searchParams.get("error");
				const errorDescription = url.searchParams.get("error_description");

				// Step 1: Check for OAuth error from GitHub
				if (error) {
					console.error(
						"[GitHub OAuth] Error from GitHub:",
						error,
						errorDescription,
					);
					const redirectUrl = new URL("/login", BASE_URL);
					redirectUrl.searchParams.set("error", "oauth_error");
					redirectUrl.searchParams.set("message", errorDescription || error);
					return new Response(null, {
						status: 302,
						headers: { Location: redirectUrl.toString() },
					});
				}

				// Step 2: Validate required parameters
				if (!code || !state) {
					console.error("[GitHub OAuth] Missing code or state");
					const redirectUrl = new URL("/login", BASE_URL);
					redirectUrl.searchParams.set("error", "oauth_invalid");
					redirectUrl.searchParams.set("message", "Invalid OAuth response");
					return new Response(null, {
						status: 302,
						headers: { Location: redirectUrl.toString() },
					});
				}

				// Step 3: Verify state parameter (CSRF protection)
				const cookies = request.headers.get("cookie") || "";
				const stateCookie = cookies
					.split(";")
					.map((c) => c.trim())
					.find((c) => c.startsWith(`${OAUTH_STATE_COOKIE_NAME}=`))
					?.split("=")[1];

				if (!stateCookie || stateCookie !== state) {
					console.error(
						"[GitHub OAuth] State mismatch. Expected:",
						stateCookie,
						"Got:",
						state,
					);
					const redirectUrl = new URL("/login", BASE_URL);
					redirectUrl.searchParams.set("error", "oauth_csrf");
					redirectUrl.searchParams.set(
						"message",
						"Security verification failed",
					);
					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": clearStateCookie(),
						},
					});
				}

				// Step 4: Exchange code for access token
				let tokenResponse: GitHubTokenResponse;
				try {
					tokenResponse = await exchangeCodeForToken(code);
				} catch (err) {
					console.error("[GitHub OAuth] Token exchange failed:", err);
					const redirectUrl = new URL("/login", BASE_URL);
					redirectUrl.searchParams.set("error", "oauth_token");
					redirectUrl.searchParams.set(
						"message",
						"Failed to exchange authorization code",
					);
					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": clearStateCookie(),
						},
					});
				}

				if (tokenResponse.error || !tokenResponse.access_token) {
					console.error("[GitHub OAuth] Token error:", tokenResponse.error);
					const redirectUrl = new URL("/login", BASE_URL);
					redirectUrl.searchParams.set("error", "oauth_token");
					redirectUrl.searchParams.set(
						"message",
						tokenResponse.error_description ||
							tokenResponse.error ||
							"Token exchange failed",
					);
					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": clearStateCookie(),
						},
					});
				}

				// Step 5: Fetch user info from GitHub
				let githubUser: GitHubUser;
				try {
					githubUser = await fetchGitHubUser(tokenResponse.access_token);
				} catch (err) {
					console.error("[GitHub OAuth] User fetch failed:", err);
					const redirectUrl = new URL("/login", BASE_URL);
					redirectUrl.searchParams.set("error", "oauth_user");
					redirectUrl.searchParams.set("message", "Failed to fetch user info");
					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": clearStateCookie(),
						},
					});
				}

				// Step 6: Fetch user emails (if email not in user object)
				let userEmail = githubUser.email;
				if (!userEmail) {
					try {
						const emails = await fetchGitHubEmails(tokenResponse.access_token);
						userEmail = getPrimaryEmail(emails) || null;
					} catch {
						// Continue without email - will fail later if no email found
					}
				}

				if (!userEmail) {
					console.error(
						"[GitHub OAuth] No email found for user:",
						githubUser.login,
					);
					const redirectUrl = new URL("/login", BASE_URL);
					redirectUrl.searchParams.set("error", "oauth_email");
					redirectUrl.searchParams.set(
						"message",
						"No email found in GitHub account",
					);
					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": clearStateCookie(),
						},
					});
				}

				// Step 7: Find or create user
				const githubId = String(githubUser.id);

				try {
					// First, try to find user by GitHub ID
					let existingUser = await db
						.select()
						.from(users)
						.where(eq(users.githubId, githubId))
						.limit(1);

					let user = existingUser[0];

					if (!user) {
						// Try to find user by email (for account linking)
						existingUser = await db
							.select()
							.from(users)
							.where(eq(users.email, userEmail.toLowerCase()))
							.limit(1);

						user = existingUser[0];

						if (user) {
							// Link GitHub account to existing user
							await db
								.update(users)
								.set({
									githubId: githubId,
									avatarUrl: githubUser.avatar_url,
									updatedAt: new Date(),
								})
								.where(eq(users.id, user.id));
						} else {
							// Create new user
							const newUser = await db
								.insert(users)
								.values({
									email: userEmail.toLowerCase(),
									passwordHash: "", // Empty for OAuth-only users
									name: githubUser.name || githubUser.login,
									githubId: githubId,
									avatarUrl: githubUser.avatar_url,
									role: "user",
								})
								.returning();

							user = newUser[0];
						}
					} else {
						// Update existing user's avatar if changed
						if (githubUser.avatar_url !== user.avatarUrl) {
							await db
								.update(users)
								.set({
									avatarUrl: githubUser.avatar_url,
									updatedAt: new Date(),
								})
								.where(eq(users.id, user.id));
						}
					}

					if (!user) {
						throw new Error("Failed to create or find user");
					}

					// Step 8: Generate JWT token
					const token = await generateToken(user.id);

					// Step 9: Create session cookie
					const sessionCookie = createSessionCookie(token);

					// Step 10: Redirect to dashboard with success
					const redirectUrl = new URL("/dashboard", BASE_URL);
					redirectUrl.searchParams.set("welcome", "true");

					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": `${sessionCookie.name}=${sessionCookie.value}; Path=${sessionCookie.options.path}; HttpOnly; SameSite=${sessionCookie.options.sameSite}; Max-Age=${sessionCookie.options.maxAge}${sessionCookie.options.secure ? "; Secure" : ""}`,
						},
					});
				} catch (dbError) {
					console.error("[GitHub OAuth] Database error:", dbError);
					const redirectUrl = new URL("/login", BASE_URL);
					redirectUrl.searchParams.set("error", "oauth_db");
					redirectUrl.searchParams.set("message", "Failed to create account");
					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": clearStateCookie(),
						},
					});
				}
			},
		},
	},
});
