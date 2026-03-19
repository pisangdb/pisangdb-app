import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "#/db";
import * as schema from "#/db/schema";
import { sendPasswordResetEmail } from "#/lib/email";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.users,
			session: schema.sessions,
			account: schema.accounts,
			verification: schema.verifications,
		},
	}),
	user: {
		additionalFields: {
			role: {
				type: "string",
				defaultValue: "user",
				input: false,
			},
		},
	},
	// Session configuration: 7 days expiry (as per PRD)
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
		updateAge: 60 * 60 * 24, // Update session if older than 1 day
		cookieCache: {
			enabled: true,
			maxAge: 60 * 60 * 24 * 7, // Match session expiry
		},
	},
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		password: {
			hash: async (password) => {
				return bcrypt.hash(password, 10);
			},
			verify: async ({ password, hash }) => {
				return bcrypt.compare(password, hash);
			},
		},
		async sendResetPassword({ user, url }) {
			await sendPasswordResetEmail({
				to: user.email,
				resetLink: url,
			});
		},
	},
	socialProviders: {
		...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						clientId: process.env.GOOGLE_CLIENT_ID,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET,
					},
				}
			: {}),
	},
});

export type Auth = typeof auth;
