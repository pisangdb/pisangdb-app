import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				return await auth.handler(request);
			},
			POST: async ({ request }: { request: Request }) => {
				return await auth.handler(request);
			},
			OPTIONS: async () => {
				return new Response(null, {
					status: 204,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type,Authorization",
					},
				});
			},
		},
	},
});
