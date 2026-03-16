import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	Clock3Icon,
	CopyIcon,
	PlusIcon,
	RefreshCcwIcon,
	TimerIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
	$deleteSandbox,
	$extendSandbox,
	$getSandboxes,
} from "#/modules/sandboxes/serverFn";

export const Route = createFileRoute("/_app/dashboard/sandboxes/")({
	loader: async () => {
		const sandboxes = await $getSandboxes();
		return { sandboxes };
	},
	pendingComponent: SandboxesSkeleton,
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
	id: "Indonesia (id)",
	sg: "Singapore (sg)",
	us: "United States (us)",
};

type DisplayStatus = "active" | "expiring" | "expired" | "destroying";

function getDisplayStatus(
	expiredAt: string,
	status: "active" | "destroying" | "expired",
): DisplayStatus {
	if (status !== "active") return status;
	const msLeft = new Date(expiredAt).getTime() - Date.now();
	if (msLeft <= 30 * 60 * 1000) return "expiring";
	return "active";
}

function formatTtl(expiredAt: string): string {
	const ms = new Date(expiredAt).getTime() - Date.now();
	if (ms <= 0) return "Expired";
	const h = Math.floor(ms / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	if (h > 24) return `${Math.floor(h / 24)}d left`;
	if (h > 0) return `${h}h ${m}m left`;
	return `${m}m left`;
}

const statusMap: Record<
	DisplayStatus,
	{
		label: string;
		variant: "default" | "outline" | "secondary" | "destructive";
	}
> = {
	active: { label: "Active", variant: "default" },
	expiring: { label: "Expiring Soon", variant: "outline" },
	destroying: { label: "Destroying", variant: "secondary" },
	expired: { label: "Expired", variant: "destructive" },
};

function SandboxesSkeleton() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-7 w-36" />
				<Skeleton className="h-8 w-28" />
			</div>
			<div className="grid gap-4 md:grid-cols-3">
				{["a", "b", "c"].map((k) => (
					<Skeleton key={k} className="h-20 w-full" />
				))}
			</div>
			<Skeleton className="h-64 w-full" />
		</div>
	);
}

