import { Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	BotIcon,
	CircleCheckIcon,
	ClockIcon,
	CopyIcon,
	DatabaseIcon,
	PlusIcon,
	RefreshCcwIcon,
	TerminalIcon,
	Trash2Icon,
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

const MAX_ACTIVE_SANDBOXES = 5;
type DashboardState = "loading" | "error" | "success";
const dashboardState: DashboardState = "success";

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
	connectionUrl: string;
}[] = [
	{
		id: "sb_a1b2x8",
		name: "pisang_a1b2_myapp_x8k2",
		engine: "PostgreSQL 16",
		engineEmoji: "🐘",
		region: "🇮🇩 Indonesia",
		status: "active",
		ttl: "5h left",
		createdAt: "2h ago",
		connectionUrl:
			"postgresql://sb_a1b2x8:***@id.pisangdb.com:5432/pisang_a1b2_myapp_x8k2",
	},
	{
		id: "sb_c3d4y9",
		name: "pisang_c3d4_testing_z7j1",
		engine: "MySQL 8",
		engineEmoji: "🐬",
		region: "🇮🇩 Indonesia",
		status: "expiring",
		ttl: "18m left",
		createdAt: "6h ago",
		connectionUrl:
			"mysql://sb_c3d4y9:***@id.pisangdb.com:3306/pisang_c3d4_testing_z7j1",
	},
	{
		id: "sb_e5f6z1",
		name: "pisang_e5f6_bootcamp_q2w3",
		engine: "MariaDB 11",
		engineEmoji: "🦭",
		region: "🇮🇩 Indonesia",
		status: "expired",
		ttl: "Expired",
		createdAt: "1d ago",
		connectionUrl:
			"mysql://sb_e5f6z1:***@id.pisangdb.com:3307/pisang_e5f6_bootcamp_q2w3",
	},
];

