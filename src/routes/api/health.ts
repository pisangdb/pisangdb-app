import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import {
	createMariadbAdminPool,
	createMysqlAdminPool,
	createPgAdminPool,
	db,
} from "#/db";
import { getPrimarySandboxRegion } from "#/lib/regions";

interface ServiceStatus {
	status: "up" | "down";
	latency?: number;
	error?: string;
}

interface HealthResponse {
	status: "healthy" | "unhealthy";
	timestamp: string;
	responseTime: number;
	services: {
		app: ServiceStatus;
		database: ServiceStatus;
		postgres_sandbox: ServiceStatus;
		mysql_sandbox: ServiceStatus;
		mariadb_sandbox: ServiceStatus;
	};
}

async function measureLatency<T>(
	_promise: Promise<T>,
	timeoutMs = 100,
): Promise<ServiceStatus> {
	const start = performance.now();
	try {
		const result = await Promise.race([
			_promise,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Timeout")), timeoutMs),
			),
		]);
		const latency = Math.round(performance.now() - start);
		void result; // unused
		return { status: "up", latency };
	} catch (error) {
		const latency = Math.round(performance.now() - start);
		const message = error instanceof Error ? error.message : "Unknown error";
		return { status: "down", latency, error: message };
	}
}

async function checkPostgresSandbox(): Promise<ServiceStatus> {
	try {
		const pool = createPgAdminPool(getPrimarySandboxRegion());
		try {
			return await measureLatency(pool.query("SELECT 1"));
		} finally {
			await pool.end();
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { status: "down", error: message };
	}
}

async function checkMysqlSandbox(): Promise<ServiceStatus> {
	try {
		const pool = createMysqlAdminPool(getPrimarySandboxRegion());
		try {
			return await measureLatency(pool.query("SELECT 1"));
		} finally {
			await pool.end();
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { status: "down", error: message };
	}
}

async function checkMariadbSandbox(): Promise<ServiceStatus> {
	try {
		const pool = createMariadbAdminPool(getPrimarySandboxRegion());
		try {
			return await measureLatency(pool.query("SELECT 1"));
		} finally {
			await pool.end();
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { status: "down", error: message };
	}
}

async function checkDatabase(): Promise<ServiceStatus> {
	try {
		return await measureLatency(db.execute(sql`SELECT 1`));
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { status: "down", error: message };
	}
}

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => {
				const start = performance.now();

				const [database, postgres, mysql, mariadb] = await Promise.all([
					checkDatabase(),
					checkPostgresSandbox(),
					checkMysqlSandbox(),
					checkMariadbSandbox(),
				]);

				const services: HealthResponse["services"] = {
					app: { status: "up" },
					database,
					postgres_sandbox: postgres,
					mysql_sandbox: mysql,
					mariadb_sandbox: mariadb,
				};

				const allUp = Object.values(services).every((s) => s.status === "up");
				const responseTime = Math.round(performance.now() - start);

				const response: HealthResponse = {
					status: allUp ? "healthy" : "unhealthy",
					timestamp: new Date().toISOString(),
					responseTime,
					services,
				};

				return new Response(JSON.stringify(response), {
					status: allUp ? 200 : 503,
					headers: {
						"Content-Type": "application/json",
					},
				});
			},
		},
	},
});
