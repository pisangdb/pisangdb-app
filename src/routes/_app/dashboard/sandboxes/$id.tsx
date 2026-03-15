import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/_app/dashboard/sandboxes/$id")({
	component: SandboxDetailPage,
});

const dummySandbox = {
	id: "sb_a1b2x8",
	displayName: "migration-check",
	engine: "PostgreSQL 16",
	engineEmoji: "🐘",
	region: "🇮🇩 Indonesia (id)",
	host: "id.pisangdb.com",
	port: 5432,
	dbName: "pisang_a1b2_migration_x8k2m9",
	dbUser: "sb_a1b2x8",
	dbPassword: "s3cr3t_p4ssw0rd_32ch",
	connectionUrl:
		"postgresql://sb_a1b2x8:***@id.pisangdb.com:5432/pisang_a1b2_migration_x8k2m9",
	status: "active" as const,
	ttl: "5h 42m left",
	sizeMb: 22,
	maxSizeMb: 100,
	createdAt: "Today, 09:10",
	expiredAt: "Today, 14:52",
};

const dummyTables = [
	{ name: "users", rows: 128, sizeKb: 48 },
	{ name: "products", rows: 542, sizeKb: 204 },
	{ name: "orders", rows: 1087, sizeKb: 512 },
	{ name: "order_items", rows: 3241, sizeKb: 1024 },
	{ name: "categories", rows: 12, sizeKb: 8 },
];

const dummyHistory = [
	{
		id: "h1",
		query: "SELECT COUNT(*) FROM users;",
		status: "success",
		ms: 18,
		time: "10:24",
	},
	{
		id: "h2",
		query: "SELECT * FROM orders LIMIT 10;",
		status: "success",
		ms: 42,
		time: "10:22",
	},
	{
		id: "h3",
		query: "SELECT * FORM users;",
		status: "error",
		ms: 3,
		time: "10:20",
	},
	{
		id: "h4",
		query: "CREATE INDEX idx_orders_user ON orders(user_id);",
		status: "success",
		ms: 87,
		time: "10:18",
	},
];

