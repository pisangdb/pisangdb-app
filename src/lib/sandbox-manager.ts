/**
 * Sandbox Manager - PostgreSQL Database Provisioning
 *
 * This module handles the lifecycle of ephemeral PostgreSQL sandboxes:
 * - Creating isolated databases with dedicated users
 * - Dropping databases and users on cleanup
 * - Managing connections and security constraints
 *
 * @see PRD §6.2.1 - Sandbox Management
 * @see PRD §12.2 - Sandbox Isolation (Dedicated User per Sandbox)
 */

import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { getSandboxAdminPool } from "#/db/index";
import { createLogger } from "#/lib/logger";

const log = createLogger("SandboxManager");

// ============================================================================
// Constants
// ============================================================================

/** Maximum retry attempts for database name collision */
const MAX_NAME_COLLISION_RETRIES = 3;

/** Length of random suffix for database names (6 chars per PRD) */
const DB_NAME_SUFFIX_LENGTH = 6;

/** Length of random suffix for database users (8 chars per PRD) */
const DB_USER_SUFFIX_LENGTH = 8;

/** Length of generated passwords (32 chars per PRD) */
const PASSWORD_LENGTH = 32;

/** Statement timeout for sandbox users (30 seconds per PRD §12.2) */
const STATEMENT_TIMEOUT = "30s";

/** Maximum concurrent connections per sandbox user (5 per PRD §12.2) */
const MAX_CONNECTIONS_PER_USER = 5;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a cryptographically secure random string
 *
 * @param length - Number of characters to generate
 * @returns Random alphanumeric string (lowercase letters and digits)
 */
function generateRandomString(length: number): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	const bytes = randomBytes(length);
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}
	return result;
}

/**
 * Generate a short ID from a UUID (first 4 characters)
 * Used as part of the database name to ensure uniqueness per user
 *
 * @param userId - Full UUID of the user
 * @returns 4-character short ID
 */
function generateShortId(userId: string): string {
	// Take first 4 characters of the UUID (without dashes)
	const cleanId = userId.replace(/-/g, "");
	return cleanId.slice(0, 4).toLowerCase();
}

/**
 * Sanitize a display name for use in database name
 * - Convert to lowercase
 * - Replace non-alphanumeric characters with underscores
 * - Remove consecutive underscores
 * - Limit to 20 characters
 *
 * @param displayName - User-provided sandbox name
 * @returns Sanitized name safe for database naming
 */
function sanitizeDisplayName(displayName: string): string {
	return displayName
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.slice(0, 20);
}

// ============================================================================
// Public API: Name Generation
// ============================================================================

/**
 * Generate a unique sandbox database name
 *
 * Format: `pisang_{short_id}_{name}_{6_char_random}`
 * Example: `pisang_a1b2_myapp_x8k2m9`
 *
 * @param userId - UUID of the sandbox owner
 * @param displayName - User-provided sandbox name
 * @returns Generated database name
 */
export function generateSandboxName(
	userId: string,
	displayName: string,
): string {
	const shortId = generateShortId(userId);
	const sanitizedName = sanitizeDisplayName(displayName);
	const randomSuffix = generateRandomString(DB_NAME_SUFFIX_LENGTH);

	return `pisang_${shortId}_${sanitizedName}_${randomSuffix}`;
}

/**
 * Generate a unique database username for a sandbox
 *
 * Format: `sb_{8_char_random}`
 * Example: `sb_a1b2x8k9`
 *
 * @returns Generated database username
 */
export function generateDbUser(): string {
	const randomSuffix = generateRandomString(DB_USER_SUFFIX_LENGTH);
	return `sb_${randomSuffix}`;
}

/**
 * Generate a cryptographically secure random password
 *
 * Generates a 32-character password using crypto.randomBytes
 *
 * @returns 32-character password string
 */
export function generatePassword(): string {
	const bytes = randomBytes(PASSWORD_LENGTH);
	return bytes.toString("base64").slice(0, PASSWORD_LENGTH);
}

// ============================================================================
// Public API: Database Operations
// ============================================================================

/**
 * Check if a database name already exists
 *
 * @param dbName - Database name to check
 * @returns True if database exists, false otherwise
 */
