import { describe, expect, it, vi } from "vitest";

vi.mock("#/db/index", () => ({
	getAppPool: vi.fn(),
	getSandboxAdminPool: vi.fn(),
	db: {},
	getAppDb: vi.fn(),
	getSandboxAdminDb: vi.fn(),
	closeConnections: vi.fn(),
}));

import {
	generateDbUser,
	generatePassword,
	generateSandboxName,
} from "./sandbox-manager";

describe("sandbox-manager.ts", () => {
	describe("generateSandboxName", () => {
		it("should generate name in correct format", () => {
			const userId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
			const displayName = "my-app";

			const name = generateSandboxName(userId, displayName);

			expect(name).toMatch(/^pisang_[a-z0-9]{4}_[a-z0-9_]+_[a-z0-9]{6}$/);
		});

		it("should sanitize special characters in display name", () => {
			const userId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
			const displayName = "My App@Test!";

			const name = generateSandboxName(userId, displayName);

			expect(name).not.toContain("@");
			expect(name).not.toContain("!");
			expect(name).toMatch(/^[a-z0-9_]+$/);
		});

		it("should extract short ID from userId correctly", () => {
			const userId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
			const displayName = "test";

			const name = generateSandboxName(userId, displayName);

			expect(name).toContain("a1b2");
		});

		it("should generate unique names for same inputs due to random suffix", () => {
			const userId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
			const displayName = "my-app";

			const names = new Set<string>();
			for (let i = 0; i < 100; i++) {
				names.add(generateSandboxName(userId, displayName));
			}

			expect(names.size).toBe(100);
		});

		it("should handle empty display name", () => {
			const userId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
			const displayName = "";

			const name = generateSandboxName(userId, displayName);

			expect(name).toMatch(/^pisang_[a-z0-9]{4}_[a-z0-9_]*_[a-z0-9]{6}$/);
		});

		it("should truncate long display names to 20 characters", () => {
			const userId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
			const displayName =
				"this-is-a-very-long-display-name-that-should-be-truncated";

			const name = generateSandboxName(userId, displayName);
			const parts = name.split("_");
			const sanitizedName = parts.slice(2, -1).join("_");

			expect(sanitizedName.length).toBeLessThanOrEqual(20);
		});
	});

	describe("generateDbUser", () => {
		it("should generate username in correct format", () => {
			const user = generateDbUser();

			expect(user).toMatch(/^sb_[a-z0-9]{8}$/);
		});

		it("should generate unique usernames", () => {
			const users = new Set<string>();
			for (let i = 0; i < 100; i++) {
				users.add(generateDbUser());
			}

			expect(users.size).toBe(100);
		});

		it("should always start with sb_ prefix", () => {
			for (let i = 0; i < 50; i++) {
				const user = generateDbUser();
				expect(user.startsWith("sb_")).toBe(true);
			}
		});
	});

	describe("generatePassword", () => {
		it("should generate 32-character password", () => {
			const password = generatePassword();

			expect(password.length).toBe(32);
		});

		it("should generate unique passwords", () => {
			const passwords = new Set<string>();
			for (let i = 0; i < 100; i++) {
				passwords.add(generatePassword());
			}

			expect(passwords.size).toBe(100);
		});

		it("should generate alphanumeric passwords from base64 characters", () => {
			const password = generatePassword();

			expect(password).toMatch(/^[A-Za-z0-9+/]+$/);
		});
	});
});
