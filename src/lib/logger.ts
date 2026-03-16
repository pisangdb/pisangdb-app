/**
 * Structured Logging Utility for PisangDB
 *
 * Simple console-based logger with structured output.
 */

const isProduction = process.env.NODE_ENV === "production";

interface LogData {
	context?: string;
	[key: string]: unknown;
}

function formatMessage(
	level: string,
	context: string,
	message: string,
	data?: LogData,
): string {
	const timestamp = new Date().toISOString();
	const dataStr = data ? ` ${JSON.stringify(data)}` : "";
	return `[${timestamp}] ${level.toUpperCase()} [${context}] ${message}${dataStr}`;
}

const baseLogger = {
	debug: (message: string, data?: LogData) => {
		if (!isProduction) {
			console.debug(
				formatMessage("debug", data?.context ?? "App", message, data),
			);
		}
	},
	info: (message: string, data?: LogData) => {
		console.info(formatMessage("info", data?.context ?? "App", message, data));
	},
	warn: (message: string, data?: LogData) => {
		console.warn(formatMessage("warn", data?.context ?? "App", message, data));
	},
	error: (message: string, data?: LogData) => {
		console.error(
			formatMessage("error", data?.context ?? "App", message, data),
		);
	},
};

export const logger = baseLogger;

export const createLogger = (context: string) => ({
	debug: (message: string, data?: Record<string, unknown>) =>
		logger.debug(message, { context, ...data }),
	info: (message: string, data?: Record<string, unknown>) =>
		logger.info(message, { context, ...data }),
	warn: (message: string, data?: Record<string, unknown>) =>
		logger.warn(message, { context, ...data }),
	error: (message: string, data?: Record<string, unknown>) =>
		logger.error(message, { context, ...data }),
});

export const authLogger = createLogger("Auth");
export const ephemeralEngineLogger = createLogger("EphemeralEngine");
export const sandboxLogger = createLogger("SandboxManager");
export const queryLogger = createLogger("QueryExecutor");
export const apiLogger = createLogger("API");
