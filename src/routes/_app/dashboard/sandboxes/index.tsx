import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	CopyIcon,
	DatabaseIcon,
	PlusIcon,
	RefreshCcwIcon,
	TimerIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "#/components/confirmation-dialog";
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
import { ScrollArea } from "#/components/ui/scroll-area";
import { Skeleton } from "#/components/ui/skeleton";
import {
	useDeleteSandbox,
	useExtendSandbox,
	useSandboxes,
	useSandboxStorageOverview,
} from "#/lib/hooks/useSandboxes";
import { computeSandboxUiStatus } from "#/lib/types";

export const Route = createFileRoute("/_app/dashboard/sandboxes/")({
	component: SandboxesPage,
});

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
	id: "Indonesia",
	sg: "Singapore",
	us: "United States",
};

function formatStorageMb(value: number): string {
	if (value <= 0) return "0 MB";
	if (value < 1) return `${Math.max(1, Math.round(value * 1024))} KB`;
	if (value < 10) return `${value.toFixed(2)} MB`;
	if (value < 100) return `${value.toFixed(1)} MB`;
	return `${Math.round(value)} MB`;
}

function formatUsagePct(usedMb: number, maxMb: number): string {
	if (maxMb <= 0) return "0%";
	const rawPct = (usedMb / maxMb) * 100;
	if (rawPct <= 0) return "0%";
	if (rawPct < 1) return "<1%";
	if (rawPct < 10) return `${rawPct.toFixed(1)}%`;
	return `${Math.round(rawPct)}%`;
}

function maskCredentials(url: string): string {
	return url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

type DisplayStatus = "active" | "expiring" | "expired" | "destroying";

const statusMap: Record<
	DisplayStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive";
	}
> = {
	active: { label: "🟢 Active", variant: "default" },
	expiring: { label: "🟡 Expiring Soon", variant: "secondary" },
	destroying: { label: "🔴 Destroying", variant: "destructive" },
	expired: { label: "🔴 Expired", variant: "destructive" },
};

