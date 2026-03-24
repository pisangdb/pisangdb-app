import type { Pool as MySqlPool } from "mysql2/promise";
import { Pool } from "pg";
import { getAdminPool, getSandboxPort } from "#/lib/sandbox-provisioning";
import type { DbEngine, DbRegion } from "#/lib/types";

/**
 * Execute template SQL (DDL + seed) against a sandbox database
 */
export async function executeTemplateSql(
	engine: DbEngine,
	region: DbRegion,
	dbName: string,
	dbUser: string,
	dbPassword: string,
	ddlSql: string,
	seedSql: string | null,
): Promise<void> {
	const host = process.env.SANDBOX_HOST ?? `${region}.pisangdb.com`;
	const port = getSandboxPort(engine, region);

	if (engine === "postgresql") {
		const pool = new Pool({
			host,
			port,
			database: dbName,
			user: dbUser,
			password: dbPassword,
			max: 5,
		});

		try {
			// Execute DDL statements (split by semicolon)
			const ddlStatements = ddlSql
				.split(";")
				.map((s) => s.trim())
				.filter(Boolean);

			for (const statement of ddlStatements) {
				if (statement) {
					await pool.query(statement);
				}
			}

			// Execute seed statements if provided
			if (seedSql) {
				const seedStatements = seedSql
					.split(";")
					.map((s) => s.trim())
					.filter(Boolean);

				for (const statement of seedStatements) {
					if (statement) {
						await pool.query(statement);
					}
				}
			}
		} finally {
			await pool.end();
		}
	} else {
		// MySQL/MariaDB
		const pool = getAdminPool(engine, region) as MySqlPool;

		try {
			// Switch to the sandbox database
			await pool.query(`USE \`${dbName}\``);

			// Execute DDL statements
			const ddlStatements = ddlSql
				.split(";")
				.map((s) => s.trim())
				.filter(Boolean);

			for (const statement of ddlStatements) {
				if (statement) {
					await pool.query(statement);
				}
			}

			// Execute seed statements if provided
			if (seedSql) {
				const seedStatements = seedSql
					.split(";")
					.map((s) => s.trim())
					.filter(Boolean);

				for (const statement of seedStatements) {
					if (statement) {
						await pool.query(statement);
					}
				}
			}
		} finally {
			await pool.end();
		}
	}
}
