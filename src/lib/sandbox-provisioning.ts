import type { Pool as MySqlPool } from "mysql2/promise";
import { Pool } from "pg";
import {
	createMariadbAdminPool,
	createMysqlAdminPool,
	createPgAdminPool,
} from "#/db";
import type { DbEngine } from "#/lib/types";

export type AdminPool = Pool | MySqlPool;

const PROVISION_TIMEOUT_MS = 30_000;

async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
): Promise<T> {
	const timeout = new Promise<never>((_, reject) =>
		setTimeout(
			() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
			timeoutMs,
		),
	);
	return Promise.race([promise, timeout]);
}

export function getAdminPool(engine: DbEngine, region: string): AdminPool {
	switch (engine) {
		case "postgresql":
			return createPgAdminPool(region);
		case "mysql":
			return createMysqlAdminPool(region);
		case "mariadb":
			return createMariadbAdminPool(region);
		default:
			throw new Error(`Unsupported engine: ${engine}`);
	}
}

export function generateRandomString(length: number): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	const randomValues = new Uint32Array(length);
	crypto.getRandomValues(randomValues);
	for (let i = 0; i < length; i++) {
		result += chars[randomValues[i] % chars.length];
	}
	return result;
}

// Strict validation: pisang_{8 alphanum}_{1-20 alphanum/hyphen}_{6 alphanum}
const DB_NAME_PATTERN =
	/^pisang_[a-z0-9]{8}_[a-z0-9][a-z0-9-]{0,18}[a-z0-9]_[a-z0-9]{6}$/;

export function validateDbName(dbName: string): void {
	if (!DB_NAME_PATTERN.test(dbName)) {
		throw new Error(
			`Invalid database name: "${dbName}". Must match pattern pisang_{8 alphanum}_{name}_{6 alphanum}`,
		);
	}
}

export function generateDbName(
	userShortId: string,
	displayName: string,
): string {
	const sanitizedName = displayName
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "-")
		.slice(0, 20);
	const randomSuffix = generateRandomString(6);
	return `pisang_${userShortId.toLowerCase()}_${sanitizedName}_${randomSuffix}`;
}

export function generateDbUser(): string {
	return `sb_${generateRandomString(8)}`;
}

export function generateDbPassword(): string {
	return generateRandomString(32);
}

export function generateSandboxCredentials(
	userId: string,
	displayName: string,
	engine: DbEngine,
	region = "id",
): {
	dbName: string;
	dbUser: string;
	dbPassword: string;
	host: string;
	port: number;
	connectionUrl: string;
} {
	const shortUid = userId.slice(0, 8);
	const dbName = generateDbName(shortUid, displayName);
	const dbUser = generateDbUser();
	const dbPassword = generateDbPassword();
	const host = `${region}.pisangdb.com`;
	const port = ENGINE_PORTS[engine];
	const encodedPassword = encodeURIComponent(dbPassword);
	const connectionUrl =
		engine === "postgresql"
			? `postgresql://${dbUser}:${encodedPassword}@${host}:${port}/${dbName}`
			: `mysql://${dbUser}:${encodedPassword}@${host}:${port}/${dbName}`;
	return { dbName, dbUser, dbPassword, host, port, connectionUrl };
}

