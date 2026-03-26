import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	BotIcon,
	CircleCheckIcon,
	CopyIcon,
	DatabaseIcon,
	PlusIcon,
	TerminalIcon,
	ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import type { SandboxUiStatus } from "#/lib/types";
import { computeSandboxUiStatus } from "#/lib/types";

export const Route = createFileRoute("/_app/dashboard/")({
	loader: async () => {
		const { $getSandboxes, $getDashboardStats } = await import(
			"#/modules/sandboxes/serverFn"
		);
		const [sandboxes, stats] = await Promise.all([
			$getSandboxes(),
			$getDashboardStats(),
		]);
		return { sandboxes, stats };
	},
	pendingComponent: DashboardSkeleton,
	component: DashboardHome,
});

const generateKey = () => `sk-${Math.random().toString(36).slice(2, 9)}`;

function DashboardSkeleton() {
	return (
		<div className="flex flex-col gap-4 p-4 md:p-5">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<Skeleton className="h-7 w-32" />
					<Skeleton className="h-4 w-48" />
				</div>
				<Skeleton className="h-8 w-28" />
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 4 }).map(() => (
					<div
						key={generateKey()}
						className="flex flex-col gap-3 rounded-lg border p-4"
					>
						<div className="flex items-center justify-between">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="size-7" />
						</div>
						<div className="flex items-baseline gap-1.5">
							<Skeleton className="h-8 w-12" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
				))}
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<div className="flex flex-col gap-2 rounded-lg border p-4">
					<Skeleton className="h-4 w-20" />
					{Array.from({ length: 4 }).map(() => (
						<div
							key={generateKey()}
							className="flex items-center gap-3 rounded-md p-2"
						>
							<Skeleton className="size-9" />
							<div className="flex flex-col gap-1">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-32" />
							</div>
						</div>
					))}
				</div>

				<div className="flex flex-col gap-2 rounded-lg border p-4 lg:col-span-2">
					<div className="flex items-center justify-between">
						<div className="flex flex-col gap-1">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-3 w-36" />
						</div>
						<Skeleton className="h-7 w-16" />
					</div>
					<div className="flex flex-col gap-2">
						{Array.from({ length: 3 }).map(() => (
							<div
								key={generateKey()}
								className="flex items-center gap-3 rounded-lg border p-3"
							>
								<Skeleton className="size-9" />
								<div className="flex flex-1 flex-col gap-1">
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-3 w-48" />
								</div>
								<div className="flex flex-col items-end gap-1">
									<Skeleton className="h-5 w-16" />
									<Skeleton className="h-3 w-12" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

const statusConfig: Record<
	SandboxUiStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	active: {
		label: "🟢 Active",
		variant: "default",
	},
	expiring: {
		label: "🟡 Expiring Soon",
		variant: "outline",
	},
	expired: {
		label: "🔴 Expired",
		variant: "destructive",
	},
	destroying: {
		label: "🔴 Destroying",
		variant: "secondary",
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
		accent: "bg-muted text-foreground",
	},
	{
		label: "AI Seeder",
		description: "Generate schema with AI",
		icon: <BotIcon className="size-5" />,
		href: "/dashboard/ai-seeder",
		accent: "bg-muted text-foreground",
	},
	{
		label: "Quick Start",
		description: "Learn PisangDB in 5 minutes",
		icon: <ZapIcon className="size-5" />,
		href: "/dashboard/help",
		accent: "bg-muted text-foreground",
	},
];

function getEngineEmoji(engine: string): string {
	switch (engine) {
		case "postgresql":
			return "🐘";
		case "mysql":
			return "🐬";
		case "mariadb":
			return "🦭";
		default:
			return "🍌";
	}
}

function getEngineLabel(engine: string): string {
	switch (engine) {
		case "postgresql":
			return "PostgreSQL";
		case "mysql":
			return "MySQL";
		case "mariadb":
			return "MariaDB";
		default:
			return engine;
	}
}

function formatTimeRemaining(expiredAt: string): string {
	const now = new Date();
	const expiry = new Date(expiredAt);
	const diffMs = expiry.getTime() - now.getTime();

	if (diffMs <= 0) return "Expired";

	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

	if (diffHours > 24) {
		const days = Math.floor(diffHours / 24);
		return `${days}d left`;
	}
	if (diffHours > 0) {
		return `${diffHours}h ${diffMinutes}m left`;
	}
	return `${diffMinutes}m left`;
}

function formatCreatedAgo(createdAt: string): string {
	const now = new Date();
	const created = new Date(createdAt);
	const diffMs = now.getTime() - created.getTime();

	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	if (diffHours < 1) return "Just now";
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays === 1) return "Yesterday";
	return `${diffDays}d ago`;
}

export function DashboardHome() {
	const loaderData = Route.useLoaderData();
	const sandboxes = loaderData?.sandboxes ?? [];
	const stats = {
		activeSandboxes: loaderData?.stats?.activeSandboxes ?? 0,
		totalCreated: loaderData?.stats?.totalCreated ?? 0,
		autoCleaned: loaderData?.stats?.autoCleaned ?? 0,
		aiQueriesThisMonth: loaderData?.stats?.aiQueriesThisMonth ?? 0,
		tier: loaderData?.stats?.tier ?? "free",
		maxSandboxes: loaderData?.stats?.maxSandboxes ?? 5,
	};
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [actionResult, setActionResult] = useState<{
		id: string;
		message: string;
	} | null>(null);

	const statsCards = [
		{
			label: "Total Created",
			value: String(stats.totalCreated),
			sub: "all time",
			icon: <ActivityIcon className="size-4" />,
			accent: "text-muted-foreground",
			bg: "bg-muted",
		},
		{
			label: "Auto-cleaned",
			value: String(stats.autoCleaned),
			sub: "zero effort",
			icon: <CircleCheckIcon className="size-4" />,
			accent: "text-muted-foreground",
			bg: "bg-muted",
		},
		{
			label: "AI Queries",
			value: String(stats.aiQueriesThisMonth),
			sub: "this month",
			icon: <BotIcon className="size-4" />,
			accent: "text-muted-foreground",
			bg: "bg-muted",
		},
	];

	const onCopyConnection = async (id: string, connectionUrl: string) => {
		if (typeof navigator === "undefined" || !navigator.clipboard) {
			setActionResult({ id, message: "Clipboard not available" });
			setTimeout(() => {
				setActionResult((current) => (current?.id === id ? null : current));
			}, 1500);
			return;
		}

		await navigator.clipboard.writeText(connectionUrl);
		setCopiedId(id);
		setActionResult({ id, message: "Connection copied" });
		setTimeout(() => {
			setCopiedId((current) => (current === id ? null : current));
			setActionResult((current) => (current?.id === id ? null : current));
		}, 1200);
	};

	const recentSandboxes = sandboxes
		.slice()
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)
		.slice(0, 5);
	const activePct =
		stats.maxSandboxes > 0
			? Math.round((stats.activeSandboxes / stats.maxSandboxes) * 100)
			: 0;

	return (
		<div className="flex flex-col gap-4 p-4 md:p-5">
			<div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/60 p-5 md:p-6">
				<div className="flex flex-col gap-5">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="max-w-2xl">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Workspace Overview</Badge>
								<Badge variant="secondary">Free Tier</Badge>
							</div>
							<h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
								Your sandbox control center
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Create, inspect, seed, and query sandbox databases from one
								workspace surface with live usage, limits, and recent activity.
							</p>
						</div>
						<div className="flex flex-wrap gap-2 lg:justify-end">
							<Button asChild size="sm" className="gap-1.5">
								<Link to="/dashboard/sandboxes/new">
									<PlusIcon className="size-4" />
									New Sandbox
								</Link>
							</Button>
							<Button asChild size="sm" variant="outline" className="gap-1.5">
								<Link to="/dashboard/sandboxes">
									<DatabaseIcon className="size-4" />
									View Sandboxes
								</Link>
							</Button>
						</div>
					</div>

					<div className="rounded-xl border bg-background/70 p-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">Sandbox Capacity</p>
								<p className="text-xs text-muted-foreground">
									{stats.activeSandboxes} active sandboxes currently running.
									You still have {stats.maxSandboxes - stats.activeSandboxes}{" "}
									slot(s) available in the current workspace tier.
								</p>
							</div>
							<Badge variant="outline" className="w-fit">
								{activePct}% used
							</Badge>
						</div>
						<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all"
								style={{ width: `${Math.min(100, activePct)}%` }}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{statsCards.map((stat) => (
					<Card key={stat.label} className="gap-3 rounded-xl">
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

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle className="text-sm font-semibold">
							Quick Actions
						</CardTitle>
						<CardDescription className="text-xs">
							Jump straight into the next thing you want to do.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{quickActions.map((action) => (
							<Link
								key={action.label}
								to={action.href}
								className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-border hover:bg-muted/50"
							>
								<div
									className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${action.accent}`}
								>
									{action.icon}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium">{action.label}</p>
									<p className="truncate text-xs text-muted-foreground">
										{action.description}
									</p>
								</div>
							</Link>
						))}
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold">
								Recent Sandboxes
							</CardTitle>
							<CardDescription className="text-xs">
								Your latest database sandboxes.
							</CardDescription>
						</div>
						<Button asChild variant="ghost" size="sm" className="text-xs">
							<Link to="/dashboard/sandboxes">View all</Link>
						</Button>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{recentSandboxes.length === 0 ? (
							<div className="rounded-xl border border-dashed p-6 text-center">
								<p className="text-sm font-medium">No sandbox yet</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Create your first sandbox to start testing quickly.
								</p>
								<Button asChild size="sm" className="mt-4">
									<Link to="/dashboard/sandboxes/new">Create sandbox</Link>
								</Button>
							</div>
						) : (
							recentSandboxes.map((sb) => {
								const uiStatus = computeSandboxUiStatus(
									sb.status,
									sb.expiredAt,
								);
								const status = statusConfig[uiStatus];
								return (
									<div
										key={sb.id}
										className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40 ${
											uiStatus === "expired" || uiStatus === "destroying"
												? "opacity-50 grayscale"
												: ""
										}`}
									>
										<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
											{getEngineEmoji(sb.engine)}
										</div>

										<div className="min-w-0 flex-1">
											<p className="mb-1 text-xs text-muted-foreground">
												{sb.displayName}
											</p>
											<Link
												to="/dashboard/sandboxes/$id"
												params={{ id: sb.id }}
												className="truncate font-mono text-sm font-medium hover:underline"
											>
												{sb.dbName}
											</Link>
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<span>{getEngineLabel(sb.engine)}</span>
												<span>·</span>
												<span>{sb.region.toUpperCase()}</span>
												<span>·</span>
												<span>Created {formatCreatedAgo(sb.createdAt)}</span>
											</div>
										</div>

										<div className="flex shrink-0 flex-col items-end gap-1">
											<Badge
												variant={status.variant}
												className="px-1.5 py-0 text-[10px]"
											>
												{status.label}
											</Badge>
											<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
												<span>{formatTimeRemaining(sb.expiredAt)}</span>
											</div>
											<div className="mt-1 flex items-center gap-1">
												<Button
													variant="outline"
													size="icon"
													className="size-6"
													onClick={() => {
														void onCopyConnection(sb.id, sb.connectionUrl);
													}}
													title="Copy connection URL"
												>
													<CopyIcon className="size-3" />
												</Button>
											</div>
											{copiedId === sb.id ? (
												<p className="text-[10px] text-muted-foreground">
													Copied
												</p>
											) : null}
											{actionResult?.id === sb.id ? (
												<p className="text-[10px] text-muted-foreground">
													{actionResult.message}
												</p>
											) : null}
										</div>
									</div>
								);
							})
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
