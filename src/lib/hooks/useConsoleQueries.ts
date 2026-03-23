import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";
import type { executeQuerySchema } from "#/modules/console/schema";
import { $executeQuery, $getQueryHistory } from "#/modules/console/serverFn";

type ExecuteQueryData = z.infer<typeof executeQuerySchema>;

export const QUERY_HISTORY_KEY = "query-history";

export function useQueryHistory(sandboxId: string) {
	return useQuery({
		queryKey: [QUERY_HISTORY_KEY, sandboxId],
		queryFn: () => $getQueryHistory({ data: { sandboxId } }),
		enabled: !!sandboxId,
		staleTime: 0,
		refetchOnMount: true,
	});
}

export function useExecuteQuery() {
	return useMutation({
		mutationFn: (input: ExecuteQueryData) => $executeQuery({ data: input }),
		onError: (error: Error) => {
			toast.error(`Query failed: ${error.message}`);
		},
	});
}
