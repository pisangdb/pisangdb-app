import type { AiGenerateMode } from "#/lib/types";

const DEFAULT_AI_MAX_TOKENS = 1000;
const DEFAULT_AI_TEMPERATURE = 0.2;
const DEFAULT_AI_TIMEOUT_MS = 90000;
const MODE_TOKEN_LIMITS: Record<AiGenerateMode, number> = {
	helper: 400,
	schema: 1800,
	seed: 1100,
};
const MAX_RETRY_MAX_TOKENS = 2400;

export interface AiGenerateParams {
	prompt: string;
	engine: "postgresql" | "mysql" | "mariadb";
	sandboxDbName: string;
	mode?: AiGenerateMode;
	schemaContext?: string | null;
}

export interface GenerateSQLResult {
	sql: string;
	explanation: string;
	tokensUsed: number;
}

type ChatCompletionResponse = {
	choices?: Array<{
		finish_reason?: string;
		message?: {
			content?: string | Array<{ type?: string; text?: string }>;
		};
	}>;
	usage?: {
		total_tokens?: number;
	};
};

const SYSTEM_PROMPT = `You are a SQL generation assistant for PisangDB, an ephemeral database service.

RULES:
1. Generate ONLY valid SQL for the specified engine (PostgreSQL 16, MySQL 8, or MariaDB 11)
2. NEVER mix syntax from a different engine
3. For PostgreSQL: use SERIAL, BIGSERIAL, TIMESTAMPTZ, GENERATED ... AS IDENTITY, and PostgreSQL-compatible defaults/functions
4. For PostgreSQL: NEVER use AUTO_INCREMENT, backticks, ENGINE=InnoDB, ON UPDATE CURRENT_TIMESTAMP, or MySQL-style ENUM definitions
5. For MySQL/MariaDB: use AUTO_INCREMENT, DATETIME or TIMESTAMP, backticks only when needed, and MySQL-compatible defaults/functions
6. For MySQL/MariaDB: NEVER use SERIAL, BIGSERIAL, TIMESTAMPTZ, ILIKE, RETURNING, or PostgreSQL-only type syntax
7. If the prompt implies a schema, foreign keys, or seed data, keep every statement valid for the selected engine only
4. Use IF NOT EXISTS for CREATE TABLE to prevent errors on re-runs
5. For seed data, use INSERT ... VALUES syntax compatible with the engine
6. For query help, respond with ONLY the SQL query, no explanation
7. NEVER generate: DROP DATABASE, DROP USER, ALTER SYSTEM, TRUNCATE without WHERE
8. NEVER respond to prompts unrelated to SQL or database operations
9. Always wrap SQL in markdown code block: \`\`\`sql ... \`\`\`
10. For multiple statements, separate with semicolons
11. If existing schema context is provided, prefer extending or querying the current tables instead of inventing conflicting structures

USER REQUEST ENGINE: {engine}
USER DATABASE NAME: {sandboxDbName}
REQUEST MODE: {mode}`;

function getAiConfig() {
	const apiUrl = process.env.AI_API_URL;
	const apiToken = process.env.AI_API_TOKEN;
	const model = process.env.AI_MODEL;
	const maxTokens = Number(process.env.AI_MAX_TOKENS ?? DEFAULT_AI_MAX_TOKENS);
	const temperature = Number(
		process.env.AI_TEMPERATURE ?? DEFAULT_AI_TEMPERATURE,
	);
	const timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? DEFAULT_AI_TIMEOUT_MS);

	if (!apiUrl) {
		throw new Error("AI_API_URL environment variable is not set.");
	}

	if (!apiToken) {
		throw new Error("AI_API_TOKEN environment variable is not set.");
	}

	if (!model) {
		throw new Error("AI_MODEL environment variable is not set.");
	}

	return {
		apiUrl,
		apiToken,
		model,
		maxTokens: Number.isFinite(maxTokens) ? maxTokens : DEFAULT_AI_MAX_TOKENS,
		temperature: Number.isFinite(temperature)
			? temperature
			: DEFAULT_AI_TEMPERATURE,
		timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_AI_TIMEOUT_MS,
	};
}

export function isAiConfigured() {
	return Boolean(
		process.env.AI_API_URL && process.env.AI_API_TOKEN && process.env.AI_MODEL,
	);
}

