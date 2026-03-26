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
	engine: z.enum(["postgresql", "mysql", "mariadb"]),
	mode: z.enum(["schema", "seed", "helper"]).optional(),
});

export const aiExecuteSchema = z.object({
	sandboxId: z.string().uuid(),
	sql: z.string().min(1),
	logId: z.string().uuid().optional(),
});