function SandboxesPage() {
	const { sandboxes } = Route.useLoaderData();
	const router = useRouter();

	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [extendMenuId, setExtendMenuId] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<{
		id: string;
		type: "extend" | "delete";
	} | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const activeCount = sandboxes.filter((s) => s.status === "active").length;

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
		setPendingAction({ id, type: "extend" });
		try {
			await $extendSandbox({ data: { sandboxId: id, additionalHours } });
			toast.success(`Sandbox extended by ${additionalHours}h`);
			router.invalidate();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to extend sandbox",
			);
		} finally {
			setPendingAction(null);
		}
	};

	const handleDelete = async (id: string) => {
		setDeleteConfirmId(null);
		setPendingAction({ id, type: "delete" });
		try {
			await $deleteSandbox({ data: { sandboxId: id } });
			toast.success("Sandbox deleted");
			router.invalidate();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete sandbox",
			);
		} finally {
			setPendingAction(null);
		}
	};

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">Sandboxes</h1>
					<p className="text-sm text-muted-foreground">
						Manage your active databases and credentials.
					</p>
				</div>
				<Button asChild size="sm" className="gap-1.5">
					<Link to="/dashboard/sandboxes/new">
						<PlusIcon className="size-4" />
						New Sandbox
					</Link>
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Active usage</CardDescription>
						<CardTitle className="text-2xl">{activeCount}/5</CardTitle>
					</CardHeader>
					<CardContent className="text-xs text-muted-foreground">
						Free tier supports up to 5 active sandboxes.
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Region</CardDescription>
						<CardTitle className="text-2xl">🇮🇩 Indonesia</CardTitle>
					</CardHeader>
					<CardContent className="text-xs text-muted-foreground">
						Singapore and US are coming soon.
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Auto-cleanup</CardDescription>
						<CardTitle className="text-2xl">Every 30s</CardTitle>
					</CardHeader>
					<CardContent className="text-xs text-muted-foreground">
						Expired sandboxes are destroyed automatically.
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Your Sandboxes</CardTitle>
					<CardDescription>
						Credentials are masked by default. Copy for quick setup.
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
						sandboxes.map((sandbox) => {
							const displayStatus = getDisplayStatus(
								sandbox.expiredAt,
								sandbox.status,
							);
							const statusCfg = statusMap[displayStatus];
							const ttl = formatTtl(sandbox.expiredAt);
							const isPending = pendingAction?.id === sandbox.id;
							return (
								<div key={sandbox.id} className="rounded-lg border p-3 sm:p-4">
									<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
										<div className="flex min-w-0 flex-1 items-start gap-3">
											<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
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
													<Badge
														variant={statusCfg.variant}
														className="text-[10px]"
													>
														{statusCfg.label}
													</Badge>
												</div>
												<p className="text-xs text-muted-foreground">
													{ENGINE_LABEL[sandbox.engine] ?? sandbox.engine} ·{" "}
													{REGION_LABEL[sandbox.region] ?? sandbox.region} ·
													Created{" "}
													{new Date(sandbox.createdAt).toLocaleDateString()}
												</p>
												<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
													<Clock3Icon className="size-3.5" />
													<span>{ttl}</span>
													<span>•</span>
													<span>
														{sandbox.sizeMb} MB / {sandbox.maxSizeMb} MB
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
													void handleCopy(sandbox.id, sandbox.connectionUrl);
												}}
												disabled={isPending}
												title="Copy connection string"
											>
												<CopyIcon className="size-3.5" />
											</Button>
											<div className="relative">
												<Button
													variant="outline"
													size="icon"
													className="size-7"
													disabled={sandbox.status !== "active" || isPending}
													title="Extend sandbox"
													onClick={() =>
														setExtendMenuId((cur) =>
															cur === sandbox.id ? null : sandbox.id,
														)
													}
												>
													{isPending && pendingAction.type === "extend" ? (
														<RefreshCcwIcon className="size-3.5 animate-spin" />
													) : (
														<TimerIcon className="size-3.5" />
													)}
												</Button>
												{extendMenuId === sandbox.id && (
													<div className="absolute right-0 top-8 z-10 flex flex-col gap-0.5 rounded-md border bg-background p-1 shadow-md">
														{([1, 6, 12, 24] as const).map((h) => (
															<button
																key={h}
																type="button"
																className="rounded px-3 py-1.5 text-left text-xs hover:bg-muted"
																onClick={() => void handleExtend(sandbox.id, h)}
															>
																Extend +{h}h
															</button>
														))}
													</div>
												)}
											</div>
											{deleteConfirmId === sandbox.id ? (
												<div className="flex items-center gap-1.5">
													<span className="text-xs text-destructive">
														Delete?
													</span>
													<Button
														size="icon"
														variant="destructive"
														className="size-6"
														onClick={() => void handleDelete(sandbox.id)}
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
													className="size-7"
													disabled={
														sandbox.status === "destroying" || isPending
													}
													title="Delete sandbox"
													onClick={() => setDeleteConfirmId(sandbox.id)}
												>
													{isPending && pendingAction.type === "delete" ? (
														<RefreshCcwIcon className="size-3.5 animate-spin" />
													) : (
														<Trash2Icon className="size-3.5" />
													)}
												</Button>
											)}
										</div>
									</div>

									<div className="mt-3 rounded-md bg-muted p-2 text-xs font-mono text-muted-foreground">
										<p className="truncate">{sandbox.connectionUrl}</p>
										<p className="mt-1 truncate">
											Host {sandbox.host}:{sandbox.port}
										</p>
									</div>

									{copiedId === sandbox.id ? (
										<p className="mt-2 text-[11px] text-muted-foreground">
											Connection string copied.
										</p>
									) : null}
								</div>
							);
						})
					)}
				</CardContent>
			</Card>
		</div>
	);
}
