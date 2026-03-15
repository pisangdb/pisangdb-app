import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { executeAiSql } from "#/lib/api-client";

export function useExecuteAiSql(sandboxId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (aiLogId: string) => executeAiSql(sandboxId, aiLogId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tables", sandboxId] });
			queryClient.invalidateQueries({ queryKey: ["queryHistory", sandboxId] });
			toast.success("SQL executed!");
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
