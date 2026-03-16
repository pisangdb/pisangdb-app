import { z } from "zod";

export const executeQuerySchema = z.object({
	sandboxId: z.string().uuid(),
	query: z.string().min(1).max(10000),
});

export const sandboxIdSchema = z.object({
	sandboxId: z.string().uuid(),
});

export const aiGenerateSchema = z.object({
	sandboxId: z.string().uuid(),
	prompt: z.string().min(1).max(1000),
	mode: z.enum(["schema", "seed", "helper"]).default("schema"),
});

export const aiExecuteSchema = z.object({
	logId: z.string().uuid(),
	sandboxId: z.string().uuid(),
	sql: z.string().min(1),
});
