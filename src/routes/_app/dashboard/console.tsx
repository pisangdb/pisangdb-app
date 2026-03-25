import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ActivityIcon,
	Clock3Icon,
	DatabaseIcon,
	PlayIcon,
	ShieldIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useSandboxes } from "#/lib/hooks/useSandboxes";
import type { QueryResult, SandboxListItem } from "#/lib/types";
import { $executeQuery, $getQueryHistory } from "#/modules/console/serverFn";

export const Route = createFileRoute("/_app/dashboard/console")({
	head: () => ({ meta: [{ title: "SQL Console — PisangDB" }] }),
	component: SqlConsolePage,
});

const ENGINE_LABELS: Record<string, string> = {
	postgresql: "PostgreSQL",
	mysql: "MySQL",
	mariadb: "MariaDB",
};

const LAST_SANDBOX_STORAGE_KEY = "pisangdb-console-last-sandbox";
const QUERY_DRAFT_PREFIX = "pisangdb-console-draft:";

function getDraftStorageKey(sandboxId: string) {
	return `${QUERY_DRAFT_PREFIX}${sandboxId}`;
}

function SqlConsolePage() {
	const { data: sandboxes = [], isPending: sandboxesLoading } = useSandboxes();
	const [selectedSandboxId, setSelectedSandboxId] = useState<string>("");
	const [historyQueryId, setHistoryQueryId] = useState<string>("");
	const [resetKey, setResetKey] = useState(0);
	const [selectedEngine, setSelectedEngine] = useState<
		"postgresql" | "mysql" | "mariadb"
	>("postgresql");
	const [query, setQuery] = useState("SELECT 1 as test;");
	const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
	const [queryError, setQueryError] = useState<string | null>(null);
	const [history, setHistory] = useState<
		Array<{
			id: string;
			query: string;
			status: string;
			executionTimeMs: number | null;
			rowsAffected: number | null;
			errorMessage: string | null;
			createdAt: string;
		}>
	>([]);
	const [isLoading, setIsLoading] = useState(false);
	const queryClient = useQueryClient();
	const shortcutLabel = useMemo(() => {
		if (typeof navigator === "undefined") return "Ctrl + Enter";
		return navigator.platform?.includes("Mac") ? "⌘ + Enter" : "Ctrl + Enter";
	}, []);

	const activeSandboxes = (sandboxes ?? []).filter(
		(s: SandboxListItem) => s.status === "active",
	) as SandboxListItem[];
	const selectedSandbox = activeSandboxes.find(
		(sandbox) => sandbox.id === selectedSandboxId,
	);
	const recentHistory = history.slice(0, 5);
	const heroStats = [
		{
			label: "Active Sandboxes",
			value: String(activeSandboxes.length),
			icon: <DatabaseIcon className="size-4" />,
		},
		{
			label: "Selected Engine",
			value: selectedSandbox
				? ENGINE_LABELS[selectedSandbox.engine]
				: "Choose sandbox",
			icon: <ActivityIcon className="size-4" />,
		},
		{
			label: "Recent Queries",
			value: String(recentHistory.length),
			icon: <Clock3Icon className="size-4" />,
		},
	];

	const fetchHistory = useCallback(async (sandboxId: string) => {
		try {
			const data = await $getQueryHistory({ data: { sandboxId } });
			setHistory(data);
		} catch {
			setHistory([]);
		}
	}, []);

	const handleSandboxChange = useCallback(
		async (sandboxId: string) => {
			setSelectedSandboxId(sandboxId);
			setHistoryQueryId("");
			setResetKey((k) => k + 1);
			setQueryResult(null);
			setQueryError(null);

			if (sandboxId) {
				const sandbox = activeSandboxes.find((s) => s.id === sandboxId);
				setSelectedEngine(sandbox?.engine || "postgresql");
				if (typeof window !== "undefined") {
					const savedDraft = window.sessionStorage.getItem(
						getDraftStorageKey(sandboxId),
					);
					setQuery(savedDraft || "SELECT 1 as test;");
					window.sessionStorage.setItem(LAST_SANDBOX_STORAGE_KEY, sandboxId);
				} else {
					setQuery("SELECT 1 as test;");
				}
				await fetchHistory(sandboxId);
			} else {
				setHistory([]);
			}
		},
		[activeSandboxes, fetchHistory],
	);

	const handleRun = useCallback(async () => {
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
			await fetchHistory(selectedSandboxId);

			await queryClient.invalidateQueries({ queryKey: ["sandboxes"] });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Query failed";
			setQueryError(errorMessage);
			await fetchHistory(selectedSandboxId);
		} finally {
			setIsLoading(false);
		}
	}, [fetchHistory, query, queryClient, selectedSandboxId]);

	const handleClear = () => {
		setHistoryQueryId("");
		setQuery("");
		setQueryResult(null);
		setQueryError(null);
		setResetKey((k) => k + 1);
		if (typeof window !== "undefined" && selectedSandboxId) {
			window.sessionStorage.removeItem(getDraftStorageKey(selectedSandboxId));
		}
	};

	const handleHistoryClick = (q: string, id: string) => {
		setHistoryQueryId(id);
		setQuery(q);
	};

	const isSelectQuery = queryResult && queryResult.columns.length > 0;
	const isMutation =
		queryResult &&
		queryResult.columns.length === 0 &&
		queryResult.rowsAffected >= 0;
	const starterQueries = [
		"SELECT * FROM information_schema.tables LIMIT 10;",
		"SELECT NOW() AS current_time;",
		"SELECT COUNT(*) AS total_rows FROM information_schema.tables;",
	];

	useEffect(() => {
		if (typeof window === "undefined" || !selectedSandboxId) return;
		window.sessionStorage.setItem(getDraftStorageKey(selectedSandboxId), query);
	}, [query, selectedSandboxId]);

	useEffect(() => {
		if (
			typeof window === "undefined" ||
			selectedSandboxId ||
			activeSandboxes.length === 0
		) {
			return;
		}

		const storedSandboxId = window.sessionStorage.getItem(
			LAST_SANDBOX_STORAGE_KEY,
		);
		const nextSandboxId = activeSandboxes.some(
			(sandbox) => sandbox.id === storedSandboxId,
		)
			? (storedSandboxId ?? "")
			: (activeSandboxes[0]?.id ?? "");

		if (nextSandboxId) {
			void handleSandboxChange(nextSandboxId);
		}
	}, [activeSandboxes, handleSandboxChange, selectedSandboxId]);

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/60 p-5 md:p-6">
				<div className="flex flex-col gap-5">
					<div className="max-w-2xl">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Interactive SQL Console</Badge>
							<Badge variant="secondary">Sandbox-Safe Execution</Badge>
						</div>
						<h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
							Run live queries without leaving the dashboard
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Inspect schema, test queries, and review recent executions against
							your active sandboxes with built-in safety limits.
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-3">
						{heroStats.map((stat) => (
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
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">Query Editor</CardTitle>
						<CardDescription>
							Write and run SQL against a selected active sandbox.
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
									void handleSandboxChange(event.target.value);
								}}
								disabled={sandboxesLoading || undefined}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
							>
								<option value="">
									{sandboxesLoading ? "Loading..." : "Select a sandbox"}
								</option>
								{activeSandboxes.map((sandbox) => (
									<option key={sandbox.id} value={sandbox.id}>
										{sandbox.displayName} ({ENGINE_LABELS[sandbox.engine]})
									</option>
								))}
							</select>
						</div>

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
										{snippet.length > 38
											? `${snippet.slice(0, 38)}...`
											: snippet}
									</button>
								))}
							</div>
						</div>

						<SqlEditor
							key={`${selectedSandboxId}-${historyQueryId}-${resetKey}`}
							value={query}
							onChange={setQuery}
							onSubmit={handleRun}
							engine={selectedEngine}
							disabled={isLoading}
							placeholder="SELECT * FROM users LIMIT 10;"
							className="min-h-48"
						/>

						<div className="flex flex-wrap items-center gap-2">
							<Button
								size="sm"
								className="gap-1.5"
								onClick={() => void handleRun()}
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
							<Badge variant="outline">{shortcutLabel}</Badge>
						</div>

						{queryError && (
							<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
								{queryError}
							</div>
						)}

						{queryResult ? (
							<div className="overflow-x-auto rounded-md border">
								{isMutation ? (
									<>
										<div className="mb-2 flex items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
											<span>{queryResult.rowsAffected} row(s) affected</span>
											<span>•</span>
											<span>{queryResult.executionTimeMs} ms</span>
										</div>
										<div className="p-4 text-sm text-muted-foreground">
											Query executed successfully.
										</div>
									</>
								) : isSelectQuery ? (
									<>
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
													{queryResult.rows.map((row) => {
														const rowId = queryResult.columns
															.map((col) => String(row[col] ?? ""))
															.join("|");
														return (
															<tr key={rowId} className="border-t">
																{queryResult.columns.map((col) => {
																	const raw = row[col];
																	return (
																		<td
																			key={col}
																			className="px-3 py-2 font-mono text-xs"
																		>
																			{raw === null || raw === undefined ? (
																				<span className="text-muted-foreground">
																					NULL
																				</span>
																			) : (
																				String(raw)
																			)}
																		</td>
																	);
																})}
															</tr>
														);
													})}
												</tbody>
											</table>
										) : (
											<div className="p-4 text-sm text-muted-foreground">
												Query executed successfully. No rows returned.
											</div>
										)}
									</>
								) : (
									<>
										<div className="mb-2 flex items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
											<span>{queryResult.rowsAffected} row(s) affected</span>
											<span>•</span>
											<span>{queryResult.executionTimeMs} ms</span>
										</div>
										<div className="p-4 text-sm text-muted-foreground">
											Query executed successfully.
										</div>
									</>
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
							Query safeguards and recent executions for the selected sandbox.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
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
							{recentHistory.length > 0 ? (
								<div className="max-h-48 overflow-y-auto rounded-xl border pr-3">
									<div className="flex flex-col gap-2">
										{recentHistory.map((item) => (
											<button
												key={item.id}
												type="button"
												className="w-full cursor-pointer rounded-xl border bg-background p-2.5 text-left hover:bg-muted/50"
												onClick={() => handleHistoryClick(item.query, item.id)}
											>
												<p className="line-clamp-1 font-mono text-xs">
													{item.query}
												</p>
												<p className="mt-1 text-[11px] text-muted-foreground">
													{item.status.toUpperCase()} •{" "}
													{item.rowsAffected !== null
														? `${item.rowsAffected} affected`
														: `${item.executionTimeMs ?? 0}ms`}
													• {new Date(item.createdAt).toLocaleTimeString()}
												</p>
												{item.errorMessage ? (
													<p className="mt-2 line-clamp-2 text-[11px] text-destructive">
														{item.errorMessage}
													</p>
												) : null}
											</button>
										))}
									</div>
								</div>
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
