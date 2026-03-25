import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { templates } from "#/db/schema";
import { TEMPLATE_DEFINITIONS } from "#/db/seeders/template-sql";

let seedPromise: Promise<void> | null = null;

async function seedBuiltinTemplatesOnce() {
	for (const definition of TEMPLATE_DEFINITIONS) {
		for (const [engine, variant] of Object.entries(definition.variants)) {
			const templateName = `${definition.name} (${engine})`;

			const [existingTemplate] = await db
				.select({ id: templates.id })
				.from(templates)
				.where(
					and(
						eq(templates.name, templateName),
						eq(templates.engine, engine),
						eq(templates.isBuiltin, true),
					),
				)
				.limit(1);

			if (existingTemplate) {
				await db
					.update(templates)
					.set({
						description: definition.description,
						ddlSql: variant.ddl,
						seedSql: variant.seed,
						isBuiltin: true,
					})
					.where(eq(templates.id, existingTemplate.id));
				continue;
			}

			await db.insert(templates).values({
				name: templateName,
				description: definition.description,
				engine,
				ddlSql: variant.ddl,
				seedSql: variant.seed,
				isBuiltin: true,
				userId: null,
			});
		}
	}
}

export async function ensureBuiltinTemplatesSeeded() {
	if (!seedPromise) {
		seedPromise = seedBuiltinTemplatesOnce().catch((error) => {
			seedPromise = null;
			throw error;
		});
	}

	await seedPromise;
}
