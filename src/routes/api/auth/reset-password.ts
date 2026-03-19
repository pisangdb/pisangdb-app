import { createFileRoute } from "@tanstack/react-router";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import * as schema from "#/db/schema";

export const Route = createFileRoute("/api/auth/reset-password")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				try {
					const body = await request.json();
					const { token, password, newPassword } = body;
					const finalPassword = password || newPassword;

					// Validate inputs
					if (!token || !finalPassword) {
						return new Response(
							JSON.stringify({ message: "Token and password are required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					if (finalPassword.length < 8) {
						return new Response(
							JSON.stringify({
								message: "Password must be at least 8 characters",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Verify token exists and is not expired
					const verification = await db
						.select()
						.from(schema.verifications)
						.where(
							and(
								eq(schema.verifications.id, token),
								eq(schema.verifications.value, "password_reset"),
							),
						)
						.limit(1);

					if (verification.length === 0) {
						return new Response(
							JSON.stringify({ message: "Invalid or expired reset token" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const verif = verification[0];
					const now = new Date();

					if (verif.expiresAt && verif.expiresAt < now) {
						await db
							.delete(schema.verifications)
							.where(eq(schema.verifications.id, token));

						return new Response(
							JSON.stringify({ message: "Reset token has expired" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Find user by email (identifier)
					const users = await db
						.select()
						.from(schema.users)
						.where(eq(schema.users.email, verif.identifier))
						.limit(1);

					if (users.length === 0) {
						return new Response(JSON.stringify({ message: "User not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					const user = users[0];

					// Delete existing credential account if exists
					await db
						.delete(schema.accounts)
						.where(
							and(
								eq(schema.accounts.userId, user.id),
								eq(schema.accounts.providerId, "credential"),
							),
						);

					const hashedPassword = await bcrypt.hash(finalPassword, 10);

					await db.insert(schema.accounts).values({
						id: crypto.randomUUID(),
						accountId: crypto.randomUUID(),
						providerId: "credential",
						userId: user.id,
						password: hashedPassword,
					});

					// Delete verification token
					await db
						.delete(schema.verifications)
						.where(eq(schema.verifications.id, token));

					return new Response(
						JSON.stringify({
							message: "Password reset successfully",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Reset password error:", error);
					return new Response(
						JSON.stringify({ message: "An error occurred. Please try again." }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