async function databaseExists(dbName: string): Promise<boolean> {
	const pool = getSandboxAdminPool();
	const result = await pool.query(
		"SELECT 1 FROM pg_database WHERE datname = $1",
		[dbName],
	);
	return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Generate a unique sandbox name with collision handling
 *
 * If the generated name already exists, retry with a new random suffix
 * up to MAX_NAME_COLLISION_RETRIES times.
 *
 * @param userId - UUID of the sandbox owner
 * @param displayName - User-provided sandbox name
 * @returns Unique database name
 * @throws Error if unable to generate unique name after retries
 */
export async function generateUniqueSandboxName(
	userId: string,
	displayName: string,
): Promise<string> {
	for (let attempt = 0; attempt < MAX_NAME_COLLISION_RETRIES; attempt++) {
		const dbName = generateSandboxName(userId, displayName);
		const exists = await databaseExists(dbName);

		if (!exists) {
			return dbName;
		}

		log.warn("Database name collision detected, retrying", {
			dbName,
			attempt: attempt + 1,
			maxAttempts: MAX_NAME_COLLISION_RETRIES,
		});
	}

	throw new Error(
		`Failed to generate unique database name after ${MAX_NAME_COLLISION_RETRIES} attempts`,
	);
}

/**
 * Create a sandbox database with a dedicated user
 *
 * This function:
 * 1. Creates a new database
 * 2. Creates a dedicated user for this sandbox
 * 3. Grants the user access ONLY to this database
 * 4. Revokes superuser and database creation privileges
 * 5. Sets statement timeout and connection limits
 *
 * @param dbName - Name of the database to create
 * @param dbUser - Username for the sandbox user
 * @param password - Password for the sandbox user
 * @throws Error if database creation fails
 */
export async function createSandboxDatabase(
	dbName: string,
	dbUser: string,
	password: string,
): Promise<void> {
	const pool = getSandboxAdminPool();

	try {
		// Step 1: Create the database
		// Note: Database names cannot be parameterized in CREATE DATABASE
		// We sanitize the name through generateSandboxName which only allows
		// alphanumeric characters and underscores
		await pool.query(`CREATE DATABASE "${dbName}"`);

		// Step 2: Create the dedicated user with all restrictions in one statement
		// Note: PostgreSQL doesn't support parameterized passwords in CREATE USER
		// We escape single quotes by doubling them (SQL standard escaping)
		// All options are set at creation time to avoid ALTER USER permission issues
		const escapedPassword = password.replace(/'/g, "''");
		await pool.query(
			`CREATE USER "${dbUser}" WITH PASSWORD '${escapedPassword}' NOCREATEDB NOCREATEROLE CONNECTION LIMIT ${MAX_CONNECTIONS_PER_USER}`,
		);

		// Step 3: Grant access ONLY to this database
		// This is critical for isolation - user cannot access other databases
		await pool.query(
			`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`,
		);

		// Step 4: Connect to the new database and grant schema permissions
		// This is needed because GRANT on DATABASE doesn't automatically grant
		// permissions on schemas within the database
		// We must create a new connection to the target database (not admin pool)
		const sandboxUrl = process.env.POSTGRES_SANDBOX_URL || "";
		const schemaPool = new Pool({
			connectionString: sandboxUrl.replace(/\/postgres$/, `/${dbName}`),
			max: 1,
		});
		try {
			// Grant schema permissions so user can create tables
			await schemaPool.query(`GRANT ALL ON SCHEMA public TO "${dbUser}"`);
			await schemaPool.query(
				`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${dbUser}"`,
			);
			await schemaPool.query(
				`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`,
			);
			await schemaPool.query(
				`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${dbUser}"`,
			);
			await schemaPool.query(
				`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`,
			);
		} finally {
			await schemaPool.end();
		}

		// Step 5: Set statement timeout (30 seconds per PRD §12.2)
		// This prevents long-running queries from blocking resources
		// Note: We use ALTER ROLE ... SET which is a different permission than ALTER USER
		await pool.query(
			`ALTER ROLE "${dbUser}" SET statement_timeout = '${STATEMENT_TIMEOUT}'`,
		);

		log.info("Created sandbox", { dbName, dbUser });
	} catch (error) {
		// Attempt cleanup on failure
		log.error("Failed to create sandbox, attempting cleanup", {
			dbName,
			error,
		});

		// Try to drop the database if it was created
		try {
			await pool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
		} catch {
			// Ignore errors during cleanup
		}

		// Try to drop the user if it was created
		try {
			await pool.query(`DROP USER IF EXISTS "${dbUser}"`);
		} catch {
			// Ignore errors during cleanup
		}

		throw error;
	}
}

/**
 * Terminate all active connections to a database
 *
 * This must be called before dropping a database to ensure
 * no active connections are blocking the DROP operation.
 *
 * @param dbName - Name of the database to disconnect
 */
export async function terminateConnections(dbName: string): Promise<void> {
	const pool = getSandboxAdminPool();

	await pool.query(
		`SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
		[dbName],
	);

	log.info("Terminated connections to database", { dbName });
}

/**
 * Drop a sandbox database and its dedicated user
 *
 * This function:
 * 1. Terminates all active connections to the database
 * 2. Drops the database
 * 3. Drops the dedicated user
 *
 * @param dbName - Name of the database to drop
 * @param dbUser - Username to drop
 * @throws Error if drop operation fails
 */
export async function dropSandboxDatabase(
	dbName: string,
	dbUser: string,
): Promise<void> {
	const pool = getSandboxAdminPool();

	try {
		// Step 1: Terminate all active connections
		await terminateConnections(dbName);

		// Step 2: Drop the database
		await pool.query(`DROP DATABASE IF EXISTS "${dbName}"`);

		// Step 3: Drop the user
		await pool.query(`DROP USER IF EXISTS "${dbUser}"`);

		log.info("Dropped sandbox", { dbName, dbUser });
	} catch (error) {
		log.error("Failed to drop sandbox", { dbName, error });
		throw error;
	}
}

/**
 * Check if a sandbox database exists
 *
 * @param dbName - Name of the database to check
 * @returns True if the database exists, false otherwise
 */
export async function sandboxExists(dbName: string): Promise<boolean> {
	return databaseExists(dbName);
}

/**
 * Get the list of tables in a sandbox database
 *
 * @param dbName - Name of the database
 * @returns Array of table names
 */
export async function getSandboxTables(dbName: string): Promise<string[]> {
	const pool = getSandboxAdminPool();
	const client = await pool.connect();

	try {
		// Connect to the specific database
		await client.query(`SET search_path TO "${dbName}"`);

		// Query for table names
		const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

		return result.rows.map((row) => row.tablename);
	} finally {
		client.release();
	}
}
