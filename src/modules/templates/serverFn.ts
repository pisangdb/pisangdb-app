import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import type { DbEngine } from "#/lib/types";
import { getTemplatesSchema } from "./schema";

async function getTemplatesServerContext() {
	const [{ db }, schema] = await Promise.all([
		import("#/db"),
		import("#/db/schema"),
	]);

	return {
		db,
		templates: schema.templates,
	};
}

export type TemplateListItem = {
	id: string;
	name: string;
	description: string | null;
	engine: DbEngine;
	isBuiltin: boolean;
};

export const $getTemplates = createServerFn({ method: "GET" })
	.inputValidator(getTemplatesSchema)
	.handler(async ({ data }): Promise<TemplateListItem[]> => {
		const { db, templates } = await getTemplatesServerContext();
		const engineFilter = data?.engine;

		const conditions = [eq(templates.isBuiltin, true)];
		if (engineFilter) {
			conditions.push(eq(templates.engine, engineFilter));
		}

		const result = await db
			.select({
				id: templates.id,
				name: templates.name,
				description: templates.description,
				engine: templates.engine,
				isBuiltin: templates.isBuiltin,
			})
			.from(templates)
			.where(and(...conditions))
			.orderBy(templates.name);

		return result.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			engine: row.engine as DbEngine,
			isBuiltin: row.isBuiltin,
		}));
	});
