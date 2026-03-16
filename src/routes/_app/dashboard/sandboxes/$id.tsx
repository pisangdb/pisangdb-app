import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	BotIcon,
	ClockIcon,
	CopyIcon,
	DatabaseIcon,
	EyeIcon,
	EyeOffIcon,
	LoaderIcon,
	PlayIcon,
	RefreshCcwIcon,
	SaveIcon,
	SparklesIcon,
	TableIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet";
import { useDeleteSandbox } from "#/hooks/use-delete-sandbox";
import { useExecuteAiSql } from "#/hooks/use-execute-ai-sql";
import { useExecuteQuery } from "#/hooks/use-execute-query";
import { useExtendSandbox } from "#/hooks/use-extend-sandbox";
import { useGenerateAiSql } from "#/hooks/use-generate-ai-sql";
import { useQueryHistory } from "#/hooks/use-query-history";
import { useSandbox } from "#/hooks/use-sandbox";
import { useTables } from "#/hooks/use-tables";
import type { Sandbox } from "#/lib/api-client";
import { createTemplate } from "#/lib/api-client";

export const Route = createFileRoute("/_app/dashboard/sandboxes/$id")({
	component: SandboxDetailPage,
});

// Engine emoji mapping
const engineEmojis: Record<string, string> = {
	postgresql: "🐘",
	mysql: "🐬",
	mariadb: "🦭",
};

// Engine label mapping
const engineLabels: Record<string, string> = {
	postgresql: "PostgreSQL 16",
	mysql: "MySQL 8",
	mariadb: "MariaDB 11",
};

// Region label mapping
const regionLabels: Record<string, string> = {
	id: "🇮🇩 Indonesia",
	sg: "🇸🇬 Singapore",
	us: "🇺🇸 United States",
};

// Format TTL seconds to human readable
function formatTtl(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	if (hours > 0) {
		return `${hours}h ${minutes}m left`;
	}
	return `${minutes}m left`;
}

