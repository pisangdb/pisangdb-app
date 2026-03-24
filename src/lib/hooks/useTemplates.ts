import { useQuery } from "@tanstack/react-query";
import type { DbEngine } from "#/lib/types";
import type { TemplateListItem } from "#/modules/templates/serverFn";
import { $getTemplates } from "#/modules/templates/serverFn";

export function useTemplates(engine?: DbEngine) {
	return useQuery({
		queryKey: ["templates", engine],
		queryFn: async (): Promise<TemplateListItem[]> => {
			const result = await $getTemplates({ data: { engine } });
			return result;
		},
	});
}
