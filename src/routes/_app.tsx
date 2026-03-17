import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useMatches,
} from "@tanstack/react-router";
import { AppSidebar } from "#/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Separator } from "#/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { TooltipProvider } from "#/components/ui/tooltip";
import { $getMe } from "#/modules/auth/serverFn";

export const Route = createFileRoute("/_app")({
	beforeLoad: async () => {
		try {
			const user = await $getMe();
			if (!user) {
				throw redirect({
					to: "/login",
					replace: true,
				});
			}
			return { user };
		} catch (error) {
			// If error is a redirect, re-throw it
			if (error instanceof Error && "status" in error) {
				throw error;
			}
			// Otherwise redirect to login
			throw redirect({
				to: "/login",
				replace: true,
			});
		}
	},
	component: AppLayout,
});

const ROUTE_LABELS: Record<string, string> = {
	"/dashboard": "Dashboard",
	"/dashboard/sandboxes": "Sandboxes",
	"/dashboard/sandboxes/new": "New Sandbox",
	"/dashboard/console": "SQL Console",
	"/dashboard/ai-seeder": "AI Seeder",
	"/dashboard/settings": "Settings",
	"/dashboard/account": "Account",
	"/dashboard/help": "Get Help",
};

function getRouteLabel(pathname: string): string | undefined {
	if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
	// Handle /dashboard/sandboxes/:id
	const sandboxDetailMatch = /^\/dashboard\/sandboxes\/([^/]+)$/.exec(pathname);
	if (sandboxDetailMatch) return sandboxDetailMatch[1];
	return undefined;
}

function AppLayout() {
	const matches = useMatches();

	const crumbs = matches
		.filter((m) => m.pathname !== "/" && getRouteLabel(m.pathname))
		.map((m) => ({
			label: getRouteLabel(m.pathname) as string,
			pathname: m.pathname,
		}));

	return (
		<TooltipProvider>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<header className="sticky top-0 z-10 mb-4 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
						<div className="flex items-center gap-2 px-4">
							<SidebarTrigger className="-ml-1" />
							<Separator
								orientation="vertical"
								className="mr-2 data-[orientation=vertical]:h-4"
							/>
							<Breadcrumb>
								<BreadcrumbList>
									{crumbs.map((crumb, index) => {
										const isLast = index === crumbs.length - 1;
										return (
											<span
												key={crumb.pathname}
												className="flex items-center gap-2"
											>
												{index > 0 && (
													<BreadcrumbSeparator className="hidden md:block" />
												)}
												<BreadcrumbItem
													className={
														index < crumbs.length - 1
															? "hidden md:block"
															: undefined
													}
												>
													{isLast ? (
														<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
													) : (
														<BreadcrumbLink asChild>
															<Link to={crumb.pathname as never}>
																{crumb.label}
															</Link>
														</BreadcrumbLink>
													)}
												</BreadcrumbItem>
											</span>
										);
									})}
								</BreadcrumbList>
							</Breadcrumb>
						</div>
					</header>
					<Outlet />
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
