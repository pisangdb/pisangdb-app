import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	executeAiSql,
	executeQuery,
	generateAiSql,
	getQueryHistory,
	type QueryResult,
} from "#/lib/api-client";

interface QueryHistoryItem {
	id: string;
	query: string;
	status: string;
	executionTimeMs: number;
	rowsAffected: number;
	errorMessage: string | null;
	createdAt: string;
}

/**
 * Hook for executing SQL queries
 */
export function useExecuteQuery(sandboxId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (sql: string): Promise<QueryResult> => {
			return executeQuery(sandboxId, sql);
		},
		onSuccess: () => {
			// Invalidate query history to refresh it
			queryClient.invalidateQueries({
				queryKey: ["query-history", sandboxId],
			});
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}

/**
 * Hook for getting query history
 */
export function useQueryHistory(sandboxId: string) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["query-history", sandboxId],
		queryFn: async (): Promise<QueryHistoryItem[]> => {
			const response = await getQueryHistory(sandboxId);
			return response.history;
		},
		enabled: !!sandboxId,
		staleTime: 10_000, // 10 seconds
	});

	// Return the history array directly for convenience
	return { data: data ?? [], isLoading, error };
}

/**
 * Hook for generating AI SQL
 */
export function useGenerateAiSql(sandboxId: string) {
	return useMutation({
		mutationFn: async (prompt: string) => {
			return generateAiSql(sandboxId, prompt);
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}

/**
 * Hook for executing AI-generated SQL
 */
export function useExecuteAiSql(sandboxId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (aiLogId: string): Promise<QueryResult> => {
			return executeAiSql(sandboxId, aiLogId);
		},
		onSuccess: () => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({
				queryKey: ["ai-logs", sandboxId],
			});
			queryClient.invalidateQueries({
				queryKey: ["query-history", sandboxId],
			});
			toast.success("SQL executed successfully");
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
