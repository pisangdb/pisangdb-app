import mysql, { type Pool } from "mysql2/promise";
import type { DbManager, SandboxCredentials } from "./interface";

export class MySqlManager implements DbManager {
	engine = "mysql" as const;
	private pool: Pool;

	constructor(adminUrl: string) {
		this.pool = mysql.createPool({
			uri: adminUrl,
			waitForConnections: true,
			connectionLimit: 1,
		});
	}

	async createSandboxDatabase(credentials: SandboxCredentials): Promise<void> {
		await this.pool.query(`CREATE DATABASE \`${credentials.dbName}\``);

		await this.pool.query(`CREATE USER ?@'%' IDENTIFIED BY ?`, [
			credentials.dbUser,
			credentials.dbPassword,
		]);

		await this.pool.query(
			`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON \`${credentials.dbName}\`.* TO ?@'%'`,
			[credentials.dbUser],
		);

		await this.pool.query("FLUSH PRIVILEGES");
	}

	async dropSandboxDatabase(dbName: string, dbUser: string): Promise<void> {
		await this.pool.query(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'`, [
			dbUser,
		]);
		await this.pool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
		await this.pool.query(`DROP USER IF EXISTS ?@'%'`, [dbUser]);
		await this.pool.query("FLUSH PRIVILEGES");
	}

	async terminateConnections(dbName: string): Promise<void> {
		const [rows] = await this.pool.query(
			"SELECT id FROM information_schema.processlist WHERE db = ?",
			[dbName],
		);
		const processes = rows as Array<{ id: number }>;
		for (const proc of processes) {
			await this.pool.query("KILL ?", [proc.id]);
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.pool.query("SELECT 1");
			return true;
		} catch {
			return false;
		}
	}

	async executeSql(sql: string): Promise<void> {
		await this.pool.query(sql);
	}
}
