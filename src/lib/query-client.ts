import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30 * 1000, // 30 seconds
				retry: 1,
				refetchOnWindowFocus: false,
			},
		},
	});
}

export type { QueryClient };
