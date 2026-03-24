import type { Pool as MySqlPool } from "mysql2/promise";
import { Pool } from "pg";
import {
	getAdminPool,
	getSandboxPort,
	validateDbName,
} from "#/lib/sandbox-provisioning";
import type { DbEngine, DbRegion } from "#/lib/types";

/**
 * Execute template SQL (DDL + seed) against a sandbox database
 */
export async function executeTemplateSql(
	engine: DbEngine,
	region: DbRegion,
	dbName: string,
	_dbUser: string,
	_dbPassword: string,
	ddlSql: string,
	seedSql: string | null,
): Promise<void> {
	// Validate database name for defense in depth
	validateDbName(dbName);

	const host = process.env.SANDBOX_HOST ?? `${region}.pisangdb.com`;
	const port = getSandboxPort(engine, region);

	if (engine === "postgresql") {
		const pool = new Pool({
			host,
			port,
			database: dbName,
			user: _dbUser,
			password: _dbPassword,
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
					try {
						await pool.query(statement);
					} catch (err) {
						throw new Error(
							`Failed to execute DDL: ${statement.slice(0, 50)}... Error: ${err instanceof Error ? err.message : String(err)}`,
						);
					}
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
						try {
							await pool.query(statement);
						} catch (err) {
							throw new Error(
								`Failed to execute seed: ${statement.slice(0, 50)}... Error: ${err instanceof Error ? err.message : String(err)}`,
							);
						}
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
			// dbName is already validated, safe to use in backtick-quoted identifier
			await pool.query(`USE \`${dbName}\``);

			// Execute DDL statements
			const ddlStatements = ddlSql
				.split(";")
				.map((s) => s.trim())
				.filter(Boolean);

			for (const statement of ddlStatements) {
				if (statement) {
					try {
						await pool.query(statement);
					} catch (err) {
						throw new Error(
							`Failed to execute DDL: ${statement.slice(0, 50)}... Error: ${err instanceof Error ? err.message : String(err)}`,
						);
					}
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
						try {
							await pool.query(statement);
						} catch (err) {
							throw new Error(
								`Failed to execute seed: ${statement.slice(0, 50)}... Error: ${err instanceof Error ? err.message : String(err)}`,
							);
						}
					}
				}
			}
		} finally {
			await pool.end();
		}
	}
}
