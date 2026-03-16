import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { users } from "#/db/schema";
import { createSessionCookie, generateToken } from "#/lib/session";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

interface GoogleTokenResponse {
	access_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
	id_token?: string;
}

interface GoogleUser {
	id: string;
	email: string;
	verified_email: boolean;
	name: string | null;
	picture: string | null;
}

async function exchangeCodeForToken(
	code: string,
): Promise<GoogleTokenResponse> {
	const redirectUri =
		GOOGLE_REDIRECT_URI || `${BASE_URL}/api/auth/google/callback`;

	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: GOOGLE_CLIENT_ID || "",
			client_secret: GOOGLE_CLIENT_SECRET || "",
			code,
			grant_type: "authorization_code",
			redirect_uri: redirectUri,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Google token exchange failed: ${error}`);
	}

	return response.json();
}

async function fetchGoogleUser(accessToken: string): Promise<GoogleUser> {
	const response = await fetch(
		`https://www.googleapis.com/oauth2/v2/userinfo?alt=json`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch Google user: ${response.status}`);
	}

	return response.json();
}

export const Route = createFileRoute("/api/auth/google/callback")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const code = url.searchParams.get("code");
				const error = url.searchParams.get("error");

				if (error) {
					return new Response(null, {
						status: 302,
						headers: {
							Location: `/login?error=${encodeURIComponent(error)}`,
						},
					});
				}

				if (!code) {
					return new Response(null, {
						status: 302,
						headers: { Location: "/login?error=missing_params" },
					});
				}

				try {
					const tokenResponse = await exchangeCodeForToken(code);
					const googleUser = await fetchGoogleUser(tokenResponse.access_token);

					if (!googleUser.email || !googleUser.verified_email) {
						throw new Error("Google account does not have verified email");
					}

					const [existingUser] = await db
						.select()
						.from(users)
						.where(eq(users.email, googleUser.email))
						.limit(1);

					let userId: string;

					if (existingUser) {
						userId = existingUser.id;
						await db
							.update(users)
							.set({
								name: googleUser.name || existingUser.name,
								avatarUrl: googleUser.picture || existingUser.avatarUrl,
								updatedAt: new Date(),
							})
							.where(eq(users.id, existingUser.id));
					} else {
						const [newUser] = await db
							.insert(users)
							.values({
								email: googleUser.email,
								name: googleUser.name || googleUser.email.split("@")[0],
								avatarUrl: googleUser.picture,
								passwordHash: "OAUTH_GOOGLE",
							})
							.returning();
						userId = newUser.id;
					}

					const token = await generateToken(userId);
					const sessionCookie = createSessionCookie(token);

					const redirectUrl = new URL("/dashboard", BASE_URL);
					redirectUrl.searchParams.set("welcome", "true");

					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": `${sessionCookie.name}=${sessionCookie.value}; Path=${sessionCookie.options.path}; HttpOnly; SameSite=${sessionCookie.options.sameSite}; Max-Age=${sessionCookie.options.maxAge}${sessionCookie.options.secure ? "; Secure" : ""}`,
						},
					});
				} catch (err) {
					console.error("[Google OAuth] Callback error:", err);
					const errorMessage =
						err instanceof Error ? err.message : "unknown_error";
					return new Response(null, {
						status: 302,
						headers: {
							Location: `/login?error=${encodeURIComponent(errorMessage)}`,
						},
					});
				}
			},
		},
	},
});