function SandboxesPage() {
	const { data: sandboxes = [], isPending } = useSandboxes();
	const { data: storageOverview } = useSandboxStorageOverview();
	const deleteSandbox = useDeleteSandbox();
	const extendSandbox = useExtendSandbox();

	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [extendMenuId, setExtendMenuId] = useState<string | null>(null);
	const [actionPending, setActionPending] = useState<{
		id: string;
		type: "extend" | "delete";
	} | null>(null);
	const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

	const activeCount = sandboxes.filter((s) => s.status === "active").length;
	const expiringCount = sandboxes.filter(
		(s) => computeSandboxUiStatus(s.status, s.expiredAt) === "expiring",
	).length;
	const uniqueRegions = Array.from(
		new Set(sandboxes.map((sandbox) => sandbox.region)),
	).map((region) => REGION_LABEL[region] ?? region);
	const totalStorageLimit = sandboxes.reduce(
		(total, sandbox) => total + sandbox.maxSizeMb,
		0,
	);
	const totalStorageUsed =
		storageOverview?.totalStorageUsedMb ??
		sandboxes.reduce((total, sandbox) => total + sandbox.sizeMb, 0);
	const displayedStorageLimit =
		storageOverview?.totalStorageLimitMb ?? totalStorageLimit;
	const usagePct =
		storageOverview?.usagePct ??
		(totalStorageLimit > 0
			? Math.round((totalStorageUsed / totalStorageLimit) * 100)
			: 0);
	const usageLabel = formatUsagePct(totalStorageUsed, displayedStorageLimit);
	const hasMeasuredStorage =
		(storageOverview?.measuredCount ?? 0) > 0 ||
		sandboxes.some((sandbox) => sandbox.sizeMb > 0);

	const handleCopy = async (id: string, value: string) => {
		if (typeof navigator === "undefined" || !navigator.clipboard) return;
		await navigator.clipboard.writeText(value);
		setCopiedId(id);
		setTimeout(() => {
			setCopiedId((cur) => (cur === id ? null : cur));
		}, 1200);
	};

	const handleExtend = async (id: string, additionalHours: 1 | 6 | 12 | 24) => {
		setExtendMenuId(null);
		setActionPending({ id, type: "extend" });
		try {
			await extendSandbox.mutateAsync({ sandboxId: id, additionalHours });
		} catch {
			// error toast is handled by the hook
		} finally {
			setActionPending(null);
		}
	};

	const handleDelete = async (id: string) => {
		setDeleteDialogId(null);
		setActionPending({ id, type: "delete" });
		try {
			await deleteSandbox.mutateAsync(id);
		} catch {
			// error toast is handled by the hook
		} finally {
			setActionPending(null);
		}
	};

	if (isPending) {
		return (
			<div className="flex flex-col gap-4 p-4 md:p-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Skeleton className="h-7 w-36" />
					<Skeleton className="h-8 w-28" />
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-4 md:p-5">
			<div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/60 p-5 md:p-6">
				<div className="flex flex-col gap-5">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="max-w-2xl">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Sandbox Workspace</Badge>
								<Badge variant="secondary">
									{uniqueRegions.length > 0
										? uniqueRegions.join(", ")
										: "No region yet"}
								</Badge>
							</div>
							<h1
								aria-level={1}
								className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl"
							>
								Operate every sandbox from one workspace
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Track TTL, inspect live storage, copy credentials, extend
								lifetime, and clean up older databases without leaving the
								sandbox workspace.
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
								<Link to="/dashboard/help">
									<DatabaseIcon className="size-4" />
									Usage Guide
								</Link>
							</Button>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-3">
						<div className="rounded-xl border bg-background/80 p-3 shadow-sm">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<ActivityIcon className="size-4" />
								<span>Active Usage</span>
							</div>
							<p className="mt-2 text-sm font-semibold text-foreground">
								{activeCount}/5 sandboxes
							</p>
						</div>
						<div className="rounded-xl border bg-background/80 p-3 shadow-sm">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<TimerIcon className="size-4" />
								<span>Expiring Soon</span>
							</div>
							<p className="mt-2 text-sm font-semibold text-foreground">
								{expiringCount} sandbox{expiringCount === 1 ? "" : "es"}
							</p>
						</div>
						<div className="rounded-xl border bg-background/80 p-3 shadow-sm">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<DatabaseIcon className="size-4" />
								<span>Total Storage</span>
							</div>
							<p className="mt-2 text-sm font-semibold text-foreground">
								{hasMeasuredStorage
									? `${formatStorageMb(totalStorageUsed)} / ${formatStorageMb(
											displayedStorageLimit,
										)}`
									: `${formatStorageMb(displayedStorageLimit)} allocated`}
							</p>
						</div>
					</div>

					<div className="rounded-xl border bg-background/70 p-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">Storage Overview</p>
								<p className="text-xs text-muted-foreground">
									{hasMeasuredStorage
										? "Combined storage across listed sandboxes, measured from the live databases. Expired sandboxes are cleaned automatically and removed from this view."
										: "Sandbox list view does not fetch live database size. Open a sandbox detail page to see measured storage usage."}
								</p>
							</div>
							<Badge variant="outline" className="w-fit">
								{hasMeasuredStorage
									? `${usageLabel} used`
									: "Live size in detail view"}
							</Badge>
						</div>
						<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all"
								style={{
									width: `${Math.min(100, hasMeasuredStorage ? usagePct : 0)}%`,
								}}
							/>
						</div>
					</div>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Your Sandboxes</CardTitle>
					<CardDescription>
						Credentials are masked by default. Reopen any sandbox to inspect,
						query, or copy access details.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{sandboxes.length === 0 ? (
						<div className="flex flex-col items-center gap-3 py-10 text-center">
							<div className="flex size-14 items-center justify-center rounded-xl border bg-muted/30 text-3xl">
								🍌
							</div>
							<div>
								<p className="font-medium">No sandboxes yet</p>
								<p className="mt-0.5 text-sm text-muted-foreground">
									Create your first sandbox to get a connection string in
									seconds.
								</p>
							</div>
							<Button asChild size="sm" className="mt-1 gap-1.5">
								<Link to="/dashboard/sandboxes/new">
									<PlusIcon className="size-4" />
									Create sandbox
								</Link>
							</Button>
						</div>
					) : (
						<ScrollArea className="h-[480px] w-full overflow-hidden">
							<div className="flex flex-col gap-3 pr-3">
								{sandboxes.map((sandbox) => {
									const uiStatus = computeSandboxUiStatus(
										sandbox.status,
										sandbox.expiredAt,
									);
									const statusCfg = statusMap[uiStatus];
									const isRowPending = actionPending?.id === sandbox.id;
									return (
										<div
											key={sandbox.id}
											className="rounded-xl border bg-background p-3 shadow-sm transition-colors hover:bg-muted/20 sm:p-4"
										>
											<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
												<div className="flex min-w-0 flex-1 items-start gap-3">
													<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
														{ENGINE_EMOJI[sandbox.engine] ?? "🗄️"}
													</div>
													<div className="min-w-0">
														<div className="flex items-center gap-2">
															<Link
																to="/dashboard/sandboxes/$id"
																params={{ id: sandbox.id }}
																className="text-sm font-medium hover:underline"
															>
																{sandbox.displayName}
															</Link>
															{uiStatus === "destroying" ? (
																<RefreshCcwIcon className="size-3.5 animate-spin text-muted-foreground" />
															) : (
																<Badge
																	variant={statusCfg.variant}
																	className="text-[10px]"
																>
																	{statusCfg.label}
																</Badge>
															)}
														</div>
														<p className="text-xs text-muted-foreground">
															{ENGINE_LABEL[sandbox.engine] ?? sandbox.engine} ·{" "}
															{REGION_LABEL[sandbox.region] ?? sandbox.region} ·{" "}
															Created{" "}
															{new Date(sandbox.createdAt).toLocaleDateString()}
														</p>
														<div className="mt-1 flex items-center gap-2">
															<TtlCountdown
																expiredAt={sandbox.expiredAt}
																status={sandbox.status}
															/>
															<span className="text-xs text-muted-foreground">
																• {formatStorageMb(sandbox.sizeMb)} /{" "}
																{formatStorageMb(sandbox.maxSizeMb)}
															</span>
														</div>
													</div>
												</div>

												<div className="flex items-center gap-1 self-end lg:self-center">
													<Button
														variant="outline"
														size="icon"
														className="size-7"
														onClick={() => {
															void handleCopy(
																sandbox.id,
																sandbox.connectionUrl,
															);
														}}
														disabled={
															sandbox.status === "destroying" || isRowPending
														}
														title="Copy connection string"
													>
														<CopyIcon className="size-3.5" />
													</Button>
													<div className="relative">
														<Button
															variant="outline"
															size="icon"
															className="size-7"
															disabled={
																sandbox.status !== "active" || isRowPending
															}
															title="Extend sandbox"
															onClick={() =>
																setExtendMenuId((cur) =>
																	cur === sandbox.id ? null : sandbox.id,
																)
															}
														>
															{isRowPending &&
															actionPending?.type === "extend" ? (
																<RefreshCcwIcon className="size-3.5 animate-spin" />
															) : (
																<TimerIcon className="size-3.5" />
															)}
														</Button>
														{extendMenuId === sandbox.id && (
															<div className="absolute right-0 top-8 z-10 flex flex-col gap-0.5 rounded-xl border bg-background p-1.5 shadow-md">
																{([1, 6, 12, 24] as const).map((h) => (
																	<button
																		key={h}
																		type="button"
																		className="rounded-lg px-3 py-1.5 text-left text-xs hover:bg-muted"
																		onClick={() =>
																			void handleExtend(sandbox.id, h)
																		}
																	>
																		Extend +{h}h
																	</button>
																))}
															</div>
														)}
													</div>
													<Button
														variant="outline"
														size="icon"
														className="size-7"
														disabled={
															sandbox.status === "destroying" || isRowPending
														}
														title="Delete sandbox"
														onClick={() => setDeleteDialogId(sandbox.id)}
													>
														{isRowPending &&
														actionPending?.type === "delete" ? (
															<RefreshCcwIcon className="size-3.5 animate-spin" />
														) : (
															<Trash2Icon className="size-3.5" />
														)}
													</Button>
												</div>
											</div>

											<div className="mt-3 rounded-xl bg-muted p-2.5 text-xs font-mono text-muted-foreground">
												<p className="truncate" title={sandbox.connectionUrl}>
													{maskCredentials(sandbox.connectionUrl)}
												</p>
											</div>

											{copiedId === sandbox.id ? (
												<p className="mt-2 text-[11px] text-muted-foreground">
													Connection string copied.
												</p>
											) : null}
										</div>
									);
								})}
							</div>
						</ScrollArea>
					)}
				</CardContent>
			</Card>

			<ConfirmationDialog
				open={deleteDialogId !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteDialogId(null);
				}}
				title="Delete sandbox?"
				description="This will permanently deprovision the selected database and remove its access credentials."
				confirmText="Delete Sandbox"
				onConfirm={() => {
					if (deleteDialogId) {
						void handleDelete(deleteDialogId);
					}
				}}
				isLoading={actionPending?.type === "delete"}
			/>
		</div>
	);
}
