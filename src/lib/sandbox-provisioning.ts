import type { Pool as MySqlPool } from "mysql2/promise";
import type { Pool } from "pg";
import {
	createMariadbAdminPool,
	createMysqlAdminPool,
	createPgAdminPool,
} from "#/db";
import type { DbEngine } from "#/lib/types";

export type AdminPool = Pool | MySqlPool;

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

export function generateDbName(
	userShortId: string,
	displayName: string,
): string {
	const sanitizedName = displayName
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "-")
		.slice(0, 20);
	const randomSuffix = generateRandomString(6);
	return `pisang_${userShortId}_${sanitizedName}_${randomSuffix}`;
}

export function generateDbUser(): string {
	return `sb_${generateRandomString(8)}`;
}

export function generateDbPassword(): string {
	return generateRandomString(32);
}

export async function provisionPostgreSQL(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	const pgPool = pool as Pool;
	const client = await pgPool.connect();
	try {
		await client.query(`CREATE DATABASE "${dbName}"`);
		await client.query(`CREATE USER "${dbUser}" WITH PASSWORD $1`, [
			dbPassword,
		]);
		await client.query(
			`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`,
		);
		await client.query(
			`ALTER USER "${dbUser}" NOSUPERUSER NOCREATEDB NOCREATEROLE`,
		);
		await client.query(`ALTER ROLE "${dbUser}" SET statement_timeout = '30s'`);
		await client.query(`GRANT CONNECT ON DATABASE "${dbName}" TO "${dbUser}"`);

		await client.query(`ALTER DATABASE "${dbName}" OWNER TO "${dbUser}"`);
	} finally {
		client.release();
	}
}

export async function deprovisionPostgreSQL(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
): Promise<void> {
	const pgPool = pool as Pool;
	const client = await pgPool.connect();
	try {
		await client.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND usename = $2`,
			[dbName, dbUser],
		);
		await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
		await client.query(`DROP USER IF EXISTS "${dbUser}"`);
	} finally {
		client.release();
	}
}

export async function provisionMySQL(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
	dbPassword: string,
): Promise<void> {
	const mysqlPool = pool as MySqlPool;
	await mysqlPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
	await mysqlPool.query(`CREATE USER '${dbUser}'@'%' IDENTIFIED BY ?`, [
		dbPassword,
	]);
	await mysqlPool.query(
		`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON \`${dbName}\`.* TO '${dbUser}'@'%'`,
	);
	await mysqlPool.query("FLUSH PRIVILEGES");
}

export async function deprovisionMySQL(
	pool: AdminPool,
	dbName: string,
	dbUser: string,
): Promise<void> {
	const mysqlPool = pool as MySqlPool;
	const [rows] = await mysqlPool.query("SHOW PROCESSLIST");
	const processes = rows as { Id: number; User: string }[];
	for (const proc of processes) {
		if (proc.User === dbUser) {
			await mysqlPool.query(`KILL ${proc.Id}`);
		}
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
	// MariaDB uses the same protocol as MySQL, so we can reuse mysql2
	// But we need to use the correct syntax for MariaDB
	const mysqlPool = pool as MySqlPool;
	const [rows] = await mysqlPool.query("SHOW PROCESSLIST");
	const processes = rows as { Id: number; User: string }[];
	for (const proc of processes) {
		if (proc.User === dbUser) {
			await mysqlPool.query(`KILL ${proc.Id}`);
		}
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
