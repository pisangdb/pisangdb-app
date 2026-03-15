import { drizzle } from "drizzle-orm/node-postgres";
import mysql from "mysql2/promise";
import { Pool } from "pg";
import * as schema from "./schema";

export const db = drizzle(
	new Pool({ connectionString: process.env.DATABASE_URL }),
	{ schema },
);

export function createPgAdminPool() {
	const url = process.env.POSTGRES_SANDBOX_URL;
	if (!url) throw new Error("POSTGRES_SANDBOX_URL is not set");
	return new Pool({ connectionString: url });
}

export function createMysqlAdminPool() {
	const url = process.env.MYSQL_SANDBOX_URL;
	if (!url) throw new Error("MYSQL_SANDBOX_URL is not set");
	return mysql.createPool(url);
}

export function createMariadbAdminPool() {
	const url = process.env.MARIADB_SANDBOX_URL;
	if (!url) throw new Error("MARIADB_SANDBOX_URL is not set");
	return mysql.createPool(url);
}