const statusConfig: Record<
	SandboxStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	active: {
		label: "Active",
		variant: "default",
	},
	expiring: {
		label: "Expiring Soon",
		variant: "outline",
	},
	expired: {
		label: "Expired",
		variant: "destructive",
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

const activeCount = recentSandboxes.filter(
	(sb) => sb.status === "active",
).length;
const totalCreated = 14;
const autoCleaned = 12;
const aiQueries = 8;

const stats = [
	{
		label: "Active Sandboxes",
		value: String(activeCount),
		sub: `of ${MAX_ACTIVE_SANDBOXES} max`,
		icon: <DatabaseIcon className="size-4" />,
		accent: "text-primary",
		bg: "bg-primary/10",
	},
	{
		label: "Total Created",
		value: String(totalCreated),
		sub: "all time",
		icon: <ActivityIcon className="size-4" />,
		accent: "text-muted-foreground",
		bg: "bg-muted",
	},
	{
		label: "Auto-cleaned",
		value: String(autoCleaned),
		sub: "zero effort",
		icon: <CircleCheckIcon className="size-4" />,
		accent: "text-muted-foreground",
		bg: "bg-muted",
	},
	{
		label: "AI Queries",
		value: String(aiQueries),
		sub: "this month",
		icon: <BotIcon className="size-4" />,
		accent: "text-muted-foreground",
		bg: "bg-muted",
	},
];

function DashboardSkeleton() {
	return (
		<>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{["stat-a", "stat-b", "stat-c", "stat-d"].map((key) => (
					<Card key={key}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-28" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-20" />
						</CardContent>
					</Card>
				))}
			</div>
			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-1">
					<CardHeader>
						<Skeleton className="h-5 w-28" />
					</CardHeader>
					<CardContent className="space-y-2">
						{["action-a", "action-b", "action-c", "action-d"].map((key) => (
							<Skeleton key={key} className="h-14 w-full" />
						))}
					</CardContent>
				</Card>
				<Card className="lg:col-span-2">
					<CardHeader>
						<Skeleton className="h-5 w-40" />
					</CardHeader>
					<CardContent className="space-y-2">
						{["sandbox-a", "sandbox-b", "sandbox-c"].map((key) => (
							<Skeleton key={key} className="h-20 w-full" />
						))}
					</CardContent>
				</Card>
			</div>
		</>
	);
}

export function DashboardHome() {
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<{
		id: string;
		type: "extend" | "delete";
	} | null>(null);
	const [actionResult, setActionResult] = useState<{
		id: string;
		message: string;
	} | null>(null);

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

	const onMockAction = async (id: string, type: "extend" | "delete") => {
		setPendingAction({ id, type });
		setActionResult(null);

		await new Promise((resolve) => {
			setTimeout(resolve, 800);
		});

		setPendingAction((current) => {
			if (!current || current.id !== id || current.type !== type)
				return current;
			return null;
		});
		setActionResult({
			id,
			message:
				type === "extend" ? "Extend request queued" : "Delete request queued",
		});
		setTimeout(() => {
			setActionResult((current) => (current?.id === id ? null : current));
		}, 1600);
	};

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Monitor your sandbox activity and quick actions.
					</p>
				</div>
				<Button asChild size="sm" className="gap-1.5">
					<Link to="/dashboard/sandboxes/new">
						<PlusIcon className="size-4" />
						New Sandbox
					</Link>
				</Button>
			</div>

			{dashboardState === "loading" ? <DashboardSkeleton /> : null}

			{dashboardState === "error" ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Unable to load dashboard
						</CardTitle>
						<CardDescription>
							Something went wrong while fetching your sandbox overview.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="outline" size="sm" className="gap-1.5">
							<RefreshCcwIcon className="size-4" />
							Retry
						</Button>
					</CardContent>
				</Card>
			) : null}

			{dashboardState === "success" ? (
				<>
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

					<div className="grid gap-4 lg:grid-cols-3">
						<Card className="lg:col-span-1">
							<CardHeader>
								<CardTitle className="text-sm font-semibold">
									Quick Actions
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-2">
								{quickActions.map((action) => (
									<Link
										key={action.label}
										to={action.href}
										className="flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:border-border hover:bg-muted/50"
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
										Your latest database sandboxes
									</CardDescription>
								</div>
								<Button asChild variant="ghost" size="sm" className="text-xs">
									<Link to="/dashboard/sandboxes">View all</Link>
								</Button>
							</CardHeader>
							<CardContent className="flex flex-col gap-2">
								{recentSandboxes.length === 0 ? (
									<div className="rounded-lg border border-dashed p-6 text-center">
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
										const status = statusConfig[sb.status];
										return (
											<div
												key={sb.id}
												className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
											>
												<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
													{sb.engineEmoji}
												</div>

												<div className="min-w-0 flex-1">
													<p className="truncate font-mono text-sm font-medium">
														{sb.name}
													</p>
													<div className="flex items-center gap-2 text-xs text-muted-foreground">
														<span>{sb.engine}</span>
														<span>·</span>
														<span>{sb.region}</span>
														<span>·</span>
														<span>Created {sb.createdAt}</span>
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
														<ClockIcon className="size-3" />
														{sb.ttl}
													</div>
													<div className="mt-1 flex items-center gap-1">
														<Button
															variant="outline"
															size="icon"
															className="size-6"
															onClick={() => {
																void onCopyConnection(sb.id, sb.connectionUrl);
															}}
															disabled={pendingAction?.id === sb.id}
															title="Copy connection URL"
														>
															<CopyIcon className="size-3" />
														</Button>
														<Button
															variant="outline"
															size="icon"
															className="size-6"
															onClick={() => {
																void onMockAction(sb.id, "extend");
															}}
															disabled={sb.status !== "active"}
															title="Extend sandbox"
														>
															<RefreshCcwIcon
																className={`size-3 ${pendingAction?.id === sb.id && pendingAction.type === "extend" ? "animate-spin" : ""}`}
															/>
														</Button>
														<Button
															variant="outline"
															size="icon"
															className="size-6"
															onClick={() => {
																void onMockAction(sb.id, "delete");
															}}
															disabled={sb.status === "expired"}
															title="Delete sandbox"
														>
															{pendingAction?.id === sb.id &&
															pendingAction.type === "delete" ? (
																<RefreshCcwIcon className="size-3 animate-spin" />
															) : (
																<Trash2Icon className="size-3" />
															)}
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
				</>
			) : null}
		</div>
	);
}
