/**
 * Session Management Utilities for PisangDB
 *
 * Provides JWT token generation/verification and password hashing utilities.
 * Per PRD §6.1.2:
 * - JWT expiration: 7 days
 * - bcrypt cost factor: ≥10 (using 12 for good security/performance balance)
 * - HTTP-only, Secure, SameSite=Strict cookies
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
// 7 days in seconds (604800) - per PRD §6.1.2
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds
const BCRYPT_COST = 12; // ≥10 per PRD, using 12 for better security

// Cookie configuration (per PRD §6.1.2)
const COOKIE_NAME = "session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds (604800)

// AES-256-GCM encryption configuration for sandbox passwords
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

// JWT payload type
interface JwtPayload {
	userId: string;
}

/**
 * Gets the JWT secret, throwing if not configured
 * @returns The JWT secret string
 * @throws Error if JWT_SECRET is not set
 */
function getJwtSecret(): string {
	if (!JWT_SECRET) {
		throw new Error(
			"JWT_SECRET environment variable is not configured. Please set it in your .env file.",
		);
	}
	return JWT_SECRET;
}

/**
 * Gets the encryption key, throwing if not configured
 * @returns The encryption key as a Buffer (32 bytes)
 * @throws Error if ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
	if (!ENCRYPTION_KEY) {
		throw new Error(
			"ENCRYPTION_KEY environment variable is not configured. Please set it in your .env file.",
		);
	}
	// Key must be 32 bytes for AES-256 (64 hex characters)
	const key = Buffer.from(ENCRYPTION_KEY, "hex");
	if (key.length !== 32) {
		throw new Error(
			"ENCRYPTION_KEY must be 32 bytes (64 hex characters). Generate with: openssl rand -hex 32",
		);
	}
	return key;
}

/**
 * Encrypts a password using AES-256-GCM
 *
 * Used for sandbox database passwords that need to be retrievable.
 * Returns format: iv:authTag:ciphertext (all hex-encoded)
 *
 * @param plaintext - The plain text password to encrypt
 * @returns Encrypted password string (iv:authTag:ciphertext format)
 * @throws Error if ENCRYPTION_KEY is not configured
 */
export function encryptPassword(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	let encrypted = cipher.update(plaintext, "utf8", "hex");
	encrypted += cipher.final("hex");

	const authTag = cipher.getAuthTag();

	// Format: iv:authTag:encrypted (all hex)
	return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a password that was encrypted with AES-256-GCM
 *
 * @param encrypted - The encrypted password string (iv:authTag:ciphertext format)
 * @returns The decrypted plain text password
 * @throws Error if ENCRYPTION_KEY is not configured or decryption fails
 */
export function decryptPassword(encrypted: string): string {
	const key = getEncryptionKey();
	const parts = encrypted.split(":");

	if (parts.length !== 3) {
		throw new Error("Invalid encrypted password format");
	}

	const [ivHex, authTagHex, ciphertext] = parts;

	if (!ivHex || !authTagHex || !ciphertext) {
		throw new Error("Invalid encrypted password format");
	}

	const iv = Buffer.from(ivHex, "hex");
	const authTag = Buffer.from(authTagHex, "hex");

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(ciphertext, "hex", "utf8");
	decrypted += decipher.final("utf8");

	return decrypted;
}

/**
 * Generates a JWT token for a user session
 *
 * @param userId - The user's unique identifier
 * @returns Promise resolving to the signed JWT token
 * @throws Error if JWT_SECRET is not configured
 */
export async function generateToken(userId: string): Promise<string> {
	const secret = getJwtSecret();

	return new Promise((resolve, reject) => {
		jwt.sign(
			{ userId },
			secret,
			{ expiresIn: JWT_EXPIRES_IN_SECONDS },
			(err, token) => {
				if (err) {
					reject(err);
				} else if (token) {
					resolve(token);
				} else {
					reject(new Error("Failed to generate token"));
				}
			},
		);
	});
}

/**
 * Verifies and decodes a JWT token
 *
 * @param token - The JWT token to verify
 * @returns Promise resolving to the decoded payload { userId } or null if invalid
 */
export async function verifyToken(
	token: string,
): Promise<{ userId: string } | null> {
	const secret = getJwtSecret();

	return new Promise((resolve) => {
		jwt.verify(token, secret, (err, decoded) => {
			if (err) {
				resolve(null);
			} else {
				const payload = decoded as JwtPayload;
				resolve({ userId: payload.userId });
			}
		});
	});
}

/**
 * Hashes a password using bcrypt
 *
 * Uses cost factor 12 (≥10 per PRD §6.1.2) for good security vs performance balance.
 *
 * @param password - The plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verifies a password against a bcrypt hash
 *
 * @param password - The plain text password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Creates session cookie configuration for TanStack Start
 *
 * Per PRD §6.1.2:
 * - HTTP-only: true (prevents XSS access)
 * - Secure: true in production (HTTPS only)
 * - SameSite: 'Strict' (CSRF protection)
 * - MaxAge: 7 days (604800 seconds)
 *
 * @param token - The JWT token to set in the cookie
 * @returns Cookie configuration object for TanStack Start
 */
export function createSessionCookie(token: string): {
	name: string;
	value: string;
	options: {
		httpOnly: boolean;
		secure: boolean;
		sameSite: "strict" | "lax" | "none";
		maxAge: number;
		path: string;
	};
} {
	const isProduction = process.env.NODE_ENV === "production";

	return {
		name: COOKIE_NAME,
		value: token,
		options: {
			httpOnly: true,
			secure: isProduction,
			sameSite: "strict",
			maxAge: COOKIE_MAX_AGE,
			path: "/",
		},
	};
}

/**
 * Creates cookie configuration to clear the session cookie
 *
 * @returns Cookie configuration object for clearing the session cookie
 */
export function clearSessionCookie(): {
	name: string;
	options: {
		httpOnly: boolean;
		secure: boolean;
		sameSite: "strict" | "lax" | "none";
		maxAge: number;
		path: string;
	};
} {
	const isProduction = process.env.NODE_ENV === "production";

	return {
		name: COOKIE_NAME,
		options: {
			httpOnly: true,
			secure: isProduction,
			sameSite: "strict",
			maxAge: 0, // Setting maxAge to 0 clears the cookie
			path: "/",
		},
	};
}

/**
 * Extracts user ID from request cookies
 *
 * @param cookies - The cookies object from the request
 * @returns The user ID if valid session, null otherwise
 */
export async function getUserIdFromCookies(
	cookies: Record<string, string | undefined>,
): Promise<string | null> {
	const token = cookies[COOKIE_NAME];
	if (!token) {
		return null;
	}

	const payload = await verifyToken(token);
	return payload?.userId ?? null;
}
