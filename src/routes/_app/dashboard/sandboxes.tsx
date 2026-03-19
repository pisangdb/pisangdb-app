import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/dashboard/sandboxes")({
	component: SandboxesLayout,
});

function SandboxesLayout() {
	useEffect(() => {
		if (window.location.pathname === "/dashboard/sandboxes") {
			window.location.href = "/dashboard/sandboxes/";
		}
	}, []);

	return <Outlet />;
}
