import {
	createFileRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import {
	Clock3Icon,
	CopyIcon,
	PlusIcon,
	TimerIcon,
	Trash2Icon,
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
import { useDeleteSandbox } from "#/hooks/use-delete-sandbox";
import { useExtendSandbox } from "#/hooks/use-extend-sandbox";
import { useSandboxes } from "#/hooks/use-sandboxes";
import { useTtlCountdown } from "#/hooks/use-ttl-countdown";
import { formatTtl } from "#/lib/format-ttl";

export const Route = createFileRoute("/_app/dashboard/sandboxes")({
	component: SandboxesLayout,
});

type SandboxStatus = "active" | "expiring" | "destroying";

// Engine emoji mapping for API data
const engineEmojiMap: Record<string, string> = {
	postgresql: "🐘",
	mysql: "🐬",
	mariadb: "🦭",
};

// Region display mapping
const regionDisplayMap: Record<string, string> = {
	id: "Indonesia (id)",
	sg: "Singapore (sg)",
	us: "United States (us)",
};

// Format engine for display
const formatEngine = (engine: string) => {
	const map: Record<string, string> = {
		postgresql: "PostgreSQL 16",
		mysql: "MySQL 8",
		mariadb: "MariaDB 11",
	};
	return map[engine] ?? engine;
};

// Format date for display
const formatDate = (dateString: string) => {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};


const sandboxes: {
	id: string;
	displayName: string;
	engine: string;
	engineEmoji: string;
	region: string;
	host: string;
	port: number;
	status: SandboxStatus;
	ttl: string;
	size: string;
	createdAt: string;
	connectionUrl: string;
}[] = [
	{
		id: "sb_a1b2x8",
		displayName: "migration-check",
		engine: "PostgreSQL 16",
		engineEmoji: "🐘",
		region: "Indonesia (id)",
		host: "id.pisangdb.com",
		port: 5432,
		status: "active",
		ttl: "5h 42m left",
		size: "22 MB",
		createdAt: "Today, 09:10",
		connectionUrl:
			"postgresql://sb_a1b2x8:***@id.pisangdb.com:5432/pisang_a1b2_migration_x8k2m9",
	},
	{
		id: "sb_c3d4y9",
		displayName: "bootcamp-prisma",
		engine: "MySQL 8",
		engineEmoji: "🐬",
		region: "Indonesia (id)",
		host: "id.pisangdb.com",
		port: 3306,
		status: "expiring",
		ttl: "24m left",
		size: "48 MB",
		createdAt: "Today, 05:48",
		connectionUrl:
			"mysql://sb_c3d4y9:***@id.pisangdb.com:3306/pisang_c3d4_bootcamp_z7j1n3",
	},
	{
		id: "sb_e5f6z1",
		displayName: "demo-review",
		engine: "MariaDB 11",
		engineEmoji: "🦭",
		region: "Indonesia (id)",
		host: "id.pisangdb.com",
		port: 3307,
		status: "destroying",
		ttl: "Destroying...",
		size: "15 MB",
		createdAt: "Yesterday, 21:32",
		connectionUrl:
			"mysql://sb_e5f6z1:***@id.pisangdb.com:3307/pisang_e5f6_demo_q2w3e4",
	},
];

const statusMap: Record<
	SandboxStatus,
	{ label: string; variant: "default" | "outline" | "secondary" }
> = {
	active: { label: "Active", variant: "default" },
	expiring: { label: "Expiring Soon", variant: "outline" },
	destroying: { label: "Destroying", variant: "secondary" },
};

function SandboxesLayout() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	if (pathname === "/dashboard/sandboxes") {
		return <SandboxesPage />;
	}

	return <Outlet />;
}

function SandboxesPage() {
	const { data, isLoading, error } = useSandboxes();
	const sandboxList = data?.sandboxes ?? [];
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [extendMenuId, setExtendMenuId] = useState<string | null>(null);
	const [extendedId, setExtendedId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const activeCount = sandboxList.filter(
		(item) => item.status === "active",
	).length;

	const handleCopy = async (id: string, value: string) => {
		if (typeof navigator === "undefined" || !navigator.clipboard) return;
		await navigator.clipboard.writeText(value);
		setCopiedId(id);
		setTimeout(() => {
			setCopiedId((current) => (current === id ? null : current));
		}, 1200);
	};

	const handleExtend = (id: string, duration: string) => {
		setExtendMenuId(null);
		setExtendedId(id);
		setTimeout(() => setExtendedId((cur) => (cur === id ? null : cur)), 2000);
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
					{sandboxList.length === 0 ? (
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
						sandboxList.map((sandbox) => {
							const status = statusMap[sandbox.status];
							return (
								<div key={sandbox.id} className="rounded-lg border p-3 sm:p-4">
									<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
										<div className="flex min-w-0 flex-1 items-start gap-3">
											<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
												{engineEmojiMap[sandbox.engine] ?? "🗄️"}
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
														variant={status.variant}
														className="text-[10px]"
													>
														{status.label}
													</Badge>
												</div>
												<p className="text-xs text-muted-foreground">
													{formatEngine(sandbox.engine)} · {regionDisplayMap[sandbox.region] ?? sandbox.region} · Created{" "}
													{formatDate(sandbox.createdAt)}
												</p>
												<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
													<Clock3Icon className="size-3.5" />
													<span>{formatTtl(sandbox.expiredAt)}</span>
													<span>•</span>
													<span>{sandbox.size}</span>
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
												title="Copy connection string"
											>
												<CopyIcon className="size-3.5" />
											</Button>
											<div className="relative">
												<Button
													variant="outline"
													size="icon"
													className="size-7"
													disabled={sandbox.status !== "active"}
													title="Extend sandbox"
													onClick={() =>
														setExtendMenuId((cur) =>
															cur === sandbox.id ? null : sandbox.id,
														)
													}
												>
													<TimerIcon className="size-3.5" />
												</Button>
												{extendMenuId === sandbox.id && (
													<div className="absolute right-0 top-8 z-10 flex flex-col gap-0.5 rounded-md border bg-background p-1 shadow-md">
														{["+1h", "+6h", "+12h", "+24h"].map((d) => (
															<button
																key={d}
																type="button"
																className="rounded px-3 py-1.5 text-left text-xs hover:bg-muted"
																onClick={() => handleExtend(sandbox.id, d)}
															>
																Extend {d}
															</button>
														))}
													</div>
												)}
												{extendedId === sandbox.id && (
													<p className="mt-1 text-[10px] text-muted-foreground">
														Extended ✓
													</p>
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
														onClick={() => setDeleteConfirmId(null)}
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
													disabled={sandbox.status === "destroying"}
													title="Delete sandbox"
													onClick={() => setDeleteConfirmId(sandbox.id)}
												>
													<Trash2Icon className="size-3.5" />
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