export async function provisionPostgreSQL(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	validateDbName(dbName);
	const pgPool = pool as Pool;
	const client = await pgPool.connect();
	const escapedPassword = dbPassword.replace(/'/g, "''");
	try {
		await withTimeout(
			client.query(`CREATE DATABASE "${dbName}"`),
			PROVISION_TIMEOUT_MS,
		);
		await withTimeout(
			client.query(
				`CREATE USER "${dbUser}" WITH PASSWORD '${escapedPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE`,
			),
			PROVISION_TIMEOUT_MS,
		);
		await withTimeout(
			client.query(
				`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`,
			),
			PROVISION_TIMEOUT_MS,
		);
		await withTimeout(
			client.query(
				`ALTER USER "${dbUser}" NOSUPERUSER NOCREATEDB NOCREATEROLE`,
			),
			PROVISION_TIMEOUT_MS,
		);
		await withTimeout(
			client.query(`ALTER ROLE "${dbUser}" SET statement_timeout = '30s'`),
			PROVISION_TIMEOUT_MS,
		);
		await withTimeout(
			client.query(`GRANT CONNECT ON DATABASE "${dbName}" TO "${dbUser}"`),
			PROVISION_TIMEOUT_MS,
		);

		await withTimeout(
			client.query(`ALTER DATABASE "${dbName}" OWNER TO "${dbUser}"`),
			PROVISION_TIMEOUT_MS,
		);
	} finally {
		client.release();
	}
}

export async function deprovisionPostgreSQL(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
	region: string,
): Promise<void> {
	const pgPool = pool as Pool;

	// Step 1: Terminate all connections to this database
	// This MUST be executed from postgres database (where pg_stat_activity lives)
	const client = await pgPool.connect();
	try {
		await client.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1::name AND usename = $2::name AND pid <> pg_backend_pid()`,
			[dbName, dbUser],
		);
	} finally {
		client.release();
	}

	// Step 2: Clean up user objects within the target database.
	// Reconstruct a connection string to the target database (same host/creds as admin,
	// just with the target db name instead of "postgres").
	const adminUrl =
		process.env[`POSTGRES_SANDBOX_URL_${region.toUpperCase()}`] ??
		process.env.POSTGRES_SANDBOX_URL_ID;
	if (!adminUrl) {
		throw new Error(
			`Neither POSTGRES_SANDBOX_URL_${region.toUpperCase()} nor POSTGRES_SANDBOX_URL_ID is set`,
		);
	}

	const targetDbUrl = adminUrl.replace(/\/postgres(\?.*)?$/, `/${dbName}$1`);
	let targetDbPool: Pool | null = null;

	try {
		targetDbPool = new Pool({ connectionString: targetDbUrl });
		const targetClient = await targetDbPool.connect();
		try {
			await targetClient
				.query(
					`ALTER DEFAULT PRIVILEGES FOR USER "${dbUser}" IN SCHEMA public REVOKE ALL ON TABLES FROM "${dbUser}"`,
				)
				.catch(() => {
					/* ignore */
				});
			await targetClient
				.query(
					`ALTER DEFAULT PRIVILEGES FOR USER "${dbUser}" IN SCHEMA public REVOKE ALL ON SEQUENCES FROM "${dbUser}"`,
				)
				.catch(() => {
					/* ignore */
				});
			await targetClient
				.query(
					`ALTER DEFAULT PRIVILEGES FOR USER "${dbUser}" IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM "${dbUser}"`,
				)
				.catch(() => {
					/* ignore */
				});
			await targetClient
				.query(`REASSIGN OWNED BY "${dbUser}" TO postgres`)
				.catch(() => {
					/* ignore */
				});
			await targetClient
				.query(`DROP OWNED BY "${dbUser}" CASCADE`)
				.catch(() => {
					/* ignore */
				});
		} finally {
			targetClient.release();
		}
	} catch (error) {
		// If the database doesn't exist (code 3D000), skip Step 2 entirely —
		// DROP DATABASE IF EXISTS in Step 3 handles it safely.
		const isNotFound =
			error instanceof Error &&
			"code" in error &&
			(error as { code: string }).code === "3D000";
		if (!isNotFound) {
			throw error;
		}
		/* otherwise, database already gone — proceed to Step 3 */
	} finally {
		if (targetDbPool) await targetDbPool.end();
	}

	// Step 3: Drop the database (now that all objects and privileges are cleaned)
	const dropDbClient = await pgPool.connect();
	try {
		await dropDbClient
			.query(`DROP DATABASE IF EXISTS "${dbName}"`)
			.catch(() => {
				/* ignore — already gone */
			});
	} finally {
		dropDbClient.release();
	}

	// Step 4: Drop the user from postgres system catalog
	const adminClient = await pgPool.connect();
	try {
		await adminClient
			.query(
				`REVOKE ALL PRIVILEGES ON DATABASE "${dbName}" FROM "${dbUser}" CASCADE`,
			)
			.catch(() => {
				/* ignore */
			});
		await adminClient
			.query(
				`ALTER DEFAULT PRIVILEGES FOR USER "${dbUser}" IN SCHEMA public REVOKE ALL ON TABLES FROM "${dbUser}"`,
			)
			.catch(() => {
				/* ignore */
			});
		await adminClient
			.query(
				`ALTER DEFAULT PRIVILEGES FOR USER "${dbUser}" IN SCHEMA public REVOKE ALL ON SEQUENCES FROM "${dbUser}"`,
			)
			.catch(() => {
				/* ignore */
			});
		await adminClient
			.query(
				`ALTER DEFAULT PRIVILEGES FOR USER "${dbUser}" IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM "${dbUser}"`,
			)
			.catch(() => {
				/* ignore */
			});
		await adminClient.query(`DROP USER IF EXISTS "${dbUser}"`).catch(() => {
			/* ignore — already gone */
		});
	} finally {
		adminClient.release();
	}
}

export async function provisionMySQL(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	validateDbName(dbName);
	const mysqlPool = pool as MySqlPool;
	const escapedUser = dbUser.replace(/'/g, "''");
	const escapedPassword = dbPassword.replace(/'/g, "''");
	// Note: WITH must come BEFORE IDENTIFIED clause in MySQL CREATE USER syntax
	await withTimeout(
		mysqlPool.query(
			`CREATE USER '${escapedUser}'@'%' WITH MAX_USER_CONNECTIONS 5 IDENTIFIED WITH mysql_native_password BY '${escapedPassword}'`,
		),
		PROVISION_TIMEOUT_MS,
	);
	await withTimeout(
		mysqlPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``),
		PROVISION_TIMEOUT_MS,
	);
	await withTimeout(
		mysqlPool.query(
			`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON \`${dbName}\`.* TO '${escapedUser}'@'%'`,
		),
		PROVISION_TIMEOUT_MS,
	);
	await withTimeout(mysqlPool.query("FLUSH PRIVILEGES"), PROVISION_TIMEOUT_MS);
}