const aiSqlPreview = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email) VALUES
  ('Andi Pratama', 'andi@example.com'),
  ('Citra Dewi', 'citra@example.com');`;

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
	const [activeTab, setActiveTab] = useState<Tab>("info");
	const [extendOpen, setExtendOpen] = useState(false);
	const [extended, setExtended] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const handleExtend = (duration: string) => {
		setExtendOpen(false);
		setExtended(true);
		setTimeout(() => setExtended(false), 2000);
	};

	const handleDelete = () => {
		setConfirmDelete(false);
	};

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
							<span className="text-lg">{dummySandbox.engineEmoji}</span>
							<h1 className="text-xl font-semibold tracking-tight">
								{dummySandbox.displayName}
							</h1>
							<Badge variant="default" className="text-[10px]">
								Active
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{dummySandbox.engine} · {dummySandbox.region} · {dummySandbox.ttl}
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
							>
								<RefreshCcwIcon className="size-3.5" />
								Extend
							</Button>
							{extendOpen && (
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
								<span className="text-xs text-destructive">
									Delete sandbox?
								</span>
								<Button
									size="sm"
									variant="destructive"
									className="h-7 px-2 text-xs"
									onClick={handleDelete}
								>
									Confirm
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

			{activeTab === "info" && <InfoTab />}
			{activeTab === "console" && <ConsoleTab />}
			{activeTab === "ai" && <AiTab />}
			{activeTab === "tables" && <TablesTab />}
			{activeTab === "history" && <HistoryTab />}
		</div>
	);
}

/* ── Info Tab ─────────────────────────────────────────────── */
function InfoTab() {
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

	const sizePct = Math.round(
		(dummySandbox.sizeMb / dummySandbox.maxSizeMb) * 100,
	);

	const credRows = [
		{ label: "Host", value: dummySandbox.host, key: "host" },
		{ label: "Port", value: String(dummySandbox.port), key: "port" },
		{ label: "Database", value: dummySandbox.dbName, key: "db" },
		{ label: "Username", value: dummySandbox.dbUser, key: "user" },
	];

	const metaRows = [
		{ label: "Status", value: "Active 🟢" },
		{
			label: "Engine",
			value: `${dummySandbox.engineEmoji} ${dummySandbox.engine}`,
		},
		{ label: "Region", value: dummySandbox.region },
		{ label: "Created", value: dummySandbox.createdAt },
		{ label: "Expires", value: dummySandbox.expiredAt },
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
								{showPassword ? dummySandbox.dbPassword : "••••••••••••"}
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
								onClick={() => void handleCopy("pass", dummySandbox.dbPassword)}
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
							{dummySandbox.connectionUrl}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() =>
								void handleCopy("conn", dummySandbox.connectionUrl)
							}
						>
							<CopyIcon className="size-3.5" />
							{copiedKey === "conn" ? "Copied!" : "Copy connection string"}
						</Button>
					</div>

					<div className="space-y-2 rounded-md bg-muted p-3">
						<p className="text-xs font-medium">.env snippet</p>
						<p className="break-all font-mono text-xs text-muted-foreground">
							DATABASE_URL={dummySandbox.connectionUrl}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() =>
								void handleCopy(
									"env",
									`DATABASE_URL=${dummySandbox.connectionUrl}`,
								)
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
							{dummySandbox.sizeMb} MB used of {dummySandbox.maxSizeMb} MB
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
							{sizePct}% used · {dummySandbox.maxSizeMb - dummySandbox.sizeMb}{" "}
							MB remaining
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

/* ── SQL Console Tab ──────────────────────────────────────── */
function ConsoleTab() {
	const [query, setQuery] = useState(
		"SELECT id, name, email\nFROM users\nORDER BY created_at DESC\nLIMIT 5;",
	);
	const [hasRun, setHasRun] = useState(false);

	const rows = useMemo(
		() => [
			{ id: "u_001", name: "Andi Pratama", email: "andi@example.com" },
			{ id: "u_002", name: "Citra Dewi", email: "citra@example.com" },
			{ id: "u_003", name: "Budi Rahman", email: "budi@example.com" },
		],
		[],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">SQL Console</CardTitle>
				<CardDescription>
					Queries run against{" "}
					<span className="font-mono">{dummySandbox.dbName}</span>.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<textarea
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="min-h-36 w-full rounded-md border bg-muted/30 p-3 font-mono text-sm"
				/>
				<div className="flex gap-2">
					<Button size="sm" className="gap-1.5" onClick={() => setHasRun(true)}>
						<PlayIcon className="size-4" />
						Run Query
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setQuery("");
							setHasRun(false);
						}}
					>
						Clear
					</Button>
					<Badge variant="outline">Ctrl + Enter</Badge>
				</div>

				{hasRun ? (
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full min-w-96 text-sm">
							<thead className="bg-muted/50 text-left">
								<tr>
									{["id", "name", "email"].map((col) => (
										<th key={col} className="px-3 py-2 font-medium">
											{col}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => (
									<tr key={row.id} className="border-t">
										<td className="px-3 py-2 font-mono text-xs">{row.id}</td>
										<td className="px-3 py-2">{row.name}</td>
										<td className="px-3 py-2">{row.email}</td>
									</tr>
								))}
							</tbody>
						</table>
						<p className="px-3 py-1.5 text-xs text-muted-foreground">
							3 rows · 24 ms
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
function AiTab() {
	const [prompt, setPrompt] = useState(
		"Create users, products, and orders tables for a simple e-commerce app.",
	);
	const [generated, setGenerated] = useState(false);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">AI Seeder</CardTitle>
				<CardDescription>
					Generate schema and seed data for{" "}
					<span className="font-mono">{dummySandbox.dbName}</span>.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<textarea
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					className="min-h-28 w-full rounded-md border bg-muted/30 p-3 text-sm"
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						className="gap-1.5"
						onClick={() => setGenerated(true)}
					>
						<SparklesIcon className="size-4" />
						Generate SQL
					</Button>
					<Badge variant="outline">30 requests/day (free)</Badge>
				</div>

				{generated ? (
					<div className="space-y-2 rounded-lg border p-3">
						<p className="text-sm font-medium">Generated SQL</p>
						<pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
							<code>{aiSqlPreview}</code>
						</pre>
						<div className="flex gap-2">
							<Button size="sm">Execute SQL</Button>
							<Button size="sm" variant="outline">
								Edit Before Execute
							</Button>
						</div>
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
function TablesTab() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Tables</CardTitle>
				<CardDescription>
					{dummyTables.length} tables in{" "}
					<span className="font-mono">{dummySandbox.dbName}</span>.
				</CardDescription>
			</CardHeader>
			<CardContent>
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
							{dummyTables.map((table) => (
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
			</CardContent>
		</Card>
	);
}

/* ── History Tab ──────────────────────────────────────────── */
function HistoryTab() {
	const [rerunId, setRerunId] = useState<string | null>(null);

	const handleRerun = (id: string) => {
		setRerunId(id);
		setTimeout(() => setRerunId((cur) => (cur === id ? null : cur)), 800);
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
				{dummyHistory.map((item) => (
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
								{item.ms} ms · {item.time}
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="size-7 shrink-0"
							title="Re-run query"
							onClick={() => handleRerun(item.id)}
						>
							<RefreshCcwIcon
								className={`size-3.5 ${rerunId === item.id ? "animate-spin" : ""}`}
							/>
						</Button>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