function stripMarkdownCodeFences(text: string): string {
	const trimmed = text.trim();
	const fencedMatch = trimmed.match(/^```(?:sql)?\s*([\s\S]*?)\s*```$/i);
	if (fencedMatch) {
		return fencedMatch[1].trim();
	}

	return trimmed.replace(/```(?:sql)?/gi, "").trim();
}

function parseSQLFromResponse(text: string): {
	sql: string;
	explanation: string;
} {
	const sqlBlockMatch = text.match(/```sql\s*([\s\S]*?)```/i);
	if (sqlBlockMatch) {
		const sql = stripMarkdownCodeFences(sqlBlockMatch[0]);
		const before = text.substring(0, text.indexOf("```sql")).trim();
		return { sql, explanation: before || "SQL generated successfully." };
	}

	const genericBlockMatch = text.match(/```[\s\S]*?```/i);
	if (genericBlockMatch) {
		const sql = stripMarkdownCodeFences(genericBlockMatch[0]);
		const before = text.substring(0, text.indexOf("```")).trim();
		return { sql, explanation: before || "SQL generated successfully." };
	}

	return { sql: stripMarkdownCodeFences(text), explanation: "SQL generated." };
}

function validateGeneratedSQL(
	sql: string,
	engine: AiGenerateParams["engine"],
): void {
	const upper = sql.toUpperCase();
	if (upper.includes("DROP DATABASE") || upper.includes("DROP USER")) {
		throw new Error("Generated SQL contains forbidden DROP statements.");
	}
	if (upper.includes("ALTER SYSTEM") || upper.includes("ALTER ROLE")) {
		throw new Error(
			"Generated SQL contains forbidden ALTER SYSTEM statements.",
		);
	}
	if (upper.includes("TRUNCATE") && !upper.includes("WHERE")) {
		throw new Error("Generated SQL contains TRUNCATE without WHERE clause.");
	}
	if (upper.includes("ALTER USER") || upper.includes("CREATE USER")) {
		throw new Error("Generated SQL contains forbidden user management.");
	}

	if (engine === "postgresql") {
		if (upper.includes("AUTO_INCREMENT")) {
			throw new Error(
				"Generated SQL uses AUTO_INCREMENT, which is not valid for PostgreSQL.",
			);
		}
		if (sql.includes("`")) {
			throw new Error(
				"Generated SQL uses MySQL-style backticks, which are not valid for PostgreSQL identifiers.",
			);
		}
		if (upper.includes("ON UPDATE CURRENT_TIMESTAMP")) {
			throw new Error(
				"Generated SQL uses MySQL-style ON UPDATE CURRENT_TIMESTAMP, which is not valid for PostgreSQL.",
			);
		}
		if (upper.includes("ENGINE=")) {
			throw new Error(
				"Generated SQL uses MySQL table ENGINE syntax, which is not valid for PostgreSQL.",
			);
		}
	}

	if (engine === "mysql" || engine === "mariadb") {
		if (upper.includes("TIMESTAMPTZ")) {
			throw new Error(
				"Generated SQL uses TIMESTAMPTZ, which is PostgreSQL-specific syntax.",
			);
		}
		if (upper.includes("BIGSERIAL") || upper.includes("SERIAL PRIMARY KEY")) {
			throw new Error(
				"Generated SQL uses PostgreSQL SERIAL/BIGSERIAL syntax, which is not valid for MySQL or MariaDB here.",
			);
		}
		if (upper.includes(" ILIKE ")) {
			throw new Error(
				"Generated SQL uses ILIKE, which is PostgreSQL-specific syntax.",
			);
		}
		if (upper.includes(" RETURNING ")) {
			throw new Error(
				"Generated SQL uses RETURNING, which is not supported the same way in MySQL or MariaDB here.",
			);
		}
	}
}

function hasBalancedSqlStructures(sql: string): boolean {
	let parenthesesDepth = 0;
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let inBacktick = false;
	let inLineComment = false;
	let inBlockComment = false;

	for (let index = 0; index < sql.length; index += 1) {
		const char = sql[index];
		const next = sql[index + 1];

		if (inLineComment) {
			if (char === "\n") {
				inLineComment = false;
			}
			continue;
		}

		if (inBlockComment) {
			if (char === "*" && next === "/") {
				inBlockComment = false;
				index += 1;
			}
			continue;
		}

		if (inSingleQuote) {
			if (char === "'" && next === "'") {
				index += 1;
				continue;
			}
			if (char === "'") {
				inSingleQuote = false;
			}
			continue;
		}

		if (inDoubleQuote) {
			if (char === '"') {
				inDoubleQuote = false;
			}
			continue;
		}

		if (inBacktick) {
			if (char === "`") {
				inBacktick = false;
			}
			continue;
		}

		if (char === "-" && next === "-") {
			inLineComment = true;
			index += 1;
			continue;
		}

		if (char === "/" && next === "*") {
			inBlockComment = true;
			index += 1;
			continue;
		}

		if (char === "'") {
			inSingleQuote = true;
			continue;
		}

		if (char === '"') {
			inDoubleQuote = true;
			continue;
		}

		if (char === "`") {
			inBacktick = true;
			continue;
		}

		if (char === "(") {
			parenthesesDepth += 1;
			continue;
		}

		if (char === ")") {
			parenthesesDepth -= 1;
			if (parenthesesDepth < 0) {
				return false;
			}
		}
	}

	return (
		parenthesesDepth === 0 &&
		!inSingleQuote &&
		!inDoubleQuote &&
		!inBacktick &&
		!inLineComment &&
		!inBlockComment
	);
}

