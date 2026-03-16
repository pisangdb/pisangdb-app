import { useQuery } from "@tanstack/react-query";
import { getTemplates } from "#/lib/api-client";

export function useTemplates(engine?: string) {
	return useQuery({
		queryKey: ["templates", engine],
		queryFn: () => getTemplates(engine),
	});
}
