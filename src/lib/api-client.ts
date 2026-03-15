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
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error?.message ?? "API Error");
	}

	return data.data ?? data;
}

// Auth
export async function getMe() {
	return fetchApi<{
		id: string;
		email: string;
		name: string;
		role: string;
		createdAt: string;
	}>("/api/auth/me");
}

export async function login(email: string, password: string) {
	return fetchApi<{ user: { id: string; email: string; name: string } }>(
		"/api/auth/login",
		{
			method: "POST",
			body: JSON.stringify({ email, password }),
		},
	);
}

export async function register(email: string, password: string, name: string) {
	return fetchApi<{ user: { id: string; email: string; name: string } }>(
		"/api/auth/register",
		{
			method: "POST",
			body: JSON.stringify({ email, password, name }),
		},
	);
}

export async function logout() {
	return fetchApi<void>("/api/auth/logout", { method: "POST" });
}

// Sandboxes
interface Sandbox {
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
	createdAt: string;
	expiredAt: string;
}

export async function getSandboxes() {
	return fetchApi<{ sandboxes: Sandbox[] }>("/api/sandboxes");
}

export async function getSandbox(id: string) {
	return fetchApi<{ sandbox: Sandbox }>(`/api/sandboxes/${id}`);
}

interface CreateSandboxBody {
	engine: "postgresql";
	region: "id";
	name: string;
	retention_hours: number;
}

export async function createSandbox(body: CreateSandboxBody) {
	return fetchApi<{ sandbox: Sandbox }>("/api/sandboxes", {
		method: "POST",
		body: JSON.stringify(body),
	});
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
interface QueryResult {
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
	return fetchApi<{ sql: string; explanation: string; tokensUsed: number }>(
		`/api/sandboxes/${sandboxId}/ai/generate`,
		{
			method: "POST",
			body: JSON.stringify({ prompt }),
		},
	);
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
