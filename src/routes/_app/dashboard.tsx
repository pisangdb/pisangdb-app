import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { DashboardHome } from "./dashboard/index";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardLayout,
});

function DashboardLayout() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	if (pathname === "/dashboard") {
		return <DashboardHome />;
	}

	return <Outlet />;
}
