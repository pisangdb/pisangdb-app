import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardLayout,
});

function DashboardLayout() {
	const navigate = useNavigate();

	useEffect(() => {
		if (window.location.pathname === "/dashboard") {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			navigate({ to: "/dashboard/" as any });
		}
	}, [navigate]);

	return <Outlet />;
}
