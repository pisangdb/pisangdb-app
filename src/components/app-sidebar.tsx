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
import type * as React from "react";
import { Logo } from "#/components/logo";
import { NavMain } from "#/components/nav-main";
import { NavSecondary } from "#/components/nav-secondary";
import { NavUsage } from "#/components/nav-usage";
import { NavUser } from "#/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/components/ui/sidebar";

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
				<NavUsage />
			</SidebarContent>
			<SidebarFooter>
				<NavUser
					user={{
						name: user?.name || "Account",
						email: user?.email || "",
						avatar: user?.image || "",
					}}
				/>
			</SidebarFooter>
		</Sidebar>
	);
}
