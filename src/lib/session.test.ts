import { describe, expect, it } from "vitest";
import {
	decryptPassword,
	encryptPassword,
	generateToken,
	hashPassword,
	verifyPassword,
	verifyToken,
} from "./session";

describe("session.ts", () => {
	describe("encryptPassword / decryptPassword", () => {
		it("should encrypt and decrypt password correctly", () => {
			const password = "my-secret-password-123";
			const encrypted = encryptPassword(password);

			expect(encrypted).not.toBe(password);
			expect(encrypted).toContain(":"); // iv:authTag:ciphertext format

			const decrypted = decryptPassword(encrypted);
			expect(decrypted).toBe(password);
		});

		it("should produce different ciphertext for same password (random IV)", () => {
			const password = "same-password";
			const encrypted1 = encryptPassword(password);
			const encrypted2 = encryptPassword(password);

			expect(encrypted1).not.toBe(encrypted2);
			expect(decryptPassword(encrypted1)).toBe(password);
			expect(decryptPassword(encrypted2)).toBe(password);
		});

		it("should throw on invalid encrypted format", () => {
			expect(() => decryptPassword("invalid")).toThrow();
			expect(() => decryptPassword("not:enough:parts")).toThrow();
		});

		it("should throw on tampered ciphertext (auth tag verification)", () => {
			const password = "test-password";
			const encrypted = encryptPassword(password);
			const [iv, authTag, ciphertext] = encrypted.split(":");

			// Tamper with ciphertext
			const tampered = `${iv}:${authTag}:${ciphertext?.slice(0, -2)}xx`;

			expect(() => decryptPassword(tampered)).toThrow();
		});
	});

	describe("hashPassword / verifyPassword", () => {
		it("should hash password and verify correctly", async () => {
			const password = "user-password";
			const hash = await hashPassword(password);

			expect(hash).not.toBe(password);
			expect(await verifyPassword(password, hash)).toBe(true);
			expect(await verifyPassword("wrong-password", hash)).toBe(false);
		});
	});

	describe("generateToken / verifyToken", () => {
		it("should generate and verify JWT token", async () => {
			const userId = "user-123";
			const token = await generateToken(userId);

			expect(token).toBeDefined();
			expect(typeof token).toBe("string");

			const payload = await verifyToken(token);
			expect(payload).not.toBeNull();
			expect(payload?.userId).toBe(userId);
		});

		it("should return null for invalid token", async () => {
			const payload = await verifyToken("invalid-token");
			expect(payload).toBeNull();
		});
	});
});
