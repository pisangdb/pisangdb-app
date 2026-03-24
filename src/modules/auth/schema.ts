import { z } from "zod";

export const registerSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(8),
});

export const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

// ─── Settings schemas ────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(8, "Password must be at least 8 characters"),
	newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const deleteAccountSchema = z.object({
	confirmationEmail: z.string().email("Invalid email address"),
});

export const updatePreferencesSchema = z.object({
	sandboxExpiryWarning: z.boolean(),
	productUpdates: z.boolean(),
});

export const revokeSessionSchema = z.object({
	token: z.string().min(1, "Session token is required"),
});
