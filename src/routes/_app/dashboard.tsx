import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardLayout,
});

function DashboardLayout() {
	const navigate = useNavigate();

	useEffect(() => {
		if (window.location.pathname === "/dashboard") {
			void navigate({ to: "/dashboard" });
		}
	}, [navigate]);

	return <Outlet />;
}
