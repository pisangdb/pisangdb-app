import { Link } from "@tanstack/react-router";
import {
	BotIcon,
	DatabaseIcon,
	LayoutDashboardIcon,
	Settings2Icon,
	TerminalIcon,
} from "lucide-react";
import type * as React from "react";
import { Logo } from "#/components/logo";
import { NavMain } from "#/components/nav-main";
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

const data = {
	user: {
		name: "Rio Pratama",
		email: "rio@example.com",
		avatar: "",
	},
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
		{
			title: "Settings",
			url: "/dashboard/settings",
			icon: <Settings2Icon />,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
				<NavMain items={data.navMain} />
				<NavUsage active={2} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	);
}
