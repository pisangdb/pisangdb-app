import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	BotIcon,
	ClockIcon,
	CopyIcon,
	DatabaseIcon,
	EyeIcon,
	EyeOffIcon,
	PlayIcon,
	RefreshCcwIcon,
	SparklesIcon,
	TableIcon,
	Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Skeleton } from "#/components/ui/skeleton";
import type {
	AiGenerateResult,
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
	$deleteSandbox as $deleteSandboxFn,
	$extendSandbox as $extendSandboxFn,
	$getSandboxById,
	$getSandboxTables,
} from "#/modules/sandboxes/serverFn";

export const Route = createFileRoute("/_app/dashboard/sandboxes/$id")({
	loader: async ({ params }) => {
		const sandboxId = params.id;

		// Run all data fetches in parallel — each wrapped individually so one failure
		// doesn't crash the entire page loader
		const [sandboxResult, tablesResult, historyResult, aiLogsResult] =
			await Promise.allSettled([
				$getSandboxById({ data: { sandboxId } }),
				$getSandboxTables({ data: { sandboxId } }),
				$getQueryHistory({ data: { sandboxId } }),
				$getAiLogs({ data: { sandboxId } }),
			]);

		const sandbox =
			sandboxResult.status === "fulfilled" ? sandboxResult.value : null;
		const tables =
			tablesResult.status === "fulfilled" ? tablesResult.value : [];
		const history =
			historyResult.status === "fulfilled" ? historyResult.value : [];
		const aiLogs =
			aiLogsResult.status === "fulfilled" ? aiLogsResult.value : [];

		if (!sandbox) {
			throw new Error("Sandbox not found or access denied");
		}

		return { sandbox, tables, history, aiLogs };
	},
	head: () => ({ meta: [{ title: "Sandbox Detail — PisangDB" }] }),
	component: SandboxDetailPage,
	pendingComponent: SandboxDetailSkeleton,
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

type Tab = "info" | "console" | "ai" | "tables" | "history";
function SandboxDetailSkeleton() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Skeleton className="size-8 shrink-0 rounded-md" />
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-12 rounded-full" />
						</div>
						<Skeleton className="h-4 w-64" />
					</div>
				</div>
				<div className="flex gap-1.5">
					<Skeleton className="h-8 w-20 rounded-md" />
					<Skeleton className="h-8 w-20 rounded-md" />
				</div>
			</div>
			<Skeleton className="h-10 w-full rounded-lg" />
			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-5 w-24" />
					</CardHeader>
					<CardContent className="space-y-3">
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className="h-9 w-full rounded-md" />
						))}
						<Skeleton className="h-20 w-full rounded-md" />
					</CardContent>
				</Card>
				<div className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-32" />
						</CardHeader>
						<CardContent className="space-y-2">
							{[1, 2, 3, 4, 5].map((i) => (
								<Skeleton key={i} className="h-5 w-full" />
							))}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-24" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-2 w-full rounded-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

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
	const { sandbox, tables, history: initialHistory } = Route.useLoaderData();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<Tab>("info");
	const [extendOpen, setExtendOpen] = useState(false);
	const [extended, setExtended] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const ttl = formatTtl(sandbox.expiredAt);

	// Auto-redirect when sandbox is being destroyed
	useEffect(() => {
		if (sandbox.status === "destroying") {
			const timeout = setTimeout(() => {
				void navigate({ to: "/dashboard/sandboxes" });
			}, 5000);
			return () => clearTimeout(timeout);
		}
	}, [sandbox.status, navigate]);

	const handleExtend = async (duration: 1 | 6 | 12 | 24) => {
		setExtendOpen(false);
		try {
			await $extendSandboxFn({
				data: { sandboxId: sandbox.id, additionalHours: duration },
			});
			setExtended(true);
			setTimeout(() => setExtended(false), 2000);
		} catch (error) {
			console.error("Failed to extend sandbox:", error);
		}
	};

	const handleDelete = async () => {
		setConfirmDelete(false);
		setDeleting(true);
		try {
			await $deleteSandboxFn({ data: { sandboxId: sandbox.id } });
			navigate({ to: "/dashboard/sandboxes" });
		} catch (error) {
			console.error("Failed to delete sandbox:", error);
			setDeleting(false);
		}
	};

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button
						asChild
						variant="outline"
						size="icon"
						className="size-8 shrink-0"
					>
						<Link to="/dashboard/sandboxes">
							<ArrowLeftIcon className="size-4" />
						</Link>
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-lg">{ENGINE_EMOJI[sandbox.engine]}</span>
							<h1 className="text-xl font-semibold tracking-tight">
								{sandbox.displayName}
							</h1>
							<Badge
								variant={
									sandbox.status === "active"
										? "default"
										: sandbox.status === "destroying"
											? "destructive"
											: "secondary"
								}
								className="text-[10px]"
							>
								{sandbox.status}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{ENGINE_LABELS[sandbox.engine]} ·{" "}
							{REGION_LABELS[sandbox.region] ?? sandbox.region} · {ttl}
						</p>
					</div>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1.5">
					<div className="flex gap-1.5">
						<div className="relative">
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => setExtendOpen((v) => !v)}
								disabled={sandbox.status !== "active"}
							>
								<RefreshCcwIcon className="size-3.5" />
								Extend
							</Button>
							{extendOpen && (
								<div className="absolute right-0 top-9 z-10 flex flex-col gap-0.5 rounded-md border bg-background p-1 shadow-md">
									{[1, 6, 12, 24].map((d) => (
										<button
											key={d}
											type="button"
											className="rounded px-4 py-1.5 text-left text-xs hover:bg-muted"
											onClick={() => handleExtend(d as 1 | 6 | 12 | 24)}
										>
											+{d}h
										</button>
									))}
								</div>
							)}
						</div>
						{!confirmDelete ? (
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5 text-destructive hover:text-destructive"
								onClick={() => setConfirmDelete(true)}
							>
								<Trash2Icon className="size-3.5" />
								Delete
							</Button>
						) : (
							<div className="flex items-center gap-1.5">
								<span className="text-xs text-destructive">Delete?</span>
								<Button
									size="sm"
									variant="destructive"
									className="h-7 px-2 text-xs"
									onClick={handleDelete}
									disabled={deleting}
								>
									{deleting ? "..." : "Confirm"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
									onClick={() => setConfirmDelete(false)}
								>
									Cancel
								</Button>
							</div>
						)}
					</div>
					{extended && (
						<p className="text-xs text-muted-foreground">Extended ✓</p>
					)}
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
			{activeTab === "console" && <ConsoleTab sandbox={sandbox} />}
			{activeTab === "ai" && <AiTab sandbox={sandbox} />}
			{activeTab === "tables" && (
				<TablesTab tables={tables} dbName={sandbox.dbName} />
			)}
			{activeTab === "history" && <HistoryTab history={initialHistory} />}
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

	const credRows = [
		{ label: "Host", value: sandbox.host, key: "host" },
		{ label: "Port", value: String(sandbox.port), key: "port" },
		{ label: "Database", value: sandbox.dbName, key: "db" },
		{ label: "Username", value: sandbox.dbUser, key: "user" },
	];

	const metaRows = [
		{
			label: "Status",
			value: sandbox.status === "active" ? "Active" : sandbox.status,
		},
		{
			label: "Engine",
			value: `${ENGINE_EMOJI[sandbox.engine]} ${ENGINE_LABELS[sandbox.engine]}`,
		},
		{ label: "Region", value: REGION_LABELS[sandbox.region] ?? sandbox.region },
		{ label: "Created", value: formatDate(sandbox.createdAt) },
		{ label: "Expires", value: formatDate(sandbox.expiredAt) },
	];

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Credentials</CardTitle>
					<CardDescription>
						Copy and paste into your project's .env file.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					{credRows.map((row) => (
						<div
							key={row.key}
							className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
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

					<div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
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

					<div className="space-y-2 rounded-md border p-3">
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

					<div className="space-y-2 rounded-md bg-muted p-3">
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
				</CardContent>
			</Card>

			<div className="flex flex-col gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Sandbox Info</CardTitle>
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
							{sandbox.sizeMb} MB used of {sandbox.maxSizeMb} MB
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
							{sizePct}% used · {sandbox.maxSizeMb - sandbox.sizeMb} MB
							remaining
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function ConsoleTab({ sandbox }: { sandbox: SandboxDetail }) {
	const [query, setQuery] = useState("SELECT 1 as test;");
	const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
	const [queryError, setQueryError] = useState<string | null>(null);
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
		} catch (error) {
			setQueryError(error instanceof Error ? error.message : "Query failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">SQL Console</CardTitle>
				<CardDescription>
					Queries run against{" "}
					<span className="font-mono">{sandbox.dbName}</span>.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
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
					<Badge variant="outline">Ctrl + Enter</Badge>
				</div>

				{queryError && (
					<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
						{queryError}
					</div>
				)}

				{queryResult ? (
					<div className="overflow-x-auto rounded-md border">
						<div className="mb-2 flex items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
							<span>{queryResult.rows.length} row(s)</span>
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
										<tr key={Object.values(row).join("-")} className="border-t">
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
						Run a query to see results here.
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function AiTab({ sandbox }: { sandbox: SandboxDetail }) {
	const [prompt, setPrompt] = useState("");
	const [generated, setGenerated] = useState<AiGenerateResult | null>(null);
	const [generatedSql, setGeneratedSql] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [executed, setExecuted] = useState(false);

	const handleGenerate = async () => {
		if (!prompt.trim()) return;

		setIsLoading(true);
		setError(null);
		setGenerated(null);
		setGeneratedSql("");
		setExecuted(false);

		try {
			const result = await $aiGenerate({
				data: { sandboxId: sandbox.id, prompt },
			});
			setGenerated(result);
			setGeneratedSql(result.sqlGenerated);
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
					<span className="font-mono">{sandbox.dbName}</span>.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
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
					<Badge variant="outline">30 requests/day (free)</Badge>
				</div>

				{error && (
					<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
						{error}
					</div>
				)}

				{generated && (
					<div className="space-y-2 rounded-lg border p-3">
						<p className="text-sm font-medium">Generated SQL</p>
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
						Generate SQL to preview and run it against this sandbox.
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
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Query History</CardTitle>
				<CardDescription>
					Last 50 queries executed in this sandbox.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{history.length > 0 ? (
					history.map((item) => (
						<div
							key={item.id}
							className="flex items-start justify-between gap-3 rounded-md border p-3"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate font-mono text-xs">{item.query}</p>
								<p className="mt-1 text-[11px] text-muted-foreground">
									<span
										className={
											item.status === "success"
												? "text-green-600 dark:text-green-400"
												: "text-destructive"
										}
									>
										{item.status.toUpperCase()}
									</span>
									{" · "}
									{item.executionTimeMs} ms ·{" "}
									{new Date(item.createdAt).toLocaleTimeString()}
								</p>
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
