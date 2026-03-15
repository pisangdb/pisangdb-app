import { useQuery } from "@tanstack/react-query";
import { getSandboxes } from "#/lib/api-client";

export function useSandboxes() {
	return useQuery({
		queryKey: ["sandboxes"],
		queryFn: () => getSandboxes(),
		refetchInterval: 30_000,
	});
}
