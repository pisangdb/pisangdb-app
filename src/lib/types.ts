export type DbEngine = "postgresql" | "mysql" | "mariadb";

export type DbRegion = "id" | "sg" | "us" | "eu";

export type SandboxStatus = "active" | "destroying" | "expired";

export type UserRole = "user" | "admin";

export type QueryStatus = "success" | "error";

export type TemplateEngine = DbEngine | "all";

export interface SandboxCredentials {
	host: string;
	port: number;
	dbName: string;
	dbUser: string;
	dbPassword: string;
	connectionUrl: string;
}

export interface SandboxListItem {
	id: string;
	displayName: string;
	engine: DbEngine;
	region: DbRegion;
	status: SandboxStatus;
	host: string;
	port: number;
	dbName: string;
	dbUser: string;
	connectionUrl: string;
	sizeMb: number;
	maxSizeMb: number;
	createdAt: string;
	expiredAt: string;
}

export interface SandboxDetail extends SandboxListItem {
	dbPassword: string;
}

export interface SandboxTable {
	name: string;
	rows: number;
	sizeKb: number;
}

export interface QueryResult {
	columns: string[];
	rows: Record<string, string | number | boolean | null>[];
	rowsAffected: number;
	executionTimeMs: number;
}

export interface QueryHistoryItem {
	id: string;
	query: string;
	status: QueryStatus;
	executionTimeMs: number | null;
	rowsAffected: number | null;
	errorMessage: string | null;
	createdAt: string;
}

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	image: string | null;
}

export interface CreateSandboxInput {
	displayName: string;
	engine: DbEngine;
	region: DbRegion;
	retentionHours: number;
	templateId?: string;
}

export interface ExtendSandboxInput {
	sandboxId: string;
	additionalHours: number;
}

export interface ExecuteQueryInput {
	sandboxId: string;
	query: string;
}

export interface AiGenerateInput {
	sandboxId: string;
	prompt: string;
	engine: "postgresql" | "mysql" | "mariadb";
}

export interface AiGenerateResult {
	logId: string;
	sqlGenerated: string;
	explanation: string;
	tokensUsed: number | null;
}

export interface AiLogItem {
	id: string;
	prompt: string;
	response: string;
	sqlGenerated: string | null;
	executed: boolean;
	tokensUsed: number | null;
	createdAt: string;
}

export interface DashboardStats {
	activeSandboxes: number;
	totalCreated: number;
	autoCleaned: number;
	aiQueriesThisMonth: number;
}
