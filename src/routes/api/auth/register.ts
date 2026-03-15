/**
 * Registration API Endpoint for PisangDB
 *
 * POST /api/auth/register
 *
 * Per PRD §6.1.1:
 * - Email must be unique and validated format
 * - Password hashed with bcrypt (cost factor ≥10, using 12)
 * - After register, user directly logged in (no email verification for MVP)
 *
 * Per PRD §12.4:
 * - Rate limit: 3 requests / hour / IP
 *
 * Per PRD §6.1.2:
 * - JWT stored in HTTP-only, Secure, SameSite=Strict cookies
 * - Session expiry: 7 days
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { users } from "#/db/schema";
import type { FieldError } from "#/lib/api-response";
import {
	createdResponse,
	errorResponse,
	internalError,
	validationErrorResponse,
} from "#/lib/api-response";
import {
	createSessionCookie,
	generateToken,
	hashPassword,
} from "#/lib/session";
import {
	createRateLimitResponse,
	registerRateLimit,
} from "#/middleware/rate-limit";

const registerSchema = z.object({
	email: z.string().email("Invalid email format").max(255, "Email too long"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.max(128, "Password too long"),
	name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

export const Route = createFileRoute("/api/auth/register")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const rateLimitResult = await registerRateLimit(request);
				if (!rateLimitResult.success) {
					return createRateLimitResponse(
						rateLimitResult.message,
						rateLimitResult.retryAfter,
						rateLimitResult.headers,
					);
				}

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return errorResponse("invalid_json", "Invalid JSON body", 400);
				}

				const validationResult = registerSchema.safeParse(body);
				if (!validationResult.success) {
					const details: FieldError[] = validationResult.error.issues.map(
						(issue) => ({
							field:
								Array.isArray(issue.path) && issue.path.length > 0
									? String(issue.path[0])
									: "body",
							message: issue.message,
							code: issue.code ?? "",
						}),
					);
					return validationErrorResponse(details);
				}

				const { email, password, name } = validationResult.data;

				try {
					const existingUser = await db
						.select({ id: users.id })
						.from(users)
						.where(eq(users.email, email.toLowerCase()))
						.limit(1);

					if (existingUser.length > 0) {
						return errorResponse("conflict", "Email already registered", 409);
					}
				} catch (dbError) {
					console.error("[Register] Database error checking email:", dbError);
					return internalError("Internal server error");
				}

				let passwordHash: string;
				try {
					passwordHash = await hashPassword(password);
				} catch (hashError) {
					console.error("[Register] Password hashing error:", hashError);
					return internalError("Internal server error");
				}

				let newUser: (typeof users.$inferSelect)[];
				try {
					newUser = await db
						.insert(users)
						.values({
							email: email.toLowerCase(),
							passwordHash,
							name,
							role: "user",
						})
						.returning();
				} catch (insertError) {
					console.error("[Register] Database insert error:", insertError);
					return internalError("Internal server error");
				}

				const user = newUser[0];
				if (!user) {
					return internalError("Failed to create user");
				}

				let token: string;
				try {
					token = await generateToken(user.id);
				} catch (tokenError) {
					console.error("[Register] Token generation error:", tokenError);
					return internalError("Internal server error");
				}

				const sessionCookie = createSessionCookie(token);
				const userPayload = {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
					createdAt: user.createdAt.toISOString(),
				};

				const location = `/api/users/${user.id}`;
				const resp = createdResponse(userPayload, location);
				const cookieValue = `${sessionCookie.name}=${sessionCookie.value}; Path=${sessionCookie.options.path}; HttpOnly; SameSite=${sessionCookie.options.sameSite}; Max-Age=${sessionCookie.options.maxAge}${sessionCookie.options.secure ? "; Secure" : ""}`;
				const text = await resp.text();
				const newHeaders = new Headers(resp.headers);
				newHeaders.set("Set-Cookie", cookieValue);
				return new Response(text, { status: resp.status, headers: newHeaders });
			},
		},
	},
});
