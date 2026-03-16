import { createFileRoute } from "@tanstack/react-router";
import { PlayIcon, ShieldIcon, Trash2Icon } from "lucide-react";
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
import type {
	QueryHistoryItem,
	QueryResult,
	SandboxListItem,
} from "#/lib/types";
import { $executeQuery, $getQueryHistory } from "#/modules/console/serverFn";
import { $getSandboxes } from "#/modules/sandboxes/serverFn";

export const Route = createFileRoute("/_app/dashboard/console")({
	loader: async () => {
		const sandboxes = await $getSandboxes();
		return { sandboxes };
	},
	head: () => ({ meta: [{ title: "SQL Console — PisangDB" }] }),
	component: SqlConsolePage,
});

const ENGINE_LABELS: Record<string, string> = {
	postgresql: "PostgreSQL",
	mysql: "MySQL",
	mariadb: "MariaDB",
};

function SqlConsolePage() {
	const { sandboxes } = Route.useLoaderData();
	const [selectedSandboxId, setSelectedSandboxId] = useState<string>("");
	const [query, setQuery] = useState("SELECT 1 as test;");
	const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
	const [queryError, setQueryError] = useState<string | null>(null);
	const [history, setHistory] = useState<QueryHistoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const activeSandboxes = sandboxes.filter(
		(s: SandboxListItem) => s.status === "active",
	) as SandboxListItem[];

	const handleSandboxChange = async (sandboxId: string) => {
		setSelectedSandboxId(sandboxId);
		setQueryResult(null);
		setQueryError(null);

		if (sandboxId) {
			try {
				const historyData = await $getQueryHistory({ data: { sandboxId } });
				setHistory(historyData);
			} catch {
				setHistory([]);
			}
		} else {
			setHistory([]);
		}
	};

	const handleRun = async () => {
		if (!selectedSandboxId || !query.trim()) return;

		setIsLoading(true);
		setQueryResult(null);
		setQueryError(null);

		try {
			const result = await $executeQuery({
				data: {
					sandboxId: selectedSandboxId,
					query,
				},
			});
			setQueryResult(result);

			const historyData = await $getQueryHistory({
				data: { sandboxId: selectedSandboxId },
			});
			setHistory(historyData);
		} catch (error) {
			setQueryError(error instanceof Error ? error.message : "Query failed");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClear = () => {
		setQuery("");
		setQueryResult(null);
		setQueryError(null);
	};

	const handleHistoryClick = (q: string) => {
		setQuery(q);
	};

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
								value={selectedSandboxId}
								onChange={(event) => {
									handleSandboxChange(event.target.value);
								}}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
							>
								<option value="">Select a sandbox</option>
								{activeSandboxes.map((sandbox) => (
									<option key={sandbox.id} value={sandbox.id}>
										{sandbox.displayName} ({ENGINE_LABELS[sandbox.engine]})
									</option>
								))}
							</select>
						</div>

						<textarea
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter" && event.ctrlKey) {
									handleRun();
								}
							}}
							placeholder="SELECT * FROM users LIMIT 10;"
							className="min-h-48 w-full rounded-md border bg-muted/30 p-3 font-mono text-sm"
						/>

						<div className="flex flex-wrap items-center gap-2">
							<Button
								size="sm"
								className="gap-1.5"
								onClick={handleRun}
								disabled={!selectedSandboxId || !query.trim() || isLoading}
							>
								<PlayIcon className="size-4" />
								{isLoading ? "Running…" : "Run Query"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={handleClear}
							>
								<Trash2Icon className="size-4" />
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
												<tr key={JSON.stringify(row)} className="border-t">
													{queryResult.columns.map((col) => (
														<td
															key={col}
															className="px-3 py-2 font-mono text-xs"
														>
															{row[col] === null ? (
																<span className="text-muted-foreground">
																	NULL
																</span>
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
								Select a sandbox and run a query to see results here.
							</div>
						) : null}
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
							{history.length > 0 ? (
								history.slice(0, 5).map((item) => (
									<button
										key={item.id}
										type="button"
										className="w-full cursor-pointer rounded-md border p-2 text-left hover:bg-muted/50"
										onClick={() => handleHistoryClick(item.query)}
									>
										<p className="line-clamp-1 text-xs font-mono">
											{item.query}
										</p>
										<p className="mt-1 text-[11px] text-muted-foreground">
											{item.status.toUpperCase()} • {item.executionTimeMs}ms •{" "}
											{new Date(item.createdAt).toLocaleTimeString()}
										</p>
									</button>
								))
							) : (
								<p className="text-xs text-muted-foreground">
									No query history yet.
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
