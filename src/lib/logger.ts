/**
 * Structured Logging Utility for PisangDB
 *
 * Uses pino for JSON-structured logging with pretty printing in development.
 * Replaces console.log/error/warn/info throughout the codebase.
 */

import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Configure pino transport for development (pretty print)
const transport = isDevelopment
	? {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "SYS:standard",
				ignore: "pid,hostname",
			},
		}
	: undefined;

export const logger = pino({
	level: isProduction ? "info" : "debug",
	transport,
	formatters: {
		level: (label) => ({ level: label }),
	},
	timestamp: pino.stdTimeFunctions.isoTime,
});

// Convenience loggers with context
export const createLogger = (context: string) => ({
	debug: (message: string, data?: Record<string, unknown>) =>
		logger.debug({ context, ...data }, message),
	info: (message: string, data?: Record<string, unknown>) =>
		logger.info({ context, ...data }, message),
	warn: (message: string, data?: Record<string, unknown>) =>
		logger.warn({ context, ...data }, message),
	error: (message: string, data?: Record<string, unknown>) =>
		logger.error({ context, ...data }, message),
});

// Pre-defined context loggers
export const authLogger = createLogger("Auth");
export const ephemeralEngineLogger = createLogger("EphemeralEngine");
export const sandboxLogger = createLogger("SandboxManager");
export const queryLogger = createLogger("QueryExecutor");
export const apiLogger = createLogger("API");