export function assertExecutableGeneratedSql(
	sql: string,
	engine: AiGenerateParams["engine"],
): void {
	validateGeneratedSQL(sql, engine);

	if (!hasBalancedSqlStructures(sql)) {
		throw new Error(
			"AI response looks truncated or malformed. Generate again before executing.",
		);
	}

	if (!sql.trim().endsWith(";")) {
		throw new Error(
			"AI response looks incomplete because the final SQL statement is not closed with a semicolon.",
		);
	}
}

function extractResponseText(response: ChatCompletionResponse): string {
	const content = response.choices?.[0]?.message?.content;

	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.map((item) => item.text ?? "")
			.join("")
			.trim();
	}

	return "";
}

async function requestSqlGeneration(params: {
	apiToken: string;
	apiUrl: string;
	maxTokens: number;
	model: string;
	prompt: string;
	systemPrompt: string;
	temperature: number;
	timeoutMs: number;
}): Promise<ChatCompletionResponse> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), params.timeoutMs);

	try {
		const response = await fetch(params.apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${params.apiToken}`,
			},
			body: JSON.stringify({
				model: params.model,
				messages: [
					{ role: "system", content: params.systemPrompt },
					{ role: "user", content: params.prompt },
				],
				max_tokens: params.maxTokens,
				temperature: params.temperature,
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(
				`AI provider request failed with status ${response.status}.`,
			);
		}

		return (await response.json()) as ChatCompletionResponse;
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(
				`AI provider took longer than ${Math.round(params.timeoutMs / 1000)} seconds. Try a shorter prompt or retry.`,
			);
		}

		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

export async function generateSQL(
	params: AiGenerateParams,
): Promise<GenerateSQLResult> {
	const { apiUrl, apiToken, model, maxTokens, temperature, timeoutMs } =
		getAiConfig();
	const mode = params.mode ?? "schema";
	const systemPrompt = SYSTEM_PROMPT.replace("{engine}", params.engine)
		.replace("{sandboxDbName}", params.sandboxDbName)
		.replace("{mode}", mode);
	const prompt =
		params.schemaContext && params.schemaContext.trim().length > 0
			? `EXISTING SANDBOX SCHEMA:\n${params.schemaContext}\n\nUSER REQUEST:\n${params.prompt}`
			: params.prompt;
	const requestedMaxTokens = Math.min(
		maxTokens,
		MODE_TOKEN_LIMITS[mode] ?? DEFAULT_AI_MAX_TOKENS,
	);
	let payload = await requestSqlGeneration({
		apiToken,
		apiUrl,
		maxTokens: requestedMaxTokens,
		model,
		prompt,
		systemPrompt,
		temperature,
		timeoutMs,
	});
	const finishReason = payload.choices?.[0]?.finish_reason;
	if (
		finishReason === "length" &&
		requestedMaxTokens < Math.min(maxTokens, MAX_RETRY_MAX_TOKENS)
	) {
		payload = await requestSqlGeneration({
			apiToken,
			apiUrl,
			maxTokens: Math.min(
				Math.max(requestedMaxTokens * 2, requestedMaxTokens + 400),
				maxTokens,
				MAX_RETRY_MAX_TOKENS,
			),
			model,
			prompt,
			systemPrompt,
			temperature,
			timeoutMs,
		});
	}

	const text = extractResponseText(payload);

	if (!text || text.trim().length === 0) {
		throw new Error("AI provider returned an empty response.");
	}

	const { sql, explanation } = parseSQLFromResponse(text);

	if (!sql || sql.trim().length === 0) {
		throw new Error("Could not extract SQL from AI provider response.");
	}

	assertExecutableGeneratedSql(sql, params.engine);

	const tokensUsed = payload.usage?.total_tokens ?? 0;

	return { sql, explanation, tokensUsed };
}
