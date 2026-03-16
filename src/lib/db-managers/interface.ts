import { Pool } from "pg";
import type { DatabaseEngine, SandboxCredentials } from "./interface";

export interface DbManager {
	engine: DatabaseEngine;
	createSandboxDatabase(credentials: SandboxCredentials): Promise<void>;
	dropSandboxDatabase(dbName: string, dbUser: string): Promise<void>;
	terminateConnections(dbName: string): Promise<void>;
	testConnection(): Promise<boolean>;
	executeTemplateSql(options: {
		dbName: string;
		dbUser: string;
		dbPassword: string;
		engine: DatabaseEngine;
	}): Promise<void>;
}
