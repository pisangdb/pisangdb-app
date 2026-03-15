import { drizzle } from "drizzle-orm/node-postgres";
import mysql from "mysql2/promise";
import { Pool } from "pg";
import * as schema from "./schema";

export const db = drizzle(
	new Pool({ connectionString: process.env.DATABASE_URL }),
	{ schema },
);

export function createPgAdminPool(region: string) {
	const key = `POSTGRES_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);
	return new Pool({ connectionString: url });
}

export function createMysqlAdminPool(region: string) {
	const key = `MYSQL_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);
	return mysql.createPool(url);
}

export function createMariadbAdminPool(region: string) {
	const key = `MARIADB_SANDBOX_URL_${region.toUpperCase()}`;
	const url = process.env[key];
	if (!url) throw new Error(`${key} is not set`);
	return mysql.createPool(url);
}
