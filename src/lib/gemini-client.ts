/**
 * Gemini AI Client - SQL Generation for PisangDB
 *
 * This module handles calling Gemini 2.0 Flash API to generate SQL
 * from natural language prompts for sandbox databases.
 *
 * @see PRD §6.5 - AI SQL Seeder
 * @see PRD §10.4 - AI Endpoints
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from "#/lib/logger";

const log = createLogger("GeminiClient");

// ============================================================================
// Types
// ============================================================================

/**
 * Result of generating SQL from a prompt
 */
export interface GenerateSqlResult {
	/** Generated SQL statement(s) */
	sql: string;

	/** Human-readable explanation of what was generated */
	explanation: string;

	/** Number of tokens used in the request */
	tokensUsed: number;
}

/**
 * Mode of SQL generation
 * - schema: Generate CREATE TABLE statements
 * - seed: Generate INSERT statements with realistic data
 * - helper: Help with writing SQL queries
 */
export type SqlMode = "schema" | "seed" | "helper";

/**
 * Supported database engines
 */
export type DatabaseEngine = "postgresql" | "mysql" | "mariadb";

/**
 * Error returned when API call fails
 */
export interface GenerateSqlError {
	error: string;
	message: string;
}

// ============================================================================
// Configuration
// ============================================================================

/** Gemini model to use for MVP */
const GEMINI_MODEL = "gemini-2.0-flash";

/** Maximum prompt length in characters */
const MAX_PROMPT_LENGTH = 1000;

// ============================================================================
// System Prompts
// ============================================================================

/**
 * Build system prompt based on engine and mode
 */
function buildSystemPrompt(engine: DatabaseEngine, mode: SqlMode): string {
	const engineSpecific = getEngineSpecificInstructions(engine);
	const modeInstructions = getModeInstructions(mode);

	return `You are a ${engine} SQL expert for PisangDB, a service that creates ephemeral databases.

${modeInstructions}

${engineSpecific}

Response format (JSON only - no other text):
{
  "sql": "your SQL here",
  "explanation": "brief explanation of what you created"
}

IMPORTANT:
- Respond ONLY with valid JSON
- Do not include any markdown code blocks
- Do not add any additional text outside the JSON object`;
}

/**
 * Get instructions specific to the generation mode
 */
function getModeInstructions(mode: SqlMode): string {
	switch (mode) {
		case "schema":
			return `The user wants to generate database schema (CREATE TABLE statements).
- Generate appropriate tables with proper columns and data types
- Include PRIMARY KEY, FOREIGN KEY, NOT NULL constraints where appropriate
- Use sensible default values`;
		case "seed":
			return `The user wants to generate sample data (INSERT statements).
- Generate realistic sample data (use Indonesian names, addresses, products)
- Include 5-20 rows per table
- Make the data look natural and varied`;
		case "helper":
			return `The user wants help with writing a SQL query.
- Provide a clear, efficient query
- Explain the query in the explanation field
- Use appropriate JOINs, WHERE clauses, and aggregations`;
		default:
			return "";
	}
}

/**
 * Get engine-specific SQL syntax instructions
 */
