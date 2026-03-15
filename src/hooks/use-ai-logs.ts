import { useQuery } from "@tanstack/react-query";
import { getAiLogs } from "#/lib/api-client";

export function useAiLogs(sandboxId: string) {
	return useQuery({
		queryKey: ["aiLogs", sandboxId],
		queryFn: () => getAiLogs(sandboxId),
		enabled: !!sandboxId,
	});
}
