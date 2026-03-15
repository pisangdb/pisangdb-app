/**
 * Hook for executing SQL queries against a sandbox
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	executeQuery as apiExecuteQuery,
	getQueryHistory as apiGetQueryHistory,
} from "#/lib/api-client";

interface QueryResult {
	rows: Array<Record<string, unknown>>;
	rowCount: number;
	executionTimeMs: number;
}

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
 * Execute a SQL query against a sandbox
 */
export function useExecuteQuery(sandboxId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (query: string): Promise<QueryResult> => {
			return apiExecuteQuery(sandboxId, query);
		},
		onSuccess: () => {
			// Invalidate query history to refresh it
			queryClient.invalidateQueries({
				queryKey: ["query-history", sandboxId],
			});
		},
	});
}

/**
 * Get query history for a sandbox
 */
export function useQueryHistory(sandboxId: string) {
	return useQuery({
		queryKey: ["query-history", sandboxId],
		queryFn: async (): Promise<QueryHistoryItem[]> => {
			const response = await apiGetQueryHistory(sandboxId);
			return response.history;
		},
		enabled: !!sandboxId,
		staleTime: 10_000, // 10 seconds
	});
}
