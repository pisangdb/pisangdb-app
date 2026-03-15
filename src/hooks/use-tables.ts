import { useQuery } from "@tanstack/react-query";
import { getTables } from "#/lib/api-client";

export function useTables(sandboxId: string) {
	return useQuery({
		queryKey: ["tables", sandboxId],
		queryFn: () => getTables(sandboxId),
		enabled: !!sandboxId,
	});
}
