import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/dashboard/sandboxes")({
	component: SandboxesLayout,
});

function SandboxesLayout() {
	const navigate = useNavigate();

	useEffect(() => {
		if (window.location.pathname === "/dashboard/sandboxes") {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			navigate({ to: "/dashboard/sandboxes/" as any });
		}
	}, [navigate]);

	return <Outlet />;
}
