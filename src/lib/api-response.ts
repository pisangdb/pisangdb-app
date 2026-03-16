/**
 * Standardized API Response Utilities
 *
 * Following API Design Patterns:
 * - Success: { data: T }
 * - Error: { error: { code: string, message: string, details?: FieldError[] } }
 * - HTTP status codes indicate success/failure (not response body)
 */

export interface FieldError {
	field: string;
	message: string;
	code: string;
}

export interface ApiError {
	code: string;
	message: string;
	details?: FieldError[];
}

export interface ApiResponse<T> {
	data?: T;
	error?: ApiError;
}

/**
 * Success response with data
 */
export function successResponse<T>(
	data: T,
	status: number = 200,
	headers?: HeadersInit,
): Response {
	return Response.json({ data }, { status, headers });
}

/**
 * Created response (201) with Location header
 */
export function createdResponse<T>(data: T, location: string): Response {
	return Response.json(
		{ data },
		{
			status: 201,
			headers: { Location: location },
		},
	);
}

/**
 * No content response (204)
 */
export function noContentResponse(): Response {
	return new Response(null, { status: 204 });
}

/**
 * Error response with structured format
 */
export function errorResponse(
	code: string,
	message: string,
	status: number = 400,
	details?: FieldError[],
	headers?: HeadersInit,
): Response {
	const error: ApiError = { code, message };
	if (details) {
		error.details = details;
	}
	return Response.json({ error }, { status, headers });
}

/**
 * Validation error response (422)
 */
export function validationErrorResponse(details: FieldError[]): Response {
	return errorResponse(
		"validation_error",
		"Request validation failed",
		422,
		details,
	);
}

/**
 * Not found error (404)
 */
export function notFoundError(
	message: string = "Resource not found",
): Response {
	return errorResponse("not_found", message, 404);
}

/**
 * Unauthorized error (401)
 */
export function unauthorizedError(
	message: string = "Authentication required",
): Response {
	return errorResponse("unauthorized", message, 401);
}

/**
 * Forbidden error (403)
 */
export function forbiddenError(message: string = "Access denied"): Response {
	return errorResponse("forbidden", message, 403);
}

/**
 * Conflict error (409)
 */
export function conflictError(message: string): Response {
	return errorResponse("conflict", message, 409);
}

/**
 * Rate limit error (429)
 */
export function rateLimitError(retryAfter: number): Response {
	return errorResponse(
		"rate_limit_exceeded",
		`Rate limit exceeded. Try again in ${retryAfter} seconds.`,
		429,
	);
}

/**
 * Internal server error (500)
 */
export function internalError(
	message: string = "Internal server error",
): Response {
	// Don't expose internal details to client
	return errorResponse("internal_error", message, 500);
}

// Compatibility aliases for legacy API response types used across routes
export type ErrorResponse = {
	success: false;
	error: string;
	details?: FieldError[];
};

export type SuccessResponse<T = Record<string, unknown>> = {
	success: true;
} & T;
