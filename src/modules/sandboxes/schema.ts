import { z } from "zod";

export const createSandboxSchema = z.object({
	displayName: z.string().min(1).max(50),
	engine: z.enum(["postgresql", "mysql", "mariadb"]),
	region: z.enum(["id", "sg", "us", "eu"]),
	retentionHours: z.union([
		z.literal(1),
		z.literal(6),
		z.literal(12),
		z.literal(24),
		z.literal(72),
		z.literal(168),
	]),
	// templateId can be: undefined (not sent), empty string (serialized undefined), or a valid UUID
	// Accept all three, normalize to undefined on the server side
	templateId: z.string().optional(),
});

export const extendSandboxSchema = z.object({
	sandboxId: z.string().uuid(),
	additionalHours: z.union([
		z.literal(1),
		z.literal(6),
		z.literal(12),
		z.literal(24),
	]),
});

export const sandboxIdSchema = z.object({
	sandboxId: z.string().uuid(),
});

export const sandboxTablePreviewSchema = z.object({
	sandboxId: z.string().uuid(),
	tableName: z
		.string()
		.min(1)
		.max(128)
		.regex(/^[A-Za-z0-9_]+$/, "Invalid table name"),
});
