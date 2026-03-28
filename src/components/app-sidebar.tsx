import { Link, useRouteContext } from "@tanstack/react-router";
import {
	BadgeCheckIcon,
	BotIcon,
	CircleHelpIcon,
	DatabaseIcon,
	LayoutDashboardIcon,
	Settings2Icon,
	TerminalIcon,
} from "lucide-react";
import * as React from "react";
import { Logo } from "#/components/logo";
import { NavMain } from "#/components/nav-main";
import { NavSecondary } from "#/components/nav-secondary";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/components/ui/sidebar";

const NavUsage = React.lazy(async () => {
	const mod = await import("#/components/nav-usage");
	return { default: mod.NavUsage };
});

const NavUser = React.lazy(async () => {
	const mod = await import("#/components/nav-user");
	return { default: mod.NavUser };
});

const navData = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: <LayoutDashboardIcon />,
		},
		{
			title: "Sandboxes",
			url: "/dashboard/sandboxes",
			icon: <DatabaseIcon />,
			items: [
				{
					title: "All Sandboxes",
					url: "/dashboard/sandboxes",
				},
				{
					title: "New Sandbox",
					url: "/dashboard/sandboxes/new",
				},
			],
		},
		{
			title: "SQL Console",
			url: "/dashboard/console",
			icon: <TerminalIcon />,
		},
		{
			title: "AI Seeder",
			url: "/dashboard/ai-seeder",
			icon: <BotIcon />,
		},
	],
	navSecondary: [
		{
			title: "Account",
			url: "/dashboard/account",
			icon: <BadgeCheckIcon />,
		},
		{
			title: "Settings",
			url: "/dashboard/settings",
			icon: <Settings2Icon />,
		},
		{
			title: "Help",
			url: "/dashboard/help",
			icon: <CircleHelpIcon />,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const context = useRouteContext({ from: "/_app" });
	const user = context?.user;
	const shouldMountDeferred = useDeferredSidebarModules();
	const userName = user?.name || "Account";
	const userEmail = user?.email || "";

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:p-1.5!"
						>
							<Link to="/dashboard">
								<Logo
									size="sm"
									showText={false}
									className="group-data-[collapsible=icon]:flex hidden"
								/>
								<Logo
									size="sm"
									showText={true}
									className="group-data-[collapsible=icon]:hidden"
								/>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain label="Workspace" items={navData.navMain} />
				<NavSecondary label="Account" items={navData.navSecondary} />
				{shouldMountDeferred ? (
					<React.Suspense fallback={<NavUsageFallback />}>
						<NavUsage />
					</React.Suspense>
				) : (
					<NavUsageFallback />
				)}
			</SidebarContent>
			<SidebarFooter>
				{shouldMountDeferred ? (
					<React.Suspense
						fallback={<NavUserFallback name={userName} email={userEmail} />}
					>
						<NavUser
							user={{
								name: userName,
								email: userEmail,
								avatar: user?.image || "",
							}}
						/>
					</React.Suspense>
				) : (
					<NavUserFallback name={userName} email={userEmail} />
				)}
			</SidebarFooter>
		</Sidebar>
	);
}

function useDeferredSidebarModules() {
	const [shouldMount, setShouldMount] = React.useState(false);

	React.useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const timeoutId = window.setTimeout(() => setShouldMount(true), 32);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, []);

	return shouldMount;
}

function NavUsageFallback() {
	return (
		<SidebarGroup className="mt-auto">
			<SidebarGroupLabel className="sr-only">Sandbox Usage</SidebarGroupLabel>
			<SidebarGroupContent>
				<div className="rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-3">
					<div className="h-3 w-24 rounded bg-sidebar-border/70" />
				</div>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

function NavUserFallback({ email, name }: { email: string; name: string }) {
	const initials = name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton asChild size="lg">
					<Link to="/dashboard/account">
						<div className="flex size-8 items-center justify-center rounded-lg border bg-sidebar-accent text-xs font-medium">
							{initials || "A"}
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">{name}</span>
							{email ? <span className="truncate text-xs">{email}</span> : null}
						</div>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