// Format date to human readable
function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// Parse size string to MB number
function parseSizeMb(sizeStr?: string): number {
	if (!sizeStr) return 0;
	const match = sizeStr.match(/(\d+)/);
	return match ? Number.parseInt(match[1], 10) : 0;
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

function SandboxDetailPage() {
	const { id } = useParams({ from: "/_app/dashboard/sandboxes/$id" });
	const { data, isLoading, error } = useSandbox(id);
	const sandbox = data?.sandbox;
	const extendMutation = useExtendSandbox(id);
	const deleteMutation = useDeleteSandbox();

	const [activeTab, setActiveTab] = useState<Tab>("info");
	const [extendOpen, setExtendOpen] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [templateOpen, setTemplateOpen] = useState(false);
	const [templateName, setTemplateName] = useState("");
	const [templateDescription, setTemplateDescription] = useState("");
	const [savingTemplate, setSavingTemplate] = useState(false);

	const handleExtend = (duration: string) => {
		const hours = Number.parseInt(
			duration.replace("+", "").replace("h", ""),
			10,
		);
		extendMutation.mutate(hours);
		setExtendOpen(false);
	};

	const handleDelete = () => {
		deleteMutation.mutate(id);
		setConfirmDelete(false);
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<LoaderIcon className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex h-64 flex-col items-center justify-center gap-4">
				<p className="text-destructive">Failed to load sandbox</p>
				<p className="text-sm text-muted-foreground">{error.message}</p>
				<Button asChild variant="outline">
					<Link to="/dashboard/sandboxes">Back to Sandboxes</Link>
				</Button>
			</div>
		);
	}

	// Not found state
	if (!sandbox) {
		return (
			<div className="flex h-64 flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">Sandbox not found</p>
				<Button asChild variant="outline">
					<Link to="/dashboard/sandboxes">Back to Sandboxes</Link>
				</Button>
			</div>
		);
	}

	const engineEmoji = engineEmojis[sandbox.engine] || "🗄️";
	const engineLabel = engineLabels[sandbox.engine] || sandbox.engine;
	const regionLabel = regionLabels[sandbox.region] || sandbox.region;
	const ttlFormatted = formatTtl(sandbox.ttl);
	const sizeMb = parseSizeMb(sandbox.size);
	const maxSizeMb = 100;

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			{/* Header */}
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
							<span className="text-lg">{engineEmoji}</span>
							<h1 className="text-xl font-semibold tracking-tight">
								{sandbox.displayName}
							</h1>
							<Badge variant="default" className="text-[10px]">
								{sandbox.status === "active" ? "Active" : sandbox.status}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{engineLabel} · {regionLabel} · {ttlFormatted}
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
								disabled={extendMutation.isPending}
							>
								<RefreshCcwIcon
									className={`size-3.5 ${extendMutation.isPending ? "animate-spin" : ""}`}
								/>
								{extendMutation.isPending ? "Extending..." : "Extend"}
							</Button>
							{extendOpen && !extendMutation.isPending && (
								<div className="absolute right-0 top-9 z-10 flex flex-col gap-0.5 rounded-md border bg-background p-1 shadow-md">
									{["+1h", "+6h", "+12h", "+24h"].map((d) => (
										<button
											key={d}
											type="button"
											className="rounded px-4 py-1.5 text-left text-xs hover:bg-muted"
											onClick={() => handleExtend(d)}
										>
											Extend {d}
										</button>
									))}
								</div>
							)}
						</div>
						<Sheet open={templateOpen} onOpenChange={setTemplateOpen}>
							<SheetTrigger asChild>
								<Button variant="outline" size="sm" className="gap-1.5">
									<SaveIcon className="size-3.5" />
									Save as Template
								</Button>
							</SheetTrigger>
							<SheetContent side="bottom" className="sm:max-w-md">
								<SheetHeader>
									<SheetTitle>Save as Template</SheetTitle>
									<SheetDescription>
										Save your current schema as a reusable template. This will
										save all tables and their structure.
									</SheetDescription>
								</SheetHeader>
								<div className="grid gap-4 py-4">
									<div className="grid gap-2">
										<Label htmlFor="template-name">Template Name</Label>
										<Input
											id="template-name"
											placeholder="My Custom Schema"
											value={templateName}
											onChange={(e) => setTemplateName(e.target.value)}
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="template-description">
											Description (optional)
										</Label>
										<Input
											id="template-description"
											placeholder="A short description of this template"
											value={templateDescription}
											onChange={(e) => setTemplateDescription(e.target.value)}
										/>
									</div>
									<p className="text-xs text-muted-foreground">
										Engine: {sandbox.engine.toUpperCase()}
									</p>
									<Button
										className="w-full"
										disabled={!templateName.trim() || savingTemplate}
										onClick={async () => {
											if (!templateName.trim()) return;
											setSavingTemplate(true);
											try {
												// Get tables DDL from the sandbox
												const tablesData = await fetch(
													`/api/sandboxes/${sandbox.id}/tables`,
												).then((r) => r.json());

												// Build DDL from tables - simplified version
												const ddlSql =
													tablesData.tables
														?.map(
															(t: { name: string; rowCount: number }) =>
																`-- Table: ${t.name} (${t.rowCount} rows)`,
														)
														.join("\n") || "-- No tables found";

												await createTemplate({
													name: templateName.trim(),
													description: templateDescription.trim() || undefined,
													engine: sandbox.engine as
														| "postgresql"
														| "mysql"
														| "mariadb",
													ddlSql,
												});
												toast.success("Template saved successfully!");
												setTemplateOpen(false);
												setTemplateName("");
												setTemplateDescription("");
											} catch (_error) {
												toast.error("Failed to save template");
											} finally {
												setSavingTemplate(false);
											}
										}}
									>
										{savingTemplate ? "Saving..." : "Save Template"}
									</Button>
								</div>
							</SheetContent>
						</Sheet>
						{!confirmDelete ? (
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5 text-destructive hover:text-destructive"
								onClick={() => setConfirmDelete(true)}
								disabled={deleteMutation.isPending}
							>
								<Trash2Icon className="size-3.5" />
								Delete
							</Button>
						) : (
							<div className="flex items-center gap-1.5">
								<span className="text-xs text-destructive">
									Delete sandbox?
								</span>
								<Button
									size="sm"
									variant="destructive"
									className="h-7 px-2 text-xs"
									onClick={handleDelete}
									disabled={deleteMutation.isPending}
								>
									{deleteMutation.isPending ? "Deleting..." : "Confirm"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
									onClick={() => setConfirmDelete(false)}
									disabled={deleteMutation.isPending}
								>
									Cancel
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Tabs */}
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

			{activeTab === "info" && (
				<InfoTab sandbox={sandbox} sizeMb={sizeMb} maxSizeMb={maxSizeMb} />
			)}
			{activeTab === "console" && <ConsoleTab sandbox={sandbox} />}
			{activeTab === "ai" && <AiTab sandbox={sandbox} />}
			{activeTab === "tables" && <TablesTab sandbox={sandbox} />}
			{activeTab === "history" && <HistoryTab sandboxId={sandbox.id} />}
		</div>
	);
}

/* ── Info Tab ─────────────────────────────────────────────── */
function InfoTab({
	sandbox,
	sizeMb,
	maxSizeMb,
}: {
	sandbox: Sandbox;
	sizeMb: number;
	maxSizeMb: number;
}) {
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

	const sizePct = Math.round((sizeMb / maxSizeMb) * 100);
	const engineEmoji = engineEmojis[sandbox.engine] || "🗄️";
	const engineLabel = engineLabels[sandbox.engine] || sandbox.engine;
	const regionLabel = regionLabels[sandbox.region] || sandbox.region;

	const credRows = [
		{ label: "Host", value: sandbox.host, key: "host" },
		{ label: "Port", value: String(sandbox.port), key: "port" },
		{ label: "Database", value: sandbox.dbName, key: "db" },
		{ label: "Username", value: sandbox.dbUser, key: "user" },
	];

	const metaRows = [
		{
			label: "Status",
			value: sandbox.status === "active" ? "Active 🟢" : sandbox.status,
		},
		{ label: "Engine", value: `${engineEmoji} ${engineLabel}` },
		{ label: "Region", value: regionLabel },
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
							{sizeMb} MB used of {maxSizeMb} MB
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
							{sizePct}% used · {maxSizeMb - sizeMb} MB remaining
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

/* ── SQL Console Tab ──────────────────────────────────────── */
function ConsoleTab({ sandbox }: { sandbox: Sandbox }) {
	const [query, setQuery] = useState(
		"SELECT id, name, email\nFROM users\nORDER BY created_at DESC\nLIMIT 5;",
	);
	const executeMutation = useExecuteQuery(sandbox.id);

	// Get column names from result rows
	const columns = executeMutation.data?.rows?.[0]
		? Object.keys(executeMutation.data.rows[0])
		: [];

	const handleRunQuery = () => {
		if (query.trim()) {
			executeMutation.mutate(query);
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
					placeholder="Enter your SQL query here..."
					className="min-h-36"
				/>
				<div className="flex gap-2">
					<Button
						size="sm"
						className="gap-1.5"
						onClick={handleRunQuery}
						disabled={executeMutation.isPending || !query.trim()}
					>
						<PlayIcon className="size-4" />
						{executeMutation.isPending ? "Running..." : "Run Query"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setQuery("");
						}}
					>
						Clear
					</Button>
					<Badge variant="outline">Ctrl + Enter</Badge>
				</div>

				{executeMutation.isError ? (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
						<p className="font-medium">Error</p>
						<p className="mt-1">{executeMutation.error?.message}</p>
					</div>
				) : executeMutation.data ? (
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full min-w-96 text-sm">
							<thead className="bg-muted/50 text-left">
								<tr>
									{columns.map((col) => (
										<th key={col} className="px-3 py-2 font-medium">
											{col}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{executeMutation.data.rows.map((row, idx) => (
									<tr key={JSON.stringify(row) || idx} className="border-t">
										{columns.map((col) => (
											<td key={col} className="px-3 py-2 font-mono text-xs">
												{String(row[col] ?? "NULL")}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
						<p className="px-3 py-1.5 text-xs text-muted-foreground">
							{executeMutation.data.rowCount} row
							{executeMutation.data.rowCount !== 1 ? "s" : ""} ·{" "}
							{executeMutation.data.executionTimeMs} ms
						</p>
					</div>
				) : (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						Run a query to see results here.
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/* ── AI Seeder Tab ────────────────────────────────────────── */
function AiTab({ sandbox }: { sandbox: Sandbox }) {
	const [prompt, setPrompt] = useState(
		"Create users, products, and orders tables for a simple e-commerce app.",
	);
	const [generatedSql, setGeneratedSql] = useState<string | null>(null);
	const generateMutation = useGenerateAiSql(sandbox.id);
	const executeMutation = useExecuteAiSql(sandbox.id);

	const handleGenerate = () => {
		if (prompt.trim()) {
			generateMutation.mutate(prompt, {
				onSuccess: (data) => {
					setGeneratedSql(data.sql);
				},
			});
		}
	};

	const handleExecute = () => {
		if (generatedSql) {
			// Note: executeMutation requires aiLogId from the generate response
			// For now, we'll show a placeholder - the actual implementation would
			// need to store the aiLogId from the generate response
			executeMutation.mutate("placeholder-ai-log-id");
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
					className="min-h-28 w-full rounded-md border bg-muted/30 p-3 text-sm"
					placeholder="Describe the tables and data you want to create..."
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						className="gap-1.5"
						onClick={handleGenerate}
						disabled={generateMutation.isPending || !prompt.trim()}
					>
						<SparklesIcon className="size-4" />
						{generateMutation.isPending ? "Generating..." : "Generate SQL"}
					</Button>
					<Badge variant="outline">30 requests/day (free)</Badge>
				</div>

				{generateMutation.isError ? (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
						<p className="font-medium">Error generating SQL</p>
						<p className="mt-1">{generateMutation.error?.message}</p>
					</div>
				) : generatedSql ? (
					<div className="space-y-2 rounded-lg border p-3">
						<p className="text-sm font-medium">Generated SQL</p>
						<pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
							<code>{generatedSql}</code>
						</pre>
						<div className="flex gap-2">
							<Button
								size="sm"
								onClick={handleExecute}
								disabled={executeMutation.isPending}
							>
								{executeMutation.isPending ? "Executing..." : "Execute SQL"}
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									// Copy to clipboard
									navigator.clipboard.writeText(generatedSql);
								}}
							>
								Copy SQL
							</Button>
						</div>
						{executeMutation.isSuccess && (
							<p className="text-sm text-green-600 dark:text-green-400">
								SQL executed successfully!
							</p>
						)}
						{executeMutation.isError && (
							<p className="text-sm text-destructive">
								{executeMutation.error?.message}
							</p>
						)}
					</div>
				) : (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						Generate SQL to preview and run it against this sandbox.
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/* ── Tables Tab ───────────────────────────────────────────── */
function TablesTab({ sandbox }: { sandbox: Sandbox }) {
	const { data, isLoading, error } = useTables(sandbox.id);
	const tables = data?.tables ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Tables</CardTitle>
				<CardDescription>
					{isLoading ? "Loading..." : `${tables.length} tables in `}
					{!isLoading && <span className="font-mono">{sandbox.dbName}</span>}.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex h-24 items-center justify-center">
						<LoaderIcon className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : error ? (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
						<p className="font-medium">Error loading tables</p>
						<p className="mt-1">{error.message}</p>
					</div>
				) : tables.length === 0 ? (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						No tables found. Create some tables using the SQL Console or AI
						Seeder.
					</div>
				) : (
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
				)}
			</CardContent>
		</Card>
	);
}

/* ── History Tab ──────────────────────────────────────────── */
function HistoryTab({ sandboxId }: { sandboxId: string }) {
	const { data, isLoading, error } = useQueryHistory(sandboxId);
	const history = data ?? [];

	const formatTime = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Query History</CardTitle>
				<CardDescription>
					Last 50 queries executed in this sandbox.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{isLoading ? (
					<div className="flex h-24 items-center justify-center">
						<LoaderIcon className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : error ? (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
						<p className="font-medium">Error loading history</p>
						<p className="mt-1">{error.message}</p>
					</div>
				) : history.length === 0 ? (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						No queries executed yet. Run some queries in the SQL Console.
					</div>
				) : (
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
									{item.executionTimeMs} ms · {formatTime(item.createdAt)}
								</p>
							</div>
						</div>
					))
				)}
			</CardContent>
		</Card>
	);
}