function getEngineSpecificInstructions(engine: DatabaseEngine): string {
	switch (engine) {
		case "postgresql":
			return `PostgreSQL syntax:
- Use SERIAL for auto-increment
- Use TIMESTAMP WITH TIME ZONE for timestamps
- Use TEXT for long strings
- Use INTEGER, DECIMAL, BOOLEAN for basic types`;
		case "mysql":
			return `MySQL syntax:
- Use AUTO_INCREMENT for auto-increment
- Use DATETIME for timestamps
- Use VARCHAR(255) for strings
- Use INT, DECIMAL(10,2), TINYINT for basic types`;
		case "mariadb":
			return `MariaDB syntax (similar to MySQL):
- Use AUTO_INCREMENT for auto-increment
- Use DATETIME for timestamps
- Use VARCHAR(255) for strings
- Use INT, DECIMAL(10,2), TINYINT(1) for basic types`;
		default:
			return "";
	}
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generate SQL from a natural language prompt using Gemini 2.0 Flash
 *
 * @param prompt - Natural language request (e.g., "Create users and posts tables")
 * @param engine - Database engine (postgresql, mysql, mariadb)
 * @param mode - Generation mode (schema, seed, helper)
 * @returns Result with SQL, explanation, and token count
 * @throws Error if API call fails
 */
export async function generateSql(
	prompt: string,
	engine: DatabaseEngine = "postgresql",
	mode: SqlMode = "schema",
): Promise<GenerateSqlResult> {
	// Validate inputs
	if (!prompt || prompt.trim().length === 0) {
		throw new Error("Prompt cannot be empty");
	}

	if (prompt.length > MAX_PROMPT_LENGTH) {
		throw new Error(
			`Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
		);
	}

	// Get API key from environment
	const apiKey = process.env.GEMINI_API_KEY;

	if (!apiKey) {
		log.error("GEMINI_API_KEY not configured");
		throw new Error(
			"AI service not configured. Please contact the administrator.",
		);
	}

	// Initialize Gemini client
	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({
		model: GEMINI_MODEL,
		systemInstruction: buildSystemPrompt(engine, mode),
	});

	// Build the full prompt
	const fullPrompt = `${prompt}

Remember: Respond ONLY with valid JSON in this format:
{"sql": "...", "explanation": "..."}`;

	log.info("Generating SQL", { mode, engine, promptLength: prompt.length });

	try {
		// Call Gemini API
		const result = await model.generateContent(fullPrompt);
		const response = result.response;

		// Get usage metadata
		const usageMetadata = response.usageMetadata;
		const tokensUsed = usageMetadata?.totalTokenCount ?? 0;

		// Extract text response
		const text = response.text();

		if (!text) {
			log.error("Empty response from Gemini");
			throw new Error("Failed to generate SQL. Please try again.");
		}

		// Parse JSON response
		let parsed: { sql: string; explanation: string };
		try {
			// Try to parse directly first
			parsed = JSON.parse(text);
		} catch {
			// If direct parse fails, try extracting JSON from markdown or other text
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				parsed = JSON.parse(jsonMatch[0]);
			} else {
				log.error("Failed to parse Gemini response", { text });
				throw new Error("Invalid response from AI. Please try again.");
			}
		}

		// Validate parsed response
		if (!parsed.sql || typeof parsed.sql !== "string") {
			log.error("Missing SQL in response", { parsed });
			throw new Error("AI response missing SQL. Please try again.");
		}

		if (!parsed.explanation || typeof parsed.explanation !== "string") {
			parsed.explanation = "SQL generated successfully.";
		}

		log.info("SQL generated successfully", {
			tokensUsed,
			sqlLength: parsed.sql.length,
		});

		return {
			sql: parsed.sql,
			explanation: parsed.explanation,
			tokensUsed,
		};
	} catch (error) {
		// Handle specific error types
		if (error instanceof Error) {
			if (error.message.includes("API key")) {
				throw new Error("AI service authentication failed.");
			}
			if (error.message.includes("rate limit")) {
				throw new Error(
					"AI service rate limit exceeded. Please try again later.",
				);
			}
			if (error.message.includes("prompt")) {
				throw error; // Re-throw validation errors
			}
			log.error("Gemini API error", { error: error.message });
			throw new Error(`AI generation failed: ${error.message}`);
		}

		log.error("Unexpected error during generation", { error });
		throw new Error("Failed to generate SQL. Please try again.");
	}
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate if a prompt is acceptable for processing
 *
 * @param prompt - User's prompt
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePrompt(prompt: string): {
	isValid: boolean;
	error?: string;
} {
	if (!prompt || typeof prompt !== "string") {
		return { isValid: false, error: "Prompt is required" };
	}

	const trimmed = prompt.trim();

	if (trimmed.length === 0) {
		return { isValid: false, error: "Prompt cannot be empty" };
	}

	if (trimmed.length > MAX_PROMPT_LENGTH) {
		return {
			isValid: false,
			error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
		};
	}

	// Check for potentially malicious patterns
	const dangerousPatterns = [
		/drop\s+database/i,
		/drop\s+schema/i,
		/delete\s+from\s+users/i,
		/truncate\s+all/i,
		/shutdown/i,
	];

	for (const pattern of dangerousPatterns) {
		if (pattern.test(trimmed)) {
			// Still allow but log for safety
			log.warn("Potentially dangerous prompt detected", { prompt: trimmed });
		}
	}

	return { isValid: true };
}
