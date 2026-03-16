import { createFileRoute } from "@tanstack/react-router";

let initialized = false;

export const Route = createFileRoute("/api/health/$")({
	server: {
		handlers: {
			GET: async () => {
				if (!initialized) {
					initialized = true;
					try {
						const { startEphemeralEngine } = await import(
							"#/lib/ephemeral-engine"
						);
						startEphemeralEngine();
						console.log("[Health] Ephemeral engine started on first request");
					} catch (error) {
						console.error("[Health] Failed to start ephemeral engine:", error);
					}
				}

				return Response.json({
					status: "ok",
					timestamp: new Date().toISOString(),
				});
			},
		},
	},
});
