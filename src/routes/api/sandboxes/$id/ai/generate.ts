import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { aiLogs, sandboxes } from "#/db/schema";
import { errorResponse, successResponse } from "#/lib/api-response";
import { generateSql, type SqlMode } from "#/lib/gemini-client";
import { verifyToken } from "#/lib/session";
import {
	addRateLimitHeaders,
	aiGenerateRateLimit,
	createRateLimitResponse,
} from "#/middleware/rate-limit";

const SESSION_COOKIE_NAME = "session";

const MAX_PROMPT_LENGTH = 1000;

export const Route = createFileRoute("/api/sandboxes/$id/ai/generate")({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				const { id } = params;

				const token = getCookie(SESSION_COOKIE_NAME);
				if (!token) {
					return errorResponse(
						"AUTHENTICATION_REQUIRED",
						"Authentication required",
						401,
					);
				}

				const payload = await verifyToken(token);
				if (!payload) {
					return errorResponse(
						"INVALID_SESSION",
						"Invalid or expired session",
						401,
					);
				}

				const userId = payload.userId;

				const rateLimitResult = await aiGenerateRateLimit(request);
				if (!rateLimitResult.success) {
					const resp = createRateLimitResponse(
						rateLimitResult.message,
						rateLimitResult.retryAfter,
						rateLimitResult.headers,
					);
					return addRateLimitHeaders(resp, rateLimitResult.headers);
				}

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return errorResponse("invalid_json_body", "Invalid JSON body", 400);
				}

				const schema = z.object({
					prompt: z
						.string()
						.min(1, "Prompt is required")
						.max(
							MAX_PROMPT_LENGTH,
							`Prompt must be ${MAX_PROMPT_LENGTH} characters or less`,
						),
					mode: z
						.enum(["schema", "seed", "helper"])
						.optional()
						.default("schema"),
				});

				const parsed = schema.safeParse(body);
				if (!parsed.success) {
					const firstError = parsed.error.issues[0];
					return errorResponse(
						"VALIDATION_ERROR",
						firstError?.message ?? "Invalid request",
						400,
					);
				}

				const { prompt, mode } = parsed.data;

				const [sandbox] = await db
					.select()
					.from(sandboxes)
					.where(eq(sandboxes.id, id))
					.limit(1);

				if (!sandbox) {
					return errorResponse("sandbox_not_found", "Sandbox not found", 404);
				}

				if (sandbox.userId !== userId) {
					return errorResponse("access_denied", "Access denied", 403);
				}

				if (sandbox.status !== "active") {
					return errorResponse(
						"SANDBOX_NOT_ACTIVE",
						"Cannot generate SQL for an inactive sandbox",
						400,
					);
				}

				let sqlResult: {
					sql: string;
					explanation: string;
					tokensUsed: number;
				} | null = null;
				try {
					sqlResult = await generateSql(
						prompt,
						sandbox.engine as "postgresql" | "mysql" | "mariadb",
						mode as SqlMode,
					);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Failed to generate SQL";
					console.error("[AI Generate] Generation failed:", errorMessage);

					if (errorMessage.includes("not configured")) {
						return errorResponse(
							"AI_NOT_CONFIGURED",
							"AI service is not configured. Please contact the administrator.",
							503,
						);
					}

					if (errorMessage.includes("rate limit")) {
						return errorResponse(
							"AI_RATE_LIMITED",
							"AI service rate limit exceeded. Please try again later.",
							429,
						);
					}

					return errorResponse("AI_GENERATION_FAILED", errorMessage, 500);
				}

				if (!sqlResult) {
					return errorResponse(
						"AI_GENERATION_FAILED",
						"Failed to generate SQL",
						500,
					);
				}

				let aiLogRecord: { id: string } | undefined;
				try {
					const result = await db
						.insert(aiLogs)
						.values({
							sandboxId: sandbox.id,
							userId,
							prompt,
							response: JSON.stringify({
								explanation: sqlResult.explanation,
							}),
							sqlGenerated: sqlResult.sql,
							executed: false,
							tokensUsed: sqlResult.tokensUsed,
						})
						.returning({ id: aiLogs.id });
					aiLogRecord = result[0];
				} catch (logError) {
					console.error("[AI Generate] Failed to save AI log:", logError);
				}

				return successResponse(
					{
						sql: sqlResult.sql,
						explanation: sqlResult.explanation,
						tokensUsed: sqlResult.tokensUsed,
						aiLogId: aiLogRecord?.id,
					},
					200,
				);
			},
		},
	},
});
