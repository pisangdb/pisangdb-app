import { createFileRoute } from "@tanstack/react-router";
import {
	ActivityIcon,
	BotIcon,
	CircleCheckIcon,
	ClockIcon,
	DatabaseIcon,
	PlusIcon,
	TerminalIcon,
	ZapIcon,
} from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardPage,
});

const stats = [
	{
		label: "Active Sandboxes",
		value: "2",
		sub: "of 5 max",
		icon: <DatabaseIcon className="size-4" />,
		accent: "text-primary",
		bg: "bg-primary/10",
	},
	{
		label: "Total Created",
		value: "14",
		sub: "all time",
		icon: <ActivityIcon className="size-4" />,
		accent: "text-blue-500",
		bg: "bg-blue-500/10",
	},
	{
		label: "Auto-cleaned",
		value: "12",
		sub: "zero effort",
		icon: <CircleCheckIcon className="size-4" />,
		accent: "text-emerald-500",
		bg: "bg-emerald-500/10",
	},
	{
		label: "AI Queries",
		value: "8",
		sub: "this month",
		icon: <BotIcon className="size-4" />,
		accent: "text-violet-500",
		bg: "bg-violet-500/10",
	},
];

type SandboxStatus = "active" | "expiring" | "expired";

const recentSandboxes: {
	id: string;
	name: string;
	engine: string;
	engineEmoji: string;
	region: string;
	status: SandboxStatus;
	ttl: string;
	createdAt: string;
}[] = [
	{
		id: "sb_a1b2x8",
		name: "pisang_a1b2_myapp_x8k2",
		engine: "PostgreSQL 16",
		engineEmoji: "🐘",
		region: "🇮🇩 Indonesia",
		status: "active",
		ttl: "5 jam lagi",
		createdAt: "2 jam lalu",
	},
	{
		id: "sb_c3d4y9",
		name: "pisang_c3d4_testing_z7j1",
		engine: "MySQL 8",
		engineEmoji: "🐬",
		region: "🇮🇩 Indonesia",
		status: "expiring",
		ttl: "18 menit lagi",
		createdAt: "6 jam lalu",
	},
	{
		id: "sb_e5f6z1",
		name: "pisang_e5f6_bootcamp_q2w3",
		engine: "MariaDB 11",
		engineEmoji: "🦭",
		region: "🇮🇩 Indonesia",
		status: "expired",
		ttl: "Expired",
		createdAt: "1 hari lalu",
	},
];

const statusConfig: Record<
	SandboxStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		className: string;
	}
> = {
	active: {
		label: "Active",
		variant: "default",
		className:
			"bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 dark:text-emerald-400",
	},
	expiring: {
		label: "Expiring Soon",
		variant: "outline",
		className:
			"bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20 dark:text-yellow-400",
	},
	expired: {
		label: "Expired",
		variant: "secondary",
		className: "bg-muted text-muted-foreground",
	},
};

const quickActions = [
	{
		label: "New Sandbox",
		description: "Spin up a database in < 2s",
		icon: <PlusIcon className="size-5" />,
		href: "/dashboard/sandboxes/new",
		accent: "bg-primary/10 text-primary",
	},
	{
		label: "SQL Console",
		description: "Run queries in browser",
		icon: <TerminalIcon className="size-5" />,
		href: "/dashboard/console",
		accent: "bg-blue-500/10 text-blue-500",
	},
	{
		label: "AI Seeder",
		description: "Generate schema with AI",
		icon: <BotIcon className="size-5" />,
		href: "/dashboard/ai-seeder",
		accent: "bg-violet-500/10 text-violet-500",
	},
	{
		label: "Quick Start",
		description: "Learn PisangDB in 5 menit",
		icon: <ZapIcon className="size-5" />,
		href: "/dashboard/help",
		accent: "bg-emerald-500/10 text-emerald-500",
	},
];

function DashboardPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Welcome back! Here's what's going on.
					</p>
				</div>
				<Button asChild size="sm" className="gap-1.5">
					<a href="/dashboard/sandboxes/new">
						<PlusIcon className="size-4" />
						New Sandbox
					</a>
				</Button>
			</div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<Card key={stat.label} className="gap-3">
						<CardHeader className="flex flex-row items-center justify-between pb-0">
							<CardDescription className="text-xs font-medium">
								{stat.label}
							</CardDescription>
							<div
								className={`flex size-7 items-center justify-center rounded-md ${stat.bg} ${stat.accent}`}
							>
								{stat.icon}
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-baseline gap-1.5">
								<span className="text-2xl font-bold">{stat.value}</span>
								<span className="text-xs text-muted-foreground">
									{stat.sub}
								</span>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Quick actions + Recent sandboxes */}
			<div className="grid gap-4 lg:grid-cols-3">
				{/* Quick actions */}
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle className="text-sm font-semibold">
							Quick Actions
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{quickActions.map((action) => (
							<a
								key={action.label}
								href={action.href}
								className="flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:border-border hover:bg-muted/50"
							>
								<div
									className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${action.accent}`}
								>
									{action.icon}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium">{action.label}</p>
									<p className="text-xs text-muted-foreground truncate">
										{action.description}
									</p>
								</div>
							</a>
						))}
					</CardContent>
				</Card>

				{/* Recent sandboxes */}
				<Card className="lg:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold">
								Recent Sandboxes
							</CardTitle>
							<CardDescription className="text-xs">
								Your latest database sandboxes
							</CardDescription>
						</div>
						<Button asChild variant="ghost" size="sm" className="text-xs">
							<a href="/dashboard/sandboxes">View all</a>
						</Button>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{recentSandboxes.map((sb) => {
							const status = statusConfig[sb.status];
							return (
								<div
									key={sb.id}
									className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
								>
									{/* engine emoji */}
									<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
										{sb.engineEmoji}
									</div>

									{/* info */}
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium font-mono">
											{sb.name}
										</p>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<span>{sb.engine}</span>
											<span>·</span>
											<span>{sb.region}</span>
										</div>
									</div>

									{/* ttl + status */}
									<div className="flex shrink-0 flex-col items-end gap-1">
										<Badge
											variant={status.variant}
											className={`text-[10px] px-1.5 py-0 ${status.className}`}
										>
											{status.label}
										</Badge>
										<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
											<ClockIcon className="size-3" />
											{sb.ttl}
										</div>
									</div>
								</div>
							);
						})}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
