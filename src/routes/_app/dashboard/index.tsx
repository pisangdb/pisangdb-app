import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/")({
	component: DashboardHome,
});

import {
	ActivityIcon,
	BotIcon,
	CircleCheckIcon,
	DatabaseIcon,
	PlusIcon,
	RefreshCcwIcon,
	TerminalIcon,
	Trash2Icon,
	ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { TtlCountdown } from "#/components/ttl-countdown";
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
import {
	useDeleteSandbox,
	useExtendSandbox,
	useSandboxes,
} from "#/lib/hooks/useSandboxes";
import type { SandboxStatus } from "#/lib/types";
import { $getDashboardStats } from "#/modules/sandboxes/serverFn";

const MAX_ACTIVE_SANDBOXES = 5;

const ENGINE_EMOJI: Record<string, string> = {
	postgresql: "🐘",
	mysql: "🐬",
	mariadb: "🦭",
};

const ENGINE_LABEL: Record<string, string> = {
	postgresql: "PostgreSQL 16",
	mysql: "MySQL 8",
	mariadb: "MariaDB 11",
};

const REGION_LABEL: Record<string, string> = {
	id: "🇮🇩 Indonesia",
	sg: "🇸🇬 Singapore",
	us: "🇺🇸 US",
	eu: "🇪🇺 EU",
};

type LocalStatus = "active" | "expiring" | "expired" | "destroying";

const statusConfig: Record<
	LocalStatus,
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
	destroying: {
		label: "Destroying",
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

function computeLocalStatus(
	status: SandboxStatus,
	expiredAt: string,
): LocalStatus {
	if (status === "expired" || status === "destroying") {
		return status;
	}
	const msLeft = new Date(expiredAt).getTime() - Date.now();
	if (msLeft < 30 * 60 * 1000) {
		return "expiring";
	}
	return "active";
}

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
	const router = useRouter();
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const { data: stats, isPending: statsPending } = useQuery({
		queryKey: ["dashboard-stats"],
		queryFn: () => $getDashboardStats(),
	});

	const { data: sandboxes = [], isPending: sandboxesPending } = useSandboxes();
	const extendSandbox = useExtendSandbox();
	const deleteSandbox = useDeleteSandbox();

	const isLoading = statsPending || sandboxesPending;

	const onCopyConnection = async (id: string, connectionUrl: string) => {
		if (typeof navigator === "undefined" || !navigator.clipboard) {
			return;
		}

		await navigator.clipboard.writeText(connectionUrl);
		setCopiedId(id);
		setTimeout(() => {
			setCopiedId((current) => (current === id ? null : current));
		}, 1200);
	};

	const handleExtend = async (id: string) => {
		await extendSandbox.mutateAsync({
			sandboxId: id,
			additionalHours: 1,
		});
		void router.invalidate();
	};

	const handleDelete = async (id: string) => {
		setDeleteConfirmId(null);
		await deleteSandbox.mutateAsync(id);
		void router.invalidate();
	};

	const statsData = [
		{
			label: "Active Sandboxes",
			value: String(stats?.activeSandboxes ?? 0),
			sub: `of ${MAX_ACTIVE_SANDBOXES} max`,
			icon: <DatabaseIcon className="size-4" />,
			accent: "text-primary",
			bg: "bg-primary/10",
		},
		{
			label: "Total Created",
			value: String(stats?.totalCreated ?? 0),
			sub: "all time",
			icon: <ActivityIcon className="size-4" />,
			accent: "text-muted-foreground",
			bg: "bg-muted",
		},
		{
			label: "Auto-cleaned",
			value: String(stats?.autoCleaned ?? 0),
			sub: "zero effort",
			icon: <CircleCheckIcon className="size-4" />,
			accent: "text-muted-foreground",
			bg: "bg-muted",
		},
		{
			label: "AI Queries",
			value: String(stats?.aiQueriesThisMonth ?? 0),
			sub: "this month",
			icon: <BotIcon className="size-4" />,
			accent: "text-muted-foreground",
			bg: "bg-muted",
		},
	];

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

			{isLoading ? <DashboardSkeleton /> : null}

			{!isLoading && stats == null ? (
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
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => {
								void router.invalidate();
							}}
						>
							<RefreshCcwIcon className="size-4" />
							Retry
						</Button>
					</CardContent>
				</Card>
			) : null}

			{!isLoading && stats != null ? (
				<>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{statsData.map((stat) => (
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
								{sandboxes.length === 0 ? (
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
									sandboxes.map((sb) => {
										const localStatus = computeLocalStatus(
											sb.status,
											sb.expiredAt,
										);
										const status = statusConfig[localStatus];
										const createdAgo = formatTimeAgo(new Date(sb.createdAt));
										const isPending =
											extendSandbox.isPending || deleteSandbox.isPending;
										return (
											<div
												key={sb.id}
												className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40 ${
													localStatus === "expired" ||
													localStatus === "destroying"
														? "opacity-50 grayscale"
														: localStatus === "expiring"
															? "opacity-70"
															: ""
												}`}
											>
												<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
													{ENGINE_EMOJI[sb.engine] ?? "🗄️"}
												</div>

												<div className="min-w-0 flex-1">
													<Link
														to="/dashboard/sandboxes/$id"
														params={{ id: sb.id }}
														className="truncate font-mono text-sm font-medium hover:underline"
													>
														{sb.displayName}
													</Link>
													<div className="flex items-center gap-2 text-xs text-muted-foreground">
														<span>{ENGINE_LABEL[sb.engine]}</span>
														<span>·</span>
														<span>{REGION_LABEL[sb.region]}</span>
														<span>·</span>
														<span>Created {createdAgo}</span>
													</div>
												</div>

												<div className="flex shrink-0 flex-col items-end gap-1">
													<Badge
														variant={status.variant}
														className="px-1.5 py-0 text-[10px]"
													>
														{status.label}
													</Badge>
													<TtlCountdown
														expiredAt={sb.expiredAt}
														status={sb.status}
													/>
													<div className="mt-1 flex items-center gap-1">
														<Button
															variant="outline"
															size="icon"
															className="size-6"
															onClick={() => {
																void onCopyConnection(sb.id, sb.connectionUrl);
															}}
															disabled={isPending}
															aria-label="Copy connection URL"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2"
																strokeLinecap="round"
																strokeLinejoin="round"
																className="size-3"
															>
																<title>Copy</title>
																<rect
																	width="14"
																	height="14"
																	x="8"
																	y="8"
																	rx="2"
																	ry="2"
																/>
																<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
															</svg>
														</Button>
														<Button
															variant="outline"
															size="icon"
															className="size-6"
															onClick={() => {
																void handleExtend(sb.id);
															}}
															disabled={
																isPending ||
																localStatus === "expired" ||
																localStatus === "destroying"
															}
															title="Extend sandbox (+1h)"
														>
															<RefreshCcwIcon
																className={`size-3 ${extendSandbox.isPending ? "animate-spin" : ""}`}
															/>
														</Button>
														{deleteConfirmId === sb.id ? (
															<div className="flex items-center gap-1.5">
																<span className="text-xs text-destructive">
																	Delete?
																</span>
																<Button
																	size="icon"
																	variant="destructive"
																	className="size-6"
																	onClick={() => void handleDelete(sb.id)}
																	title="Confirm delete"
																>
																	<Trash2Icon className="size-3" />
																</Button>
																<Button
																	size="icon"
																	variant="outline"
																	className="size-6"
																	onClick={() => setDeleteConfirmId(null)}
																>
																	✕
																</Button>
															</div>
														) : (
															<Button
																variant="outline"
																size="icon"
																className="size-6"
																onClick={() => setDeleteConfirmId(sb.id)}
																disabled={
																	isPending || localStatus === "expired"
																}
																title="Delete sandbox"
															>
																{deleteSandbox.isPending ? (
																	<RefreshCcwIcon className="size-3 animate-spin" />
																) : (
																	<Trash2Icon className="size-3" />
																)}
															</Button>
														)}
													</div>
													{copiedId === sb.id ? (
														<p className="text-[10px] text-muted-foreground">
															Copied
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

function formatTimeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}
