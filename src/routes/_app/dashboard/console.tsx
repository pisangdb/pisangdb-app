import { createFileRoute } from "@tanstack/react-router";
import { PlayIcon, ShieldIcon, Trash2Icon } from "lucide-react";
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

export const Route = createFileRoute("/_app/dashboard/console")({
	head: () => ({ meta: [{ title: "SQL Console — PisangDB" }] }),
	component: SqlConsolePage,
});

const sandboxOptions = [
	{
		id: "sb_a1b2x8",
		label: "migration-check (PostgreSQL 16)",
	},
	{
		id: "sb_c3d4y9",
		label: "bootcamp-prisma (MySQL 8)",
	},
];

const defaultQuery = `SELECT id, name, email
FROM users
ORDER BY created_at DESC
LIMIT 5;`;

const historyItems = [
	{
		id: "h1",
		query: "SELECT COUNT(*) FROM users;",
		status: "success",
		execution: "18 ms",
		time: "10:24",
	},
	{
		id: "h2",
		query: "SELECT * FROM orders LIMIT 10;",
		status: "success",
		execution: "42 ms",
		time: "10:22",
	},
	{
		id: "h3",
		query: "SELECT * FORM users;",
		status: "error",
		execution: "3 ms",
		time: "10:20",
	},
];

function SqlConsolePage() {
	const [selectedSandbox, setSelectedSandbox] = useState(
		sandboxOptions[0]?.id ?? "",
	);
	const [query, setQuery] = useState(defaultQuery);
	const [hasRun, setHasRun] = useState(false);
	const [isRunning, setIsRunning] = useState(false);

	const handleRun = () => {
		setIsRunning(true);
		setTimeout(() => {
			setIsRunning(false);
			setHasRun(true);
		}, 800);
	};

	const rows = useMemo(
		() => [
			{ id: "u_001", name: "Andi Pratama", email: "andi@example.com" },
			{ id: "u_002", name: "Citra Dewi", email: "citra@example.com" },
			{ id: "u_003", name: "Budi Rahman", email: "budi@example.com" },
		],
		[],
	);

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">SQL Console</h1>
				<p className="text-sm text-muted-foreground">
					Run queries directly from dashboard with sandbox-safe access.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">Query Editor</CardTitle>
						<CardDescription>
							Write and run SQL queries against your selected sandbox.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<label htmlFor="sandbox" className="text-sm font-medium">
								Sandbox
							</label>
							<select
								id="sandbox"
								value={selectedSandbox}
								onChange={(event) => setSelectedSandbox(event.target.value)}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
							>
								{sandboxOptions.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
						</div>

						<textarea
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className="min-h-48 w-full rounded-md border bg-muted/30 p-3 font-mono text-sm"
						/>

						<div className="flex flex-wrap items-center gap-2">
							<Button
								size="sm"
								className="gap-1.5"
								onClick={handleRun}
								disabled={isRunning}
							>
								<PlayIcon className="size-4" />
								{isRunning ? "Running…" : "Run Query"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => setQuery("")}
							>
								<Trash2Icon className="size-4" />
								Clear
							</Button>
							<Badge variant="outline">Ctrl + Enter</Badge>
						</div>

						{hasRun ? (
							<div className="overflow-x-auto rounded-md border">
								<table className="w-full min-w-96 text-sm">
									<thead className="bg-muted/50 text-left">
										<tr>
											<th className="px-3 py-2 font-medium">id</th>
											<th className="px-3 py-2 font-medium">name</th>
											<th className="px-3 py-2 font-medium">email</th>
										</tr>
									</thead>
									<tbody>
										{rows.map((row) => (
											<tr key={row.id} className="border-t">
												<td className="px-3 py-2 font-mono text-xs">
													{row.id}
												</td>
												<td className="px-3 py-2">{row.name}</td>
												<td className="px-3 py-2">{row.email}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								Run a query to see results here.
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Safety & History</CardTitle>
						<CardDescription>
							Read timeout and blocked commands are enforced per sandbox.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
							<p className="flex items-center gap-1.5 font-medium text-foreground">
								<ShieldIcon className="size-3.5" />
								Guards
							</p>
							<ul className="mt-2 list-disc space-y-1 pl-4">
								<li>30s query timeout</li>
								<li>Blocks DROP DATABASE and superuser commands</li>
								<li>Stores up to 50 recent queries per sandbox</li>
							</ul>
						</div>

						<div className="space-y-2">
							<p className="text-sm font-medium">Recent Queries</p>
							{historyItems.map((item) => (
								<div key={item.id} className="rounded-md border p-2">
									<p className="line-clamp-1 text-xs font-mono">{item.query}</p>
									<p className="mt-1 text-[11px] text-muted-foreground">
										{item.status.toUpperCase()} · {item.execution} · {item.time}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
