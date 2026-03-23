import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error("DATABASE_URL environment variable is required");
	process.exit(1);
}

async function runMigrations() {
	console.log("Starting database migrations...");

	const pool = new Pool({ connectionString: DATABASE_URL });
	const db = drizzle(pool);

	try {
		await migrate(db, { migrationsFolder: "./src/db/migrations" });
		console.log("Migrations completed successfully");
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

runMigrations();
