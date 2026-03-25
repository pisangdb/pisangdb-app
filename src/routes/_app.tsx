import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useMatches,
} from "@tanstack/react-router";
import { AlertTriangleIcon } from "lucide-react";
import { AppSidebar } from "#/components/app-sidebar";
import { ErrorBoundary } from "#/components/error-boundary";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { TooltipProvider } from "#/components/ui/tooltip";
import { $getMe } from "#/modules/auth/serverFn";

if (import.meta.env.SSR) {
	import("#/lib/ephemeral-engine").then(({ startEphemeralEngine }) => {
		startEphemeralEngine();
	});
}

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
			if (error instanceof Error && "status" in error) {
				throw error;
			}
			throw redirect({
				to: "/login",
				replace: true,
			});
		}
	},
	component: AppLayout,
	errorComponent: DashboardError,
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
					<ErrorBoundary>
						<Outlet />
					</ErrorBoundary>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}

function DashboardError({ error }: { error: unknown }) {
	const isAuth =
		error instanceof Error &&
		(error.message.toLowerCase().includes("unauthorized") ||
			error.message.toLowerCase().includes("not authenticated") ||
			error.message.toLowerCase().includes("auth"));

	return (
		<Card className="m-4">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<AlertTriangleIcon className="size-4 text-destructive" />
					Something went wrong
				</CardTitle>
				<CardDescription>
					{isAuth
						? "Your session may have expired. Try logging in again."
						: "An unexpected error occurred loading this page."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="mb-4 text-sm text-muted-foreground">
					{error instanceof Error ? error.message : String(error)}
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						if (isAuth) {
							window.location.href = "/login";
						} else {
							window.location.href = "/dashboard";
						}
					}}
				>
					{isAuth ? "Log in again" : "Go to Dashboard"}
				</Button>
			</CardContent>
		</Card>
	);
}
