import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";
import type { AuthUser, UserRole } from "#/lib/types";
import { loginSchema, registerSchema } from "./schema";

export const $register = createServerFn({ method: "POST" })
	.inputValidator(registerSchema)
	.handler(async ({ data }): Promise<AuthUser> => {
		return {
			id: "",
			email: data.email,
			name: data.name,
			role: "user",
			image: null,
		};
	});

export const $login = createServerFn({ method: "POST" })
	.inputValidator(loginSchema)
	.handler(async ({ data }): Promise<AuthUser> => {
		return {
			id: "",
			email: data.email,
			name: "",
			role: "user",
			image: null,
		};
	});

export const $logout = createServerFn({ method: "POST" }).handler(
	async (): Promise<void> => {},
);

export const $getMe = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthUser | null> => {
		const request = getRequest();
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) return null;

		const user = session.user as typeof session.user & { role?: string };

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			role: (user.role ?? "user") as UserRole,
			image: user.image ?? null,
		};
	},
);
