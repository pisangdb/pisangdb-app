/**
 * Logout API Endpoint
 *
 * POST /api/auth/logout
 *
 * Clears the session cookie to log the user out.
 * Per PRD §6.1.2:
 * - No authentication required (logout is idempotent)
 * - Clears HTTP-only session cookie
 * - Returns 200 with success message
 */

import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie } from "#/lib/session";

export const Route = createFileRoute("/api/auth/logout")({
	server: {
		handlers: {
			POST: async () => {
				const cookieConfig = clearSessionCookie();

				const cookieString = `${cookieConfig.name}=; Max-Age=0; Path=${cookieConfig.options.path}; HttpOnly; SameSite=${cookieConfig.options.sameSite}${cookieConfig.options.secure ? "; Secure" : ""}`;

				return new Response(
					JSON.stringify({ success: true, message: "Logged out successfully" }),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Set-Cookie": cookieString,
						},
					},
				);
			},
		},
	},
});
