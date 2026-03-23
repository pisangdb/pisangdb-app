import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { DatabaseIcon, PlusIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Progress } from "#/components/ui/progress";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	useSidebar,
} from "#/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { $getDashboardStats } from "#/modules/sandboxes/serverFn";

function CircularProgress({
	percentage,
	size = 32,
	strokeWidth = 3,
}: {
	percentage: number;
	size?: number;
	strokeWidth?: number;
}) {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (percentage / 100) * circumference;

	const progressColor =
		percentage >= 80 ? "#ef4444" : percentage >= 60 ? "#eab308" : "#10b981";

	return (
		<svg
			width={size}
			height={size}
			className="transform -rotate-90"
			role="img"
			aria-label={`Sandbox usage: ${percentage}%`}
		>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
				stroke="currentColor"
				fill="none"
				className="text-sidebar-border"
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
				stroke={progressColor}
				fill="none"
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				strokeLinecap="round"
				className="transition-all duration-300"
			/>
		</svg>
	);
}

export function NavUsage() {
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";

	const { data, isLoading } = useQuery({
		queryKey: ["dashboard-stats"],
		queryFn: () => $getDashboardStats(),
	});

	const activeSandboxes = data?.activeSandboxes ?? 0;
	const maxSandboxes = data?.maxSandboxes ?? 5;
	const percentage = (activeSandboxes / maxSandboxes) * 100;

	const progressColor =
		percentage >= 80
			? "bg-red-500"
			: percentage >= 60
				? "bg-yellow-500"
				: "bg-emerald-500";

	if (isCollapsed) {
		return (
			<SidebarGroup className="mt-auto">
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="relative mx-auto flex size-8 items-center justify-center">
							<CircularProgress
								percentage={percentage}
								size={32}
								strokeWidth={3}
							/>
							<DatabaseIcon className="absolute size-4 text-sidebar-primary" />
						</div>
					</TooltipTrigger>
					<TooltipContent side="right">
						<p>Sandbox Usage</p>
						<p className="text-muted-foreground">
							{isLoading ? (
								<span className="animate-pulse">...</span>
							) : (
								`${activeSandboxes}/${maxSandboxes} active`
							)}
						</p>
					</TooltipContent>
				</Tooltip>
			</SidebarGroup>
		);
	}

	return (
		<SidebarGroup className="mt-auto">
			<SidebarGroupLabel className="sr-only">Sandbox Usage</SidebarGroupLabel>
			<SidebarGroupContent>
				<div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<div className="relative flex size-6 items-center justify-center">
							<CircularProgress
								percentage={percentage}
								size={24}
								strokeWidth={2.5}
							/>
							<DatabaseIcon className="absolute size-3 text-sidebar-primary" />
						</div>
						<span className="text-xs font-medium text-sidebar-foreground">
							Sandbox Usage
						</span>
						<span className="ml-auto text-xs text-sidebar-foreground/50">
							{isLoading ? (
								<span className="animate-pulse">...</span>
							) : (
								`${activeSandboxes}/${maxSandboxes}`
							)}
						</span>
					</div>
					<Progress
						value={percentage}
						className="h-1.5 bg-sidebar-border"
						indicatorClassName={progressColor}
					/>
					<Button
						asChild
						size="sm"
						variant="outline"
						className="h-7 w-full gap-1.5 text-xs border-sidebar-border bg-sidebar-background hover:bg-sidebar-accent"
					>
						<Link to="/dashboard/sandboxes/new">
							<PlusIcon className="size-3" />
							New Sandbox
						</Link>
					</Button>
				</div>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
