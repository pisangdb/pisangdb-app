import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "#/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";

export function NavMain({
	label,
	items,
}: {
	label?: string;
	items: {
		title: string;
		url: string;
		icon?: React.ReactNode;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
		}[];
	}[];
}) {
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";
	const pathname = useLocation({
		select: (location) => location.pathname,
	});
	const isItemActive = (url: string) =>
		url === "/dashboard"
			? pathname === url
			: pathname === url || pathname.startsWith(`${url}/`);
	const isSubItemActive = (url: string) => pathname === url;

	return (
		<SidebarGroup>
			{label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
			<SidebarMenu>
				{items.map((item) => {
					const childIsActive = Boolean(
						item.items?.some((subItem) => isSubItemActive(subItem.url)),
					);
					const itemIsActive = isItemActive(item.url);

					return item.items?.length ? (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={!isCollapsed || childIsActive || itemIsActive}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton
										tooltip={item.title}
										isActive={childIsActive || itemIsActive}
									>
										{item.icon}
										<span>{item.title}</span>
										<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{item.items.map((subItem) =>
											isCollapsed ? (
												<Tooltip key={subItem.title} delayDuration={0}>
													<TooltipTrigger asChild>
														<SidebarMenuSubItem>
															<SidebarMenuSubButton
																asChild
																data-active={isSubItemActive(subItem.url)}
															>
																<Link to={subItem.url}>
																	<span>{subItem.title}</span>
																</Link>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													</TooltipTrigger>
													<TooltipContent side="right">
														{subItem.title}
													</TooltipContent>
												</Tooltip>
											) : (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton
														asChild
														data-active={isSubItemActive(subItem.url)}
													>
														<Link to={subItem.url}>
															<span>{subItem.title}</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											),
										)}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					) : (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								tooltip={item.title}
								isActive={itemIsActive}
							>
								<Link to={item.url}>
									{item.icon}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
