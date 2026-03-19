import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_MODEL = "gemini-2.0-flash";

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

const SYSTEM_PROMPT = `You are a PostgreSQL/MySQL/MariaDB SQL expert for an ephemeral database service called PisangDB.

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
}

export async function generateSQL(
	params: AiGenerateParams,
): Promise<GenerateSQLResult> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("GEMINI_API_KEY environment variable is not set.");
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({
		model: GEMINI_MODEL,
		systemInstruction: SYSTEM_PROMPT.replace("{engine}", params.engine).replace(
			"{sandboxDbName}",
			params.sandboxDbName,
		),
	});

	const result = await model.generateContent(params.prompt);
	const response = result.response;
	const text = response.text();

	if (!text || text.trim().length === 0) {
		throw new Error("Gemini returned an empty response.");
	}

	const { sql, explanation } = parseSQLFromResponse(text);

	if (!sql || sql.trim().length === 0) {
		throw new Error("Could not extract SQL from Gemini response.");
	}

	validateGeneratedSQL(sql);

	const usageMetadata = response.usageMetadata;
	const tokensUsed = usageMetadata?.totalTokenCount ?? 0;

	return { sql, explanation, tokensUsed };
}
