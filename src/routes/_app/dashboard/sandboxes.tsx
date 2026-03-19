import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/dashboard/sandboxes")({
	component: SandboxesLayout,
});

function SandboxesLayout() {
	const navigate = useNavigate();

	useEffect(() => {
		if (window.location.pathname === "/dashboard/sandboxes") {
			void navigate({ to: "/dashboard/sandboxes" });
		}
	}, [navigate]);

	return <Outlet />;
}
