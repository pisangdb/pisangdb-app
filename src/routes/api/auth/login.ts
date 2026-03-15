/**
 * Login API Endpoint for PisangDB
 *
 * POST /api/auth/login
 *
 * Per PRD §6.1.2:
 * - Login with email + password
 * - Session management using HTTP-only secure cookies with JWT
 * - Token expiry: 7 days (auto-refresh)
 * - Rate limit: Max 5 failed attempts per 15 min per IP
 *
 * Security considerations:
 * - Generic error message for invalid credentials (prevents email enumeration)
 * - Password verified with bcrypt
 * - HTTP-only, Secure, SameSite=Strict cookies
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { users } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import {
	createSessionCookie,
	generateToken,
	verifyPassword,
} from "#/lib/session";
import {
	createRateLimitResponse,
	loginRateLimit,
} from "#/middleware/rate-limit";

// ============================================================================
// Input Validation Schema
// ============================================================================

const loginSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
});

// ============================================================================
// Response Types (standardized API responses are provided by src/lib/api-response)
// ============================================================================

// Generic error message to prevent email enumeration
const INVALID_CREDENTIALS_ERROR = "Invalid email or password";

// ============================================================================
// Route Definition
// ============================================================================

export const Route = createFileRoute("/api/auth/login")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				// Step 1: Apply rate limiting (5 requests / 15 min / IP)
				const rateLimitResult = await loginRateLimit(request);
				if (!rateLimitResult.success) {
					return createRateLimitResponse(
						rateLimitResult.message,
						rateLimitResult.retryAfter,
						rateLimitResult.headers,
					);
				}

				// Step 2: Parse and validate request body
				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return errorResponse("invalid_json", "Invalid JSON body", 400);
				}

				const validationResult = loginSchema.safeParse(body);
				if (!validationResult.success) {
					return errorResponse(
						"validation_error",
						validationResult.error.issues[0]?.message ?? "Validation failed",
						400,
					);
				}

				const { email, password } = validationResult.data;

				// Step 3: Find user by email
				const userResult = await db
					.select()
					.from(users)
					.where(eq(users.email, email.toLowerCase()))
					.limit(1);

				const user = userResult[0];

				// Step 4: Verify user exists and password matches
				// Use generic error message to prevent email enumeration
				if (!user) {
					return errorResponse(
						"invalid_credentials",
						INVALID_CREDENTIALS_ERROR,
						401,
					);
				}

				// Verify password with bcrypt
				const passwordValid = await verifyPassword(password, user.passwordHash);
				if (!passwordValid) {
					return errorResponse(
						"invalid_credentials",
						INVALID_CREDENTIALS_ERROR,
						401,
					);
				}

				// Step 5: Generate JWT token
				const token = await generateToken(user.id);

				// Step 6: Create session cookie
				const sessionCookie = createSessionCookie(token);

				// Step 7: Update user's updated_at timestamp on successful login
				await db
					.update(users)
					.set({
						updatedAt: new Date(),
					})
					.where(eq(users.id, user.id));

				// Step 8: Build success data (exclude password_hash)
				const data = {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
					createdAt: user.createdAt,
				};

				// Step 9: Return response with session cookie using new API helper
				const cookieHeader = `${sessionCookie.name}=${sessionCookie.value}; Path=${sessionCookie.options.path}; HttpOnly; SameSite=${sessionCookie.options.sameSite}; Max-Age=${sessionCookie.options.maxAge}${sessionCookie.options.secure ? "; Secure" : ""}`;
				return successResponse(data, 200, {
					"Content-Type": "application/json",
					"Set-Cookie": cookieHeader,
				});
			},
		},
	},
});
