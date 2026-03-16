import { Pool } from "pg";
import type { DbManager, SandboxCredentials } from "./interface";

export class PostgresManager implements DbManager {
	engine = "postgresql" as const;
	private pool: Pool;

	constructor(adminUrl: string) {
		this.pool = new Pool({ connectionString: adminUrl, max: 1 });
	}

	async createSandboxDatabase(credentials: SandboxCredentials): Promise<void> {
		const escapedPassword = credentials.dbPassword.replace(/'/g, "''");

		await this.pool.query(`CREATE DATABASE "${credentials.dbName}"`);

		await this.pool.query(
			`CREATE USER "${credentials.dbUser}" WITH PASSWORD '${escapedPassword}' NOCREATEDB NOCREATEROLE CONNECTION LIMIT 5`,
		);

		await this.pool.query(
			`GRANT ALL PRIVILEGES ON DATABASE "${credentials.dbName}" TO "${credentials.dbUser}"`,
		);

		const sandboxPool = new Pool({
			connectionString: credentials.host.includes("localhost")
				? `postgresql://${credentials.dbUser}:${credentials.dbPassword}@${credentials.host}:${credentials.port}/${credentials.dbName}`
				: `postgresql://${credentials.dbUser}:${credentials.dbPassword}@${credentials.host}:${credentials.port}/${credentials.dbName}`,
			max: 1,
		});

		await sandboxPool.query(
			`GRANT ALL ON SCHEMA public TO "${credentials.dbUser}"`,
		);
		await sandboxPool.query(
			`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${credentials.dbUser}"`,
		);
		await sandboxPool.end();

		await this.pool.query(
			`ALTER ROLE "${credentials.dbUser}" SET statement_timeout = '30s'`,
		);
	}

	async dropSandboxDatabase(dbName: string, dbUser: string): Promise<void> {
		await this.pool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
		await this.pool.query(`DROP USER IF EXISTS "${dbUser}"`);
	}

	async terminateConnections(dbName: string): Promise<void> {
		await this.pool.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
			[dbName],
		);
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.pool.query("SELECT 1");
			return true;
		} catch {
			return false;
		}
	}
}
