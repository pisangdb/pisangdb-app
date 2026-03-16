const API_BASE = "";

async function fetchApi<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(`${API_BASE}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
		credentials: "include",
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error?.message ?? "API Error");
	}

	return data.data ?? data;
}

// Auth
export interface User {
	id: string;
	email: string;
	name: string;
	role: string;
	createdAt: string;
}

export async function getMe(): Promise<User> {
	const response = await fetchApi<{ user: User; sandboxCount: number }>(
		"/api/auth/me",
	);
	return response.user;
}

export async function login(email: string, password: string) {
	return fetchApi<{ user: User }>("/api/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password }),
	});
}

export async function register(email: string, password: string, name: string) {
	return fetchApi<{ user: User }>("/api/auth/register", {
		method: "POST",
		body: JSON.stringify({ email, password, name }),
	});
}

export async function logout() {
	return fetchApi<void>("/api/auth/logout", { method: "POST" });
}

// Sandboxes
export interface Sandbox {
	id: string;
	engine: string;
	region: string;
	displayName: string;
	host: string;
	port: number;
	dbName: string;
	dbUser: string;
	dbPassword: string;
	connectionUrl: string;
	status: string;
	ttl: number;
	size?: string;
	createdAt: string;
	expiredAt: string;
}

// Transform snake_case API response to camelCase
function transformSandboxResponse(data: Record<string, unknown>): Sandbox {
	return {
		id: data.id as string,
		engine: data.engine as string,
		region: data.region as string,
		displayName: (data.display_name ?? data.displayName) as string,
		host: data.host as string,
		port: data.port as number,
		dbName: (data.db_name ?? data.dbName) as string,
		dbUser: (data.db_user ?? data.dbUser) as string,
		dbPassword: (data.db_password ?? data.dbPassword) as string,
		connectionUrl: (data.connection_url ?? data.connectionUrl) as string,
		status: data.status as string,
		ttl: data.ttl as number,
		size: (data.size ?? `${Math.floor(Math.random() * 50) + 5} MB`) as string,
		createdAt: (data.created_at ?? data.createdAt) as string,
		expiredAt: (data.expired_at ?? data.expiredAt) as string,
	};
}

export async function getSandboxes() {
	const response = await fetchApi<{ sandboxes: Record<string, unknown>[] }>(
		"/api/sandboxes",
	);
	return {
		sandboxes: response.sandboxes.map(transformSandboxResponse),
	};
}

export async function getSandbox(id: string) {
	const response = await fetchApi<{ sandbox: Record<string, unknown> }>(
		`/api/sandboxes/${id}`,
	);
	return {
		sandbox: transformSandboxResponse(response.sandbox),
	};
}

interface CreateSandboxBody {
	engine: "postgresql" | "mysql" | "mariadb";
	region: "id" | "sg" | "us";
	name: string;
	retention_hours: number;
	template_id: string | null;
}

export async function createSandbox(body: CreateSandboxBody) {
	const response = await fetchApi<{ sandbox: Record<string, unknown> }>(
		"/api/sandboxes",
		{
			method: "POST",
			body: JSON.stringify(body),
		},
	);
	return {
		sandbox: transformSandboxResponse(response.sandbox),
	};
}

export async function extendSandbox(id: string, extendHours: number) {
	return fetchApi<{ sandbox: { id: string; expiredAt: string; ttl: number } }>(
		`/api/sandboxes/${id}/extend`,
		{
			method: "PATCH",
			body: JSON.stringify({ extendHours }),
		},
	);
}

export async function deleteSandbox(id: string) {
	return fetchApi<void>(`/api/sandboxes/${id}`, { method: "DELETE" });
}

// Tables
export async function getTables(sandboxId: string) {
	return fetchApi<{
		tables: Array<{ name: string; rows: number; sizeKb: number }>;
	}>(`/api/sandboxes/${sandboxId}/tables`);
}

// Query
export interface QueryResult {
	rows: Array<Record<string, unknown>>;
	rowCount: number;
	executionTimeMs: number;
}

export async function executeQuery(sandboxId: string, sql: string) {
	return fetchApi<QueryResult>(`/api/sandboxes/${sandboxId}/query`, {
		method: "POST",
		body: JSON.stringify({ sql }),
	});
}

export async function getQueryHistory(sandboxId: string) {
	return fetchApi<{
		history: Array<{
			id: string;
			query: string;
			status: string;
			executionTimeMs: number;
			rowsAffected: number;
			errorMessage: string | null;
			createdAt: string;
		}>;
	}>(`/api/sandboxes/${sandboxId}/history`);
}

// AI
export async function generateAiSql(sandboxId: string, prompt: string) {
	return fetchApi<{
		sql: string;
		explanation: string;
		tokensUsed: number;
		aiLogId: string;
	}>(`/api/sandboxes/${sandboxId}/ai/generate`, {
		method: "POST",
		body: JSON.stringify({ prompt }),
	});
}

export async function executeAiSql(sandboxId: string, aiLogId: string) {
	return fetchApi<QueryResult>(`/api/sandboxes/${sandboxId}/ai/execute`, {
		method: "POST",
		body: JSON.stringify({ aiLogId }),
	});
}

export async function getAiLogs(sandboxId: string) {
	return fetchApi<{
		logs: Array<{
			id: string;
			prompt: string;
			response: string;
			sqlGenerated: string | null;
			executed: boolean;
			tokensUsed: number | null;
			createdAt: string;
		}>;
	}>(`/api/sandboxes/${sandboxId}/ai/logs`);
}

export interface Template {
	id: string;
	name: string;
	description: string | null;
	engine: "postgresql" | "mysql" | "mariadb";
	is_builtin: boolean;
	created_at: string;
}

export async function getTemplates(engine?: string) {
	const query = engine ? `?engine=${engine}` : "";
	return fetchApi<{ templates: Template[] }>(`/api/templates/${query}`);
}
