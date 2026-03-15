import { useQuery } from "@tanstack/react-query";
import { getMe } from "#/lib/api-client";

export function useUser() {
	return useQuery({
		queryKey: ["user"],
		queryFn: () => getMe(),
		staleTime: 5 * 60 * 1000,
		retry: false,
	});
}
