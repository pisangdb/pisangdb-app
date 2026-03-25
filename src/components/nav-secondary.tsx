import { Link, useLocation } from "@tanstack/react-router";
import type * as React from "react";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/components/ui/sidebar";

export function NavSecondary({
	label,
	items,
	...props
}: {
	label?: string;
	items: {
		title: string;
		url: string;
		icon: React.ReactNode;
	}[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
	const pathname = useLocation({
		select: (location) => location.pathname,
	});

	return (
		<SidebarGroup {...props}>
			{label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => {
						const itemIsActive =
							pathname === item.url || pathname.startsWith(`${item.url}/`);

						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton asChild size="sm" isActive={itemIsActive}>
									<Link to={item.url}>
										{item.icon}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
