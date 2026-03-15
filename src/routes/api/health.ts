import { createFileRoute } from "@tanstack/react-router";
import { getAppPool } from "#/db";
import { successResponse } from "#/lib/api-response";

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => {
				const timestamp = new Date().toISOString();
				const uptime = Math.floor(process.uptime());

				// Test database connectivity with a lightweight query
				let database: "connected" | "error" = "error";
				try {
					const pool = getAppPool();
					await pool.query("SELECT 1");
					database = "connected";
				} catch {
					database = "error";
				}

				const payload = {
					status: database === "connected" ? "ok" : "error",
					timestamp,
					uptime,
					database,
				} as const;

				return successResponse(payload, 200);
			},
		},
	},
});