export async function provisionMariaDB(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	validateDbName(dbName);
	const mysqlPool = pool as MySqlPool;
	const escapedUser = dbUser.replace(/'/g, "''");
	const escapedPassword = dbPassword.replace(/'/g, "''");
	// MariaDB: CREATE USER with WITH clause BEFORE IDENTIFIED clause
	await withTimeout(
		mysqlPool.query(
			`CREATE USER '${escapedUser}'@'%' WITH MAX_USER_CONNECTIONS 5 IDENTIFIED BY '${escapedPassword}'`,
		),
		PROVISION_TIMEOUT_MS,
	);
	await withTimeout(
		mysqlPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``),
		PROVISION_TIMEOUT_MS,
	);
	await withTimeout(
		mysqlPool.query(
			`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON \`${dbName}\`.* TO '${escapedUser}'@'%'`,
		),
		PROVISION_TIMEOUT_MS,
	);
	await withTimeout(mysqlPool.query("FLUSH PRIVILEGES"), PROVISION_TIMEOUT_MS);
}

export async function deprovisionMySQL(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
): Promise<void> {
	const mysqlPool = pool as MySqlPool;
	try {
		const [rows] = await mysqlPool.query("SHOW PROCESSLIST");
		const processes = rows as { Id: number; User: string }[];
		for (const proc of processes) {
			if (proc.User === dbUser) {
				await mysqlPool.query(`KILL ${proc.Id}`);
			}
		}
	} catch {
		/* ignore — process list may fail if no permissions */
	}
	await mysqlPool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
	await mysqlPool.query(`DROP USER IF EXISTS '${dbUser}'@'%'`);
	await mysqlPool.query("FLUSH PRIVILEGES");
}

export async function deprovisionMariaDB(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
): Promise<void> {
	const mysqlPool = pool as MySqlPool;
	try {
		const [rows] = await mysqlPool.query("SHOW PROCESSLIST");
		const processes = rows as { Id: number; User: string }[];
		for (const proc of processes) {
			if (proc.User === dbUser) {
				await mysqlPool.query(`KILL ${proc.Id}`);
			}
		}
	} catch {
		/* ignore — process list may fail if no permissions */
	}
	await mysqlPool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
	await mysqlPool.query(`DROP USER IF EXISTS '${dbUser}'@'%'`);
	await mysqlPool.query("FLUSH PRIVILEGES");
}

export const ENGINE_PORTS: Record<DbEngine, number> = {
	postgresql: 5432,
	mysql: 3306,
	mariadb: 3307,
};

export function getSandboxPort(engine: DbEngine, region: string): number {
	const regionKey = region.toUpperCase();
	if (engine === "postgresql") {
		const url =
			process.env[`POSTGRES_SANDBOX_URL_${regionKey}`] ??
			process.env.POSTGRES_SANDBOX_URL_ID ??
			"";
		const match = url.match(/:(\d+)(?:\/|$)/);
		if (match) return parseInt(match[1], 10);
		return 5432;
	}
	if (engine === "mysql") {
		const url =
			process.env[`MYSQL_SANDBOX_URL_${regionKey}`] ??
			process.env.MYSQL_SANDBOX_URL_ID ??
			"";
		const match = url.match(/:(\d+)(?:\/|$)/);
		if (match) return parseInt(match[1], 10);
		return 3306;
	}
	const envUrl =
		process.env[`MARIADB_SANDBOX_URL_${regionKey}`] ??
		process.env.MARIADB_SANDBOX_URL_ID ??
		"";
	const match = envUrl.match(/:(\d+)(?:\/|$)/);
	if (match) return parseInt(match[1], 10);
	return 3307;
}

export function getSandboxConnection(
	engine: DbEngine,
	region: string,
	storedHost: string,
): { host: string; port: number } {
	const devHost = process.env.SANDBOX_HOST ?? storedHost;
	const port = getSandboxPort(engine, region);
	return { host: devHost, port };
}

export function buildConnectionUrl(
	engine: DbEngine,
	region: string,
	dbUser: string,
	dbPassword: string,
	dbName: string,
): string {
	const host = `${region}.pisangdb.com`;
	const port = ENGINE_PORTS[engine];
	const protocol = engine === "postgresql" ? "postgresql" : "mysql";
	return `${protocol}://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;
}
