import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const ENCODING = "base64";

/**
 * Get the encryption key from BETTER_AUTH_SECRET.
 * Derives a 32-byte key using SHA-256.
 */
function getEncryptionKey(): Buffer {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) {
		throw new Error("BETTER_AUTH_SECRET is not set");
	}
	return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a password using AES-256-GCM.
 * Returns: iv:authTag:encryptedData (all base64 encoded)
 */
export function encryptPassword(plainText: string): string {
	const key = getEncryptionKey();
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

	let encrypted = cipher.update(plainText, "utf8", ENCODING);
	encrypted += cipher.final(ENCODING);

	const authTag = cipher.getAuthTag();

	// Format: iv:authTag:encryptedData
	return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
}

/**
 * Decrypt a password encrypted with encryptPassword.
 * Input format: iv:authTag:encryptedData (all base64 encoded)
 */
export function decryptPassword(encryptedText: string): string {
	const key = getEncryptionKey();

	const parts = encryptedText.split(":");
	if (parts.length !== 3) {
		throw new Error("Invalid encrypted password format");
	}

	const [ivB64, authTagB64, encryptedData] = parts;
	const iv = Buffer.from(ivB64, ENCODING);
	const authTag = Buffer.from(authTagB64, ENCODING);

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(encryptedData, ENCODING, "utf8");
	decrypted += decipher.final("utf8");

	return decrypted;
}
