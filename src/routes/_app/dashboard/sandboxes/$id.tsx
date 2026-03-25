import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import {
	ActivityIcon,
	ArrowLeftIcon,
	BotIcon,
	ClockIcon,
	CopyIcon,
	DatabaseIcon,
	EyeIcon,
	EyeOffIcon,
	HardDriveIcon,
	KeyRoundIcon,
	PlayIcon,
	RefreshCcwIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TableIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "#/components/confirmation-dialog";
import { SqlEditor } from "#/components/sql-editor";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { useDeleteSandbox, useExtendSandbox } from "#/lib/hooks/useSandboxes";
import { useWorkspaceStats } from "#/lib/hooks/useUserSettings";
import type {
	AiGenerateResult,
	AiLogItem,
	QueryHistoryItem,
	QueryResult,
	SandboxDetail,
	SandboxTable,
} from "#/lib/types";
import {
	$aiExecute,
	$aiGenerate,
	$executeQuery,
	$getAiLogs,
	$getQueryHistory,
} from "#/modules/console/serverFn";
import {
	$getSandboxById,
	$getSandboxTables,
} from "#/modules/sandboxes/serverFn";

export const Route = createFileRoute("/_app/dashboard/sandboxes/$id")({
	loader: async ({ params }) => {
		const sandbox = await $getSandboxById({ data: { sandboxId: params.id } });
		const tables = await $getSandboxTables({ data: { sandboxId: params.id } });

		let history: QueryHistoryItem[] = [];
		try {
			history = await $getQueryHistory({ data: { sandboxId: params.id } });
		} catch {
			history = [];
		}

		let aiLogs: AiLogItem[] = [];
		try {
			aiLogs = await $getAiLogs({ data: { sandboxId: params.id } });
		} catch {
			aiLogs = [];
		}

		return { sandbox, tables, history, aiLogs };
	},
	head: () => ({ meta: [{ title: "Sandbox Detail — PisangDB" }] }),
	component: SandboxDetailPage,
});

const ENGINE_EMOJI: Record<string, string> = {
	postgresql: "🐘",
	mysql: "🐬",
	mariadb: "🦭",
};

const ENGINE_LABELS: Record<string, string> = {
	postgresql: "PostgreSQL",
	mysql: "MySQL",
	mariadb: "MariaDB",
};

const REGION_LABELS: Record<string, string> = {
	id: "🇮🇩 Indonesia",
	sg: "🇸🇬 Singapore",
	us: "🇺🇸 US",
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

type Tab = "info" | "console" | "ai" | "tables" | "history";

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
	{ key: "info", label: "Info", icon: <DatabaseIcon className="size-3.5" /> },
	{
		key: "console",
		label: "SQL Console",
		icon: <PlayIcon className="size-3.5" />,
	},
	{ key: "ai", label: "AI Seeder", icon: <BotIcon className="size-3.5" /> },
	{
		key: "tables",
		label: "Tables",
		icon: <TableIcon className="size-3.5" />,
	},
	{
		key: "history",
		label: "History",
		icon: <ClockIcon className="size-3.5" />,
	},
];

function formatTtl(expiredAt: string): string {
	const diff = new Date(expiredAt).getTime() - Date.now();
	if (diff <= 0) return "Expired";
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
	if (hours > 24) {
		const days = Math.floor(hours / 24);
		return `${days}d ${hours % 24}h left`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m left`;
	}
	return `${minutes}m left`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("id-ID", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function SandboxDetailPage() {
	const {
		sandbox,
		tables: initialTables,
		history: initialHistory,
		aiLogs: initialAiLogs,
	} = Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const queryClient = useQueryClient();
	const extendSandbox = useExtendSandbox();
	const deleteSandbox = useDeleteSandbox();
	const [activeTab, setActiveTab] = useState<Tab>("info");
	const [extendOpen, setExtendOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [tables, setTables] = useState(initialTables);
	const [consoleQuery, setConsoleQuery] = useState("SELECT 1 as test;");
	const [consoleResult, setConsoleResult] = useState<QueryResult | null>(null);
	const [consoleError, setConsoleError] = useState<string | null>(null);
	const [aiPrompt, setAiPrompt] = useState("");
	const [aiGenerated, setAiGenerated] = useState<AiGenerateResult | null>(null);
	const [aiGeneratedSql, setAiGeneratedSql] = useState("");
	const [aiError, setAiError] = useState<string | null>(null);
	const [aiExecuted, setAiExecuted] = useState(false);

	const { data: history = [] } = useQuery({
		queryKey: ["sandbox-query-history", sandbox.id],
		queryFn: async () => {
			return await $getQueryHistory({ data: { sandboxId: sandbox.id } });
		},
		initialData: initialHistory,
		refetchInterval: 5000,
		refetchIntervalInBackground: false,
	});
	const { data: aiLogs = [] } = useQuery({
		queryKey: ["sandbox-ai-logs", sandbox.id],
		queryFn: async () => {
			return await $getAiLogs({ data: { sandboxId: sandbox.id } });
		},
		initialData: initialAiLogs,
		refetchInterval: 5000,
		refetchIntervalInBackground: false,
	});

	const refreshHistory = async () => {
		await queryClient.invalidateQueries({
			queryKey: ["sandbox-query-history", sandbox.id],
		});
	};

	const ttl = formatTtl(sandbox.expiredAt);
	const usagePct = Math.min(
		100,
		Math.round((sandbox.sizeMb / Math.max(sandbox.maxSizeMb, 1)) * 100),
	);
	const usageLabel = formatUsagePct(sandbox.sizeMb, sandbox.maxSizeMb);
	const totalQueries = history.length;
	const totalAiRuns = aiLogs.length;
	const summaryStats = [
		{
			label: "TTL",
			value: ttl,
			icon: <ClockIcon className="size-4" />,
		},
		{
			label: "Storage",
			value: `${formatStorageMb(sandbox.sizeMb)}/${formatStorageMb(
				sandbox.maxSizeMb,
			)}`,
			icon: <HardDriveIcon className="size-4" />,
		},
		{
			label: "Tables",
			value: String(tables.length),
			icon: <TableIcon className="size-4" />,
		},
		{
			label: "Query History",
			value: String(totalQueries),
			icon: <ActivityIcon className="size-4" />,
		},
		{
			label: "AI Runs",
			value: String(totalAiRuns),
			icon: <BotIcon className="size-4" />,
		},
	];

	const handleExtend = async (duration: 1 | 6 | 12 | 24) => {
		setExtendOpen(false);
		try {
			await extendSandbox.mutateAsync({
				sandboxId: sandbox.id,
				additionalHours: duration,
			});
			await router.invalidate();
		} catch {
			// error toast handled by hook
		}
	};

	const handleDelete = async () => {
		setDeleteDialogOpen(false);
		try {
			await deleteSandbox.mutateAsync(sandbox.id);
			await router.invalidate();
			await navigate({ to: "/dashboard/sandboxes" });
		} catch {
			// error toast handled by hook
		}
	};

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/60 p-5 md:p-6">
				<div className="flex flex-col gap-5">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex items-start gap-3">
							<Button
								asChild
								variant="outline"
								size="icon"
								className="mt-0.5 size-8 shrink-0 bg-background/80"
							>
								<Link to="/dashboard/sandboxes">
									<ArrowLeftIcon className="size-4" />
								</Link>
							</Button>
							<div className="space-y-3">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="outline" className="gap-1 px-2 py-0.5">
										<span>{ENGINE_EMOJI[sandbox.engine]}</span>
										{ENGINE_LABELS[sandbox.engine]}
									</Badge>
									<Badge
										variant={
											sandbox.status === "active"
												? "default"
												: sandbox.status === "destroying"
													? "destructive"
													: "secondary"
										}
										className="px-2 py-0.5 text-[10px]"
									>
										{sandbox.status}
									</Badge>
									<Badge
										variant="secondary"
										className="px-2 py-0.5 text-[10px]"
									>
										{REGION_LABELS[sandbox.region] ?? sandbox.region}
									</Badge>
								</div>
								<div>
									<h1 className="text-2xl font-semibold tracking-tight">
										{sandbox.displayName}
									</h1>
									<p className="mt-1 text-sm text-muted-foreground">
										Production-like access for{" "}
										<span className="font-mono text-foreground">
											{sandbox.dbName}
										</span>
										, with instant credentials, in-browser SQL, and AI-assisted
										seeding.
									</p>
								</div>
							</div>
						</div>
						<div className="flex flex-wrap gap-2 lg:justify-end">
							<div className="relative">
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5 bg-background/80"
									onClick={() => setExtendOpen((v) => !v)}
									disabled={sandbox.status !== "active"}
								>
									<RefreshCcwIcon className="size-3.5" />
									Extend TTL
								</Button>
								{extendOpen && (
									<div className="absolute right-0 top-10 z-10 min-w-36 rounded-xl border bg-background p-1.5 shadow-lg">
										<p className="px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
											Add Time
										</p>
										<div className="flex flex-col gap-0.5">
											{[1, 6, 12, 24].map((d) => (
												<button
													key={d}
													type="button"
													className="rounded-lg px-3 py-2 text-left text-xs hover:bg-muted"
													onClick={() => handleExtend(d as 1 | 6 | 12 | 24)}
												>
													+{d}h
												</button>
											))}
										</div>
									</div>
								)}
							</div>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5 bg-background/80 text-destructive hover:text-destructive"
								onClick={() => setDeleteDialogOpen(true)}
							>
								<Trash2Icon className="size-3.5" />
								Delete Sandbox
							</Button>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
						{summaryStats.map((stat) => (
							<div
								key={stat.label}
								className="rounded-xl border bg-background/80 p-3 shadow-sm"
							>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									{stat.icon}
									<span>{stat.label}</span>
								</div>
								<p className="mt-2 text-sm font-semibold text-foreground">
									{stat.value}
								</p>
							</div>
						))}
					</div>

					<div className="rounded-xl border bg-background/70 p-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">Sandbox Health</p>
								<p className="text-xs text-muted-foreground">
									{usageLabel} storage used.{" "}
									{formatStorageMb(sandbox.maxSizeMb - sandbox.sizeMb)}{" "}
									remaining before the free-tier cap.
								</p>
							</div>
							<Badge variant="outline" className="w-fit">
								{totalQueries} queries logged
							</Badge>
						</div>
						<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all"
								style={{ width: `${usagePct}%` }}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setActiveTab(tab.key)}
						className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
							activeTab === tab.key
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{tab.icon}
						{tab.label}
					</button>
				))}
			</div>

			{activeTab === "info" && <InfoTab sandbox={sandbox} />}
			{activeTab === "console" && (
				<ConsoleTab
					sandbox={sandbox}
					refreshHistory={refreshHistory}
					setTables={setTables}
					query={consoleQuery}
					setQuery={setConsoleQuery}
					queryResult={consoleResult}
					setQueryResult={setConsoleResult}
					queryError={consoleError}
					setQueryError={setConsoleError}
				/>
			)}
			{activeTab === "ai" && (
				<AiTab
					sandbox={sandbox}
					prompt={aiPrompt}
					setPrompt={setAiPrompt}
					generated={aiGenerated}
					setGenerated={setAiGenerated}
					generatedSql={aiGeneratedSql}
					setGeneratedSql={setAiGeneratedSql}
					error={aiError}
					setError={setAiError}
					executed={aiExecuted}
					setExecuted={setAiExecuted}
				/>
			)}
			{activeTab === "tables" && (
				<TablesTab tables={tables} dbName={sandbox.dbName} />
			)}
			{activeTab === "history" && <HistoryTab history={history} />}

			<ConfirmationDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				title="Delete sandbox?"
				description="This will permanently deprovision the database and remove its access credentials."
				confirmText="Delete Sandbox"
				onConfirm={handleDelete}
				isLoading={deleteSandbox.isPending}
			/>
		</div>
	);
}

function InfoTab({ sandbox }: { sandbox: SandboxDetail }) {
	const [showPassword, setShowPassword] = useState(false);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const handleCopy = async (key: string, value: string) => {
		if (typeof navigator === "undefined" || !navigator.clipboard) return;
		await navigator.clipboard.writeText(value);
		setCopiedKey(key);
		setTimeout(() => {
			setCopiedKey((cur) => (cur === key ? null : cur));
		}, 1200);
	};

	const sizePct = Math.round((sandbox.sizeMb / sandbox.maxSizeMb) * 100);
	const usageLabel = formatUsagePct(sandbox.sizeMb, sandbox.maxSizeMb);

	const credRows = [
		{ label: "Host", value: sandbox.host, key: "host" },
		{ label: "Port", value: String(sandbox.port), key: "port" },
		{ label: "Database", value: sandbox.dbName, key: "db" },
		{ label: "Username", value: sandbox.dbUser, key: "user" },
	];

	const metaRows = [
		{ label: "Created", value: formatDate(sandbox.createdAt) },
		{ label: "Expires", value: formatDate(sandbox.expiredAt) },
		{ label: "Host", value: sandbox.host },
		{ label: "Port", value: String(sandbox.port) },
	];

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Connection Kit</CardTitle>
					<CardDescription>
						Everything you need to connect locally in one place.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-muted p-4">
						<div className="flex items-start gap-3">
							<div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
								<KeyRoundIcon className="size-5" />
							</div>
							<div className="space-y-1">
								<p className="font-medium text-foreground">
									Ready-to-use credentials
								</p>
								<p className="text-xs text-muted-foreground">
									Copy the connection string or use the `.env` snippet for a
									quick project setup.
								</p>
							</div>
						</div>
					</div>

					{credRows.map((row) => (
						<div
							key={row.key}
							className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
						>
							<span className="text-muted-foreground">{row.label}</span>
							<div className="flex items-center gap-2">
								<span className="font-mono text-xs">{row.value}</span>
								<button
									type="button"
									onClick={() => void handleCopy(row.key, row.value)}
									className="text-muted-foreground hover:text-foreground"
									title="Copy"
								>
									<CopyIcon className="size-3.5" />
								</button>
								{copiedKey === row.key && (
									<span className="text-[10px] text-muted-foreground">
										Copied
									</span>
								)}
							</div>
						</div>
					))}

					<div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
						<span className="text-muted-foreground">Password</span>
						<div className="flex items-center gap-2">
							<span className="font-mono text-xs">
								{showPassword ? sandbox.dbPassword : "••••••••••••"}
							</span>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								className="text-muted-foreground hover:text-foreground"
								title={showPassword ? "Hide" : "Reveal"}
							>
								{showPassword ? (
									<EyeOffIcon className="size-3.5" />
								) : (
									<EyeIcon className="size-3.5" />
								)}
							</button>
							<button
								type="button"
								onClick={() => void handleCopy("pass", sandbox.dbPassword)}
								className="text-muted-foreground hover:text-foreground"
								title="Copy"
							>
								<CopyIcon className="size-3.5" />
							</button>
							{copiedKey === "pass" && (
								<span className="text-[10px] text-muted-foreground">
									Copied
								</span>
							)}
						</div>
					</div>

					<div className="space-y-2 rounded-xl border p-3">
						<p className="text-xs font-medium text-muted-foreground">
							Connection String
						</p>
						<p className="break-all font-mono text-xs">
							{sandbox.connectionUrl}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => void handleCopy("conn", sandbox.connectionUrl)}
						>
							<CopyIcon className="size-3.5" />
							{copiedKey === "conn" ? "Copied!" : "Copy connection string"}
						</Button>
					</div>

					<div className="space-y-2 rounded-xl bg-muted p-3">
						<p className="text-xs font-medium">.env snippet</p>
						<p className="break-all font-mono text-xs text-muted-foreground">
							DATABASE_URL={sandbox.connectionUrl}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() =>
								void handleCopy("env", `DATABASE_URL=${sandbox.connectionUrl}`)
							}
						>
							<CopyIcon className="size-3.5" />
							{copiedKey === "env" ? "Copied!" : "Copy .env"}
						</Button>
					</div>
					<div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
						<p className="font-medium text-foreground">Quick Start</p>
						<p className="mt-1">
							Use the `.env` snippet for application runtime, or copy host,
							port, database, and username individually if you prefer manual
							setup.
						</p>
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Sandbox Info</CardTitle>
						<CardDescription>
							Operational metadata for this ephemeral database.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						{metaRows.map((row) => (
							<div
								key={row.label}
								className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
							>
								<span className="text-muted-foreground">{row.label}</span>
								<span className="font-medium">{row.value}</span>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Storage</CardTitle>
						<CardDescription>
							{formatStorageMb(sandbox.sizeMb)} used of{" "}
							{formatStorageMb(sandbox.maxSizeMb)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all"
								style={{ width: `${sizePct}%` }}
							/>
						</div>
						<p className="mt-2 text-xs text-muted-foreground">
							{usageLabel} used ·{" "}
							{formatStorageMb(sandbox.maxSizeMb - sandbox.sizeMb)} remaining
						</p>
						<div className="mt-4 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
							<p className="flex items-center gap-1.5 font-medium text-foreground">
								<ShieldCheckIcon className="size-3.5" />
								Sandbox Safety
							</p>
							<p className="mt-1">
								This sandbox is isolated per user and expires automatically at
								the configured TTL unless you extend it.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function ConsoleTab({
	sandbox,
	refreshHistory,
	setTables,
	query,
	setQuery,
	queryResult,
	setQueryResult,
	queryError,
	setQueryError,
}: {
	sandbox: SandboxDetail;
	refreshHistory: () => Promise<void>;
	setTables: React.Dispatch<React.SetStateAction<SandboxTable[]>>;
	query: string;
	setQuery: React.Dispatch<React.SetStateAction<string>>;
	queryResult: QueryResult | null;
	setQueryResult: React.Dispatch<React.SetStateAction<QueryResult | null>>;
	queryError: string | null;
	setQueryError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
	const isMac =
		typeof navigator !== "undefined" &&
		/Mac|iPod|iPhone|iPad/.test(navigator.platform);
	const modKey = isMac ? "⌘" : "Ctrl";
	const [isLoading, setIsLoading] = useState(false);

	const handleRun = async () => {
		if (!query.trim()) return;

		setIsLoading(true);
		setQueryResult(null);
		setQueryError(null);

		try {
			const result = await $executeQuery({
				data: { sandboxId: sandbox.id, query },
			});
			setQueryResult(result);

			const newTables = await $getSandboxTables({
				data: { sandboxId: sandbox.id },
			});
			setTables(newTables);
			await refreshHistory();
		} catch (error) {
			setQueryError(error instanceof Error ? error.message : "Query failed");
		} finally {
			setIsLoading(false);
		}
	};

	const isMutationQuery = (q: string): boolean => {
		// DDL and DML statements that affect rows
		const mutationKeywords =
			/^\s*(CREATE|DROP|ALTER|TRUNCATE|COMMENT|RENAME|INSERT|UPDATE|DELETE)\s+/i;
		return mutationKeywords.test(q.trim());
	};

	const getQueryStatusMessage = (
		q: string,
		rowsLength: number,
		rowsAffected: number,
	): string => {
		if (isMutationQuery(q)) {
			return rowsAffected >= 0
				? `${rowsAffected} row(s) affected`
				: "Query executed successfully";
		}
		if (rowsLength > 0) {
			return `${rowsLength} row(s)`;
		}
		return "Query executed successfully. No rows returned.";
	};

	const starterQueries = [
		"SELECT * FROM information_schema.tables LIMIT 10;",
		"SELECT NOW() AS current_time;",
		"SELECT COUNT(*) AS total_rows FROM information_schema.tables;",
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">SQL Console</CardTitle>
				<CardDescription>
					Run exploratory queries against{" "}
					<span className="font-mono">{sandbox.dbName}</span> without leaving
					the dashboard.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="rounded-xl border bg-muted/30 p-3">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-xs font-medium text-foreground">
							Starter Queries
						</p>
						{starterQueries.map((snippet) => (
							<button
								key={snippet}
								type="button"
								className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
								onClick={() => setQuery(snippet)}
							>
								{snippet.length > 38 ? `${snippet.slice(0, 38)}...` : snippet}
							</button>
						))}
					</div>
				</div>
				<SqlEditor
					value={query}
					onChange={setQuery}
					onSubmit={handleRun}
					engine={sandbox.engine}
					disabled={isLoading}
					className="min-h-36"
				/>
				<div className="flex gap-2">
					<Button
						size="sm"
						className="gap-1.5"
						onClick={handleRun}
						disabled={isLoading || sandbox.status !== "active"}
					>
						<PlayIcon className="size-4" />
						{isLoading ? "Running…" : "Run Query"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setQuery("");
							setQueryResult(null);
							setQueryError(null);
						}}
					>
						Clear
					</Button>
					<Badge variant="outline">{modKey} + Enter</Badge>
				</div>

				{queryError && (
					<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
						{queryError}
					</div>
				)}

				{queryResult ? (
					<div className="overflow-x-auto rounded-md border">
						<div className="mb-2 flex items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
							<span>
								{getQueryStatusMessage(
									query,
									queryResult.rows.length,
									queryResult.rowsAffected,
								)}
							</span>
							<span>•</span>
							<span>{queryResult.executionTimeMs} ms</span>
						</div>
						{queryResult.rows.length > 0 ? (
							<table className="w-full min-w-96 text-sm">
								<thead className="bg-muted/50 text-left">
									<tr>
										{queryResult.columns.map((col) => (
											<th key={col} className="px-3 py-2 font-medium">
												{col}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{queryResult.rows.map((row) => (
										<tr
											key={queryResult.columns
												.map((col) => String(row[col] ?? ""))
												.join("|")}
											className="border-t"
										>
											{queryResult.columns.map((col) => (
												<td key={col} className="px-3 py-2 font-mono text-xs">
													{row[col] === null ? (
														<span className="text-muted-foreground">NULL</span>
													) : (
														String(row[col])
													)}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className="p-4 text-sm text-muted-foreground">
								Query executed successfully. No rows returned.
							</div>
						)}
					</div>
				) : !queryError ? (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						Run a query to preview rows, schema checks, or migration output
						here.
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function AiTab({
	sandbox,
	prompt,
	setPrompt,
	generated,
	setGenerated,
	generatedSql,
	setGeneratedSql,
	error,
	setError,
	executed,
	setExecuted,
}: {
	sandbox: SandboxDetail;
	prompt: string;
	setPrompt: React.Dispatch<React.SetStateAction<string>>;
	generated: AiGenerateResult | null;
	setGenerated: React.Dispatch<React.SetStateAction<AiGenerateResult | null>>;
	generatedSql: string;
	setGeneratedSql: React.Dispatch<React.SetStateAction<string>>;
	error: string | null;
	setError: React.Dispatch<React.SetStateAction<string | null>>;
	executed: boolean;
	setExecuted: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const queryClient = useQueryClient();
	const { data: workspaceStats } = useWorkspaceStats();
	const [isLoading, setIsLoading] = useState(false);
	const promptIdeas = [
		"Design a lightweight ecommerce schema with users, products, carts, and orders.",
		"Generate seed data for a blog app with 20 authors, 80 posts, and comments.",
		"Create a CRM schema with contacts, companies, deals, and activity history.",
	];

	const handleGenerate = async () => {
		if (!prompt.trim()) return;

		setIsLoading(true);
		setError(null);
		setGenerated(null);
		setGeneratedSql("");
		setExecuted(false);

		try {
			const result = await $aiGenerate({
				data: { sandboxId: sandbox.id, prompt, engine: sandbox.engine },
			});
			setGenerated(result);
			setGeneratedSql(result.sqlGenerated);
			await queryClient.invalidateQueries({ queryKey: ["workspace-stats"] });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Generation failed");
		} finally {
			setIsLoading(false);
		}
	};

	const handleExecute = async () => {
		if (!generated) return;

		setIsLoading(true);
		try {
			await $aiExecute({
				data: {
					sandboxId: sandbox.id,
					logId: generated.logId,
					sql: generatedSql,
				},
			});
			setExecuted(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Execution failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">AI Seeder</CardTitle>
				<CardDescription>
					Generate schema and seed data for{" "}
					<span className="font-mono">{sandbox.dbName}</span> with prompts that
					match this engine.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-muted p-3">
					<p className="text-sm font-medium text-foreground">Prompt Ideas</p>
					<div className="mt-3 flex flex-wrap gap-2">
						{promptIdeas.map((idea) => (
							<button
								key={idea}
								type="button"
								className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
								onClick={() => setPrompt(idea)}
							>
								{idea}
							</button>
						))}
					</div>
				</div>
				<textarea
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					placeholder="Create users, products, and orders tables for a simple e-commerce app."
					className="min-h-28 w-full rounded-md border bg-muted/30 p-3 text-sm"
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						className="gap-1.5"
						onClick={handleGenerate}
						disabled={
							isLoading || !prompt.trim() || sandbox.status !== "active"
						}
					>
						<SparklesIcon className="size-4" />
						{isLoading ? "Generating…" : "Generate SQL"}
					</Button>
					<Badge variant="outline">
						{workspaceStats
							? `${workspaceStats.aiRequestsToday}/${workspaceStats.maxAiRequestsPerDay} requests today`
							: "Loading AI usage…"}
					</Badge>
				</div>

				{error && (
					<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
						{error}
					</div>
				)}

				{generated && (
					<div className="space-y-2 rounded-lg border p-3">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm font-medium">Generated SQL</p>
							<Badge variant="secondary">
								Review before running against the sandbox
							</Badge>
						</div>
						<textarea
							value={generatedSql}
							onChange={(e) => setGeneratedSql(e.target.value)}
							className="min-h-32 w-full rounded-md bg-muted p-3 font-mono text-xs"
						/>
						<div className="flex gap-2">
							<Button
								size="sm"
								onClick={handleExecute}
								disabled={isLoading || executed}
							>
								{executed ? "Executed ✓" : "Execute SQL"}
							</Button>
						</div>
					</div>
				)}

				{!generated && !error && (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						Start with a concrete prompt describing tables, relationships, and
						the amount of sample data you want.
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function TablesTab({
	tables,
	dbName,
}: {
	tables: SandboxTable[];
	dbName: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Tables</CardTitle>
				<CardDescription>
					{tables.length} tables in <span className="font-mono">{dbName}</span>.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{tables.length > 0 ? (
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full text-sm">
							<thead className="bg-muted/50 text-left">
								<tr>
									<th className="px-3 py-2 font-medium">Table</th>
									<th className="px-3 py-2 font-medium">Rows</th>
									<th className="px-3 py-2 font-medium">Size</th>
								</tr>
							</thead>
							<tbody>
								{tables.map((table) => (
									<tr key={table.name} className="border-t">
										<td className="px-3 py-2 font-mono text-xs font-medium">
											{table.name}
										</td>
										<td className="px-3 py-2 text-muted-foreground">
											{table.rows.toLocaleString()}
										</td>
										<td className="px-3 py-2 text-muted-foreground">
											{table.sizeKb >= 1024
												? `${(table.sizeKb / 1024).toFixed(1)} MB`
												: `${table.sizeKb} KB`}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						No tables yet. Use AI Seeder or SQL Console to create tables.
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function HistoryTab({ history }: { history: QueryHistoryItem[] }) {
	const isMutationQuery = (q: string): boolean => {
		// DDL and DML statements that affect rows
		const mutationKeywords =
			/^\s*(CREATE|DROP|ALTER|TRUNCATE|COMMENT|RENAME|INSERT|UPDATE|DELETE)\s+/i;
		return mutationKeywords.test(q.trim());
	};

	const getHistoryStatus = (item: QueryHistoryItem): string => {
		if (item.status === "error") return "ERROR";
		if (isMutationQuery(item.query)) {
			return item.rowsAffected !== null
				? `${item.rowsAffected} row(s) affected`
				: "SUCCESS";
		}
		if (item.rowsAffected !== null && item.rowsAffected > 0) {
			return `${item.rowsAffected} row(s)`;
		}
		return "SUCCESS";
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Query History</CardTitle>
				<CardDescription>
					Last 50 queries executed in this sandbox, ordered by most recent
					activity.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{history.length > 0 ? (
					history.map((item) => (
						<div
							key={item.id}
							className="flex items-start justify-between gap-3 rounded-xl border p-3"
						>
							<div className="min-w-0 flex-1">
								<div className="mb-2 flex items-center gap-2">
									<Badge
										variant={
											item.status === "success" ? "secondary" : "destructive"
										}
										className="text-[10px]"
									>
										{item.status}
									</Badge>
									<span className="text-[11px] text-muted-foreground">
										{new Date(item.createdAt).toLocaleString("id-ID")}
									</span>
								</div>
								<p className="truncate font-mono text-xs">{item.query}</p>
								<p className="mt-1 text-[11px] text-muted-foreground">
									<span
										className={
											item.status === "success"
												? "text-green-600 dark:text-green-400"
												: "text-destructive"
										}
									>
										{getHistoryStatus(item)}
									</span>
									{" · "}
									{item.executionTimeMs} ms
								</p>
								{item.errorMessage ? (
									<p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
										{item.errorMessage}
									</p>
								) : null}
							</div>
						</div>
					))
				) : (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						No query history yet.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
