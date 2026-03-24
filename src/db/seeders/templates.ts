import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { templates } from "#/db/schema";
import { TEMPLATE_DEFINITIONS } from "./template-sql/index.js";

async function seedTemplates() {
	console.log("🌱 Seeding templates...\n");

	let inserted = 0;
	let skipped = 0;

	for (const def of TEMPLATE_DEFINITIONS) {
		for (const [engine, variant] of Object.entries(def.variants)) {
			const templateName = `${def.name} (${engine})`;

			// Check if template already exists
			const existing = await db
				.select()
				.from(templates)
				.where(eq(templates.name, templateName))
				.limit(1);

			if (existing.length > 0) {
				console.log(`⏭️  Skipped (exists): ${templateName}`);
				skipped++;
				continue;
			}

			await db.insert(templates).values({
				name: templateName,
				description: def.description,
				engine,
				ddlSql: variant.ddl,
				seedSql: variant.seed,
				isBuiltin: true,
				userId: null,
			});

			console.log(`✅ Inserted: ${templateName}`);
			inserted++;
		}
	}

	console.log(`\n🎉 Seeding complete!`);
	console.log(`   Inserted: ${inserted}`);
	console.log(`   Skipped: ${skipped}`);
	console.log(`   Total: ${inserted + skipped}`);

	process.exit(0);
}

seedTemplates().catch((err) => {
	console.error("❌ Seeding failed:", err);
	process.exit(1);
});
