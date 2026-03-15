import { useQuery } from "@tanstack/react-query";
import { getSandbox } from "#/lib/api-client";

export function useSandbox(id: string) {
	return useQuery({
		queryKey: ["sandbox", id],
		queryFn: () => getSandbox(id),
		enabled: !!id,
	});
}
