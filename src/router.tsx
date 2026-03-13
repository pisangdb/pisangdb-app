import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultNotFound() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				gap: "1rem",
			}}
		>
			<h1 style={{ fontSize: "2.5rem", fontWeight: "bold" }}>404</h1>
			<p>Halaman tidak ditemukan.</p>
			<a href="/" style={{ textDecoration: "underline" }}>
				Kembali ke beranda
			</a>
		</div>
	);
}

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,

		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: DefaultNotFound,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
