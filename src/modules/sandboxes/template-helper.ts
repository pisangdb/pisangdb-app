import type { Pool as MySqlPool } from "mysql2/promise";
import { Pool } from "pg";
import {
	getSandboxConnection,
	validateDbName,
} from "#/lib/sandbox-provisioning";
import type { DbEngine, DbRegion } from "#/lib/types";

/**
 * Execute template SQL (DDL + seed) against a sandbox database
 */
export async function executeTemplateSql(
	engine: DbEngine,
	region: DbRegion,
	host: string,
	port: number,
	dbName: string,
	_dbUser: string,
	_dbPassword: string,
	ddlSql: string,
	seedSql: string | null,
): Promise<void> {
	// Validate database name for defense in depth
	validateDbName(dbName);

	const connection = getSandboxConnection(engine, region, host, port);

	if (engine === "postgresql") {
		const pool = new Pool({
			host: connection.host,
			port: connection.port,
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
		const mysql = await import("mysql2/promise");
		const pool = mysql.createPool({
			host: connection.host,
			port: connection.port,
			database: dbName,
			user: _dbUser,
			password: _dbPassword,
			waitForConnections: true,
			connectionLimit: 3,
			...(engine === "mariadb" && {
				authPlugin: "mysql_native_password",
			}),
		}) as MySqlPool;

		try {
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
