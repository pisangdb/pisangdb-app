/**
 * Custom error types for PisangDB application.
 * Using custom error classes enables better error handling upstream.
 */

export class UnauthorizedError extends Error {
	constructor(message = "Unauthorized") {
		super(message);
		this.name = "UnauthorizedError";
	}
}

export class ForbiddenError extends Error {
	constructor(message = "Forbidden") {
		super(message);
		this.name = "ForbiddenError";
	}
}

export class NotFoundError extends Error {
	constructor(message = "Not found") {
		super(message);
		this.name = "NotFoundError";
	}
}

export class ValidationError extends Error {
	constructor(message = "Validation error") {
		super(message);
		this.name = "ValidationError";
	}
}

export class RateLimitError extends Error {
	public readonly resetAt: Date;

	constructor(message: string, resetAt: Date) {
		super(message);
		this.name = "RateLimitError";
		this.resetAt = resetAt;
	}
}
