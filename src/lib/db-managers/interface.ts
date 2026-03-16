export type DatabaseEngine = "postgresql" | "mysql" | "mariadb";

export interface SandboxCredentials {
	dbName: string;
	dbUser: string;
	dbPassword: string;
	host: string;
	port: number;
}

export interface DbManager {
	engine: DatabaseEngine;
	createSandboxDatabase(credentials: SandboxCredentials): Promise<void>;
	dropSandboxDatabase(dbName: string, dbUser: string): Promise<void>;
	terminateConnections(dbName: string): Promise<void>;
	testConnection(): Promise<boolean>;
}

export type DbManagerClass = new (adminUrl: string) => DbManager;

const managers: Record<DatabaseEngine, () => Promise<DbManagerClass>> = {
	postgresql: () =>
		import("./postgres-manager").then(
			(m) => m.PostgresManager as unknown as DbManagerClass,
		),
	mysql: () =>
		import("./mysql-manager").then(
			(m) => m.MySqlManager as unknown as DbManagerClass,
		),
	mariadb: () =>
		import("./mariadb-manager").then(
			(m) => m.MariaDbManager as unknown as DbManagerClass,
		),
};

export async function getDbManager(
	engine: DatabaseEngine,
	adminUrl: string,
): Promise<DbManager> {
	const ManagerClass = await managers[engine]();
	return new ManagerClass(adminUrl);
}
