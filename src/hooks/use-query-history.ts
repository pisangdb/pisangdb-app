import { useQuery } from "@tanstack/react-query";
import { getQueryHistory } from "#/lib/api-client";

export function useQueryHistory(sandboxId: string) {
	return useQuery({
		queryKey: ["queryHistory", sandboxId],
		queryFn: () => getQueryHistory(sandboxId),
		enabled: !!sandboxId,
	});
}
