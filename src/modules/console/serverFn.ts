import { createServerFn } from "@tanstack/react-start";
import type {
	AiGenerateInput,
	AiGenerateResult,
	AiLogItem,
	QueryHistoryItem,
	QueryResult,
} from "#/lib/types";
import {
	aiExecuteSchema,
	aiGenerateSchema,
	executeQuerySchema,
	sandboxIdSchema,
} from "./schema";

export const $executeQuery = createServerFn({ method: "POST" })
	.inputValidator(executeQuerySchema)
	.handler(async ({ data }): Promise<QueryResult> => {
		// TODO(Person A): Real execution flow:
		// 1. Fetch sandbox: verify ownership + status = 'active'
		// 2. Block forbidden commands: DROP DATABASE, ALTER SYSTEM, GRANT, REVOKE
		// 3. Connect using sandbox's db_user credentials (NOT admin pool)
		// 4. Execute with 30s timeout: SET statement_timeout = '30s'
		// 5. db.insert(queryHistory).values({ sandboxId, query, status, executionTimeMs, rowsAffected })
		const start = Date.now();
		const upperQuery = data.query.trim().toUpperCase();

		if (upperQuery.startsWith("SELECT")) {
			return {
				columns: ["id", "name", "email", "created_at"],
				rows: [
					{
						id: 1,
						name: "Alice",
						email: "alice@example.com",
						created_at: "2026-01-01",
					},
					{
						id: 2,
						name: "Bob",
						email: "bob@example.com",
						created_at: "2026-01-02",
					},
					{
						id: 3,
						name: "Citra",
						email: "citra@example.com",
						created_at: "2026-01-03",
					},
				],
				rowsAffected: 3,
				executionTimeMs: Date.now() - start,
			};
		}

		return {
			columns: [],
			rows: [],
			rowsAffected: 0,
			executionTimeMs: Date.now() - start,
		};
	});

export const $getQueryHistory = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data: _data }): Promise<QueryHistoryItem[]> => {
		// TODO(Person A): db.select().from(queryHistory).where(eq(queryHistory.sandboxId, data.sandboxId)).orderBy(desc(queryHistory.createdAt)).limit(50)
		return [
			{
				id: crypto.randomUUID(),
				query: "SELECT * FROM users LIMIT 10;",
				status: "success",
				executionTimeMs: 12,
				rowsAffected: 10,
				errorMessage: null,
				createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
			},
			{
				id: crypto.randomUUID(),
				query:
					"CREATE TABLE products (id SERIAL PRIMARY KEY, name TEXT NOT NULL);",
				status: "success",
				executionTimeMs: 34,
				rowsAffected: 0,
				errorMessage: null,
				createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
			},
			{
				id: crypto.randomUUID(),
				query: "SELECT * FROM non_existent_table;",
				status: "error",
				executionTimeMs: 5,
				rowsAffected: null,
				errorMessage: 'relation "non_existent_table" does not exist',
				createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
			},
		];
	});

export const $aiGenerate = createServerFn({ method: "POST" })
	.inputValidator(aiGenerateSchema)
	.handler(async ({ data }): Promise<AiGenerateResult> => {
		// TODO(Person A): Gemini / OpenRouter integration:
		// 1. Fetch sandbox: verify ownership + check engine (PostgreSQL/MySQL/MariaDB syntax differs)
		// 2. Check rate limit: max 30 AI requests/day per user (query ai_logs)
		// 3. Build system prompt: "Generate valid {engine} SQL only. No explanation outside SQL comments."
		// 4. Call AI API with prompt
		// 5. Extract SQL from response (strip markdown code fences)
		// 6. db.insert(aiLogs).values({ sandboxId, userId, prompt, response, sqlGenerated, tokensUsed })
		const input = data as AiGenerateInput;
		const mockSql = `-- Generated for: ${input.prompt}\nCREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nINSERT INTO users (name, email) VALUES\n  ('Alice', 'alice@example.com'),\n  ('Bob', 'bob@example.com');`;

		return {
			logId: crypto.randomUUID(),
			sqlGenerated: mockSql,
			explanation:
				"Membuat tabel users dengan kolom dasar (id, name, email, created_at) dan mengisi 2 data contoh.",
			tokensUsed: 312,
		};
	});

export const $aiExecute = createServerFn({ method: "POST" })
	.inputValidator(aiExecuteSchema)
	.handler(async ({ data: _data }): Promise<QueryResult> => {
		// TODO(Person A):
		// 1. Fetch ai_log: verify logId belongs to current user, executed = false
		// 2. Execute SQL via same flow as $executeQuery
		// 3. db.update(aiLogs).set({ executed: true }).where(eq(aiLogs.id, data.logId))
		const start = Date.now();
		return {
			columns: [],
			rows: [],
			rowsAffected: 0,
			executionTimeMs: Date.now() - start,
		};
	});

export const $getAiLogs = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data: _data }): Promise<AiLogItem[]> => {
		// TODO(Person A): db.select().from(aiLogs).where(eq(aiLogs.sandboxId, data.sandboxId)).orderBy(desc(aiLogs.createdAt))
		return [
			{
				id: crypto.randomUUID(),
				prompt: "Buatkan tabel users dan products untuk e-commerce",
				response: "SQL generated successfully.",
				sqlGenerated:
					"CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);",
				executed: true,
				tokensUsed: 312,
				createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
			},
		];
	});
