const DEFAULT_AI_MAX_TOKENS = 1000;
const DEFAULT_AI_TEMPERATURE = 0.2;

export interface AiGenerateParams {
	prompt: string;
	engine: "postgresql" | "mysql" | "mariadb";
	sandboxDbName: string;
}

export interface GenerateSQLResult {
	sql: string;
	explanation: string;
	tokensUsed: number;
}

type ChatCompletionResponse = {
	choices?: Array<{
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
2. For PostgreSQL: use SERIAL, BIGSERIAL, TIMESTAMPTZ, etc.
3. For MySQL/MariaDB: use AUTO_INCREMENT, DATETIME, etc.
4. Use IF NOT EXISTS for CREATE TABLE to prevent errors on re-runs
5. For seed data, use INSERT ... VALUES syntax compatible with the engine
6. For query help, respond with ONLY the SQL query, no explanation
7. NEVER generate: DROP DATABASE, DROP USER, ALTER SYSTEM, TRUNCATE without WHERE
8. NEVER respond to prompts unrelated to SQL or database operations
9. Always wrap SQL in markdown code block: \`\`\`sql ... \`\`\`
10. For multiple statements, separate with semicolons

USER REQUEST ENGINE: {engine}
USER DATABASE NAME: {sandboxDbName}`;

function getAiConfig() {
	const apiUrl = process.env.AI_API_URL;
	const apiToken = process.env.AI_API_TOKEN;
	const model = process.env.AI_MODEL;
	const maxTokens = Number(process.env.AI_MAX_TOKENS ?? DEFAULT_AI_MAX_TOKENS);
	const temperature = Number(
		process.env.AI_TEMPERATURE ?? DEFAULT_AI_TEMPERATURE,
	);

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
	};
}

export function isAiConfigured() {
	return Boolean(
		process.env.AI_API_URL && process.env.AI_API_TOKEN && process.env.AI_MODEL,
	);
}

function parseSQLFromResponse(text: string): {
	sql: string;
	explanation: string;
} {
	const sqlBlockMatch = text.match(/```sql\s*([\s\S]*?)```/i);
	if (sqlBlockMatch) {
		const sql = sqlBlockMatch[1].trim();
		const before = text.substring(0, text.indexOf("```sql")).trim();
		return { sql, explanation: before || "SQL generated successfully." };
	}
	return { sql: text.trim(), explanation: "SQL generated." };
}

function validateGeneratedSQL(sql: string): void {
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

export async function generateSQL(
	params: AiGenerateParams,
): Promise<GenerateSQLResult> {
	const { apiUrl, apiToken, model, maxTokens, temperature } = getAiConfig();
	const systemPrompt = SYSTEM_PROMPT.replace("{engine}", params.engine).replace(
		"{sandboxDbName}",
		params.sandboxDbName,
	);

	const response = await fetch(apiUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiToken}`,
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: params.prompt },
			],
			max_tokens: maxTokens,
			temperature,
		}),
	});

	if (!response.ok) {
		throw new Error(
			`AI provider request failed with status ${response.status}.`,
		);
	}

	const payload = (await response.json()) as ChatCompletionResponse;
	const text = extractResponseText(payload);

	if (!text || text.trim().length === 0) {
		throw new Error("AI provider returned an empty response.");
	}

	const { sql, explanation } = parseSQLFromResponse(text);

	if (!sql || sql.trim().length === 0) {
		throw new Error("Could not extract SQL from AI provider response.");
	}

	validateGeneratedSQL(sql);

	const tokensUsed = payload.usage?.total_tokens ?? 0;

	return { sql, explanation, tokensUsed };
}
