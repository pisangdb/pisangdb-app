import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/sandboxes")({
	component: SandboxesLayout,
});

function SandboxesLayout() {
	return <Outlet />;
}
