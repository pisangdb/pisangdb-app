import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardLayout,
});

function DashboardLayout() {
	useEffect(() => {
		if (window.location.pathname === "/dashboard") {
			window.location.href = "/dashboard/";
		}
	}, []);

	return <Outlet />;
}
