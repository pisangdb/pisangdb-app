import { createFileRoute } from "@tanstack/react-router";
import { Loader2Icon, PlayIcon, ShieldIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useExecuteQuery, useQueryHistory } from "#/hooks/use-execute-query";
import { useSandboxes } from "#/hooks/use-sandboxes";

export const Route = createFileRoute("/_app/dashboard/console")({
	head: () => ({ meta: [{ title: "SQL Console — PisangDB" }] }),
	component: SqlConsolePage,
});

const defaultQuery = `SELECT id, name, email
FROM users
ORDER BY created_at DESC
LIMIT 5;`;

function SqlConsolePage() {
	const [selectedSandboxId, setSelectedSandboxId] = useState<string>("");
	const [query, setQuery] = useState(defaultQuery);
	const [result, setResult] = useState<{
		rows: Array<Record<string, unknown>>;
		rowCount: number;
		executionTimeMs: number;
	} | null>(null);

	const { data: sandboxesData, isLoading: sandboxesLoading } = useSandboxes();

	const sandboxOptions = useMemo(() => {
		const sandboxes = sandboxesData?.sandboxes ?? [];
		return sandboxes
			.filter((s) => s.status === "active")
			.map((s) => ({
				id: s.id,
				label: `${s.displayName} (${s.engine})`,
			}));
	}, [sandboxesData]);

	const executeQueryMutation = useExecuteQuery(selectedSandboxId);

	const { data: historyData, isLoading: historyLoading } =
		useQueryHistory(selectedSandboxId);

	const handleRun = useCallback(async () => {
		if (!selectedSandboxId) {
			toast.error("Please select a sandbox first");
			return;
		}
		if (!query.trim()) {
			toast.error("Please enter a query");
			return;
		}

		try {
			const result = await executeQueryMutation.mutateAsync(query);
			setResult(result);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Query failed");
		}
	}, [selectedSandboxId, query, executeQueryMutation]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
				e.preventDefault();
				handleRun();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleRun]);

	const historyItems = useMemo(() => {
		const history = historyData ?? [];
		return history.slice(0, 10).map((item) => ({
			id: item.id,
			query: item.query,
			status: item.status,
			execution: `${item.executionTimeMs} ms`,
			time: new Date(item.createdAt).toLocaleTimeString(),
		}));
	}, [historyData]);

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
								onChange={(event) => setSelectedSandboxId(event.target.value)}
								disabled={sandboxesLoading}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
							>
								<option value="" disabled>
									{sandboxesLoading ? "Loading..." : "Select a sandbox"}
								</option>
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
							placeholder="Enter your SQL query here..."
							className="min-h-48 w-full rounded-md border bg-muted/30 p-3 font-mono text-sm"
						/>

						<div className="flex flex-wrap items-center gap-2">
							<Button
								size="sm"
								className="gap-1.5"
								onClick={handleRun}
								disabled={executeQueryMutation.isPending || !selectedSandboxId}
							>
								{executeQueryMutation.isPending ? (
									<>
										<Loader2Icon className="size-4 animate-spin" />
										Running…
									</>
								) : (
									<>
										<PlayIcon className="size-4" />
										Run Query
									</>
								)}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => {
									setQuery("");
									setResult(null);
								}}
							>
								<Trash2Icon className="size-4" />
								Clear
							</Button>
							<Badge variant="outline">Ctrl + Enter</Badge>
						</div>

						{result ? (
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span>{result.rowCount} rows</span>
									<span>·</span>
									<span>{result.executionTimeMs}ms</span>
								</div>
								{result.rows && result.rows.length > 0 ? (
									<div className="overflow-x-auto rounded-md border">
										<table className="w-full min-w-96 text-sm">
											<thead className="bg-muted/50 text-left">
												<tr>
													{Object.keys(result.rows[0] ?? {}).map((key) => (
														<th key={key} className="px-3 py-2 font-medium">
															{key}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{result.rows.map((row) => (
													<tr key={JSON.stringify(row)} className="border-t">
														{Object.entries(row).map(([key, value]) => (
															<td
																key={key}
																className="px-3 py-2 font-mono text-xs"
															>
																{String(value ?? "NULL")}
															</td>
														))}
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
										Query returned no results.
									</div>
								)}
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
							{historyLoading ? (
								<div className="text-xs text-muted-foreground">Loading...</div>
							) : historyItems.length > 0 ? (
								historyItems.map((item) => (
									<div key={item.id} className="rounded-md border p-2">
										<p className="line-clamp-1 text-xs font-mono">
											{item.query}
										</p>
										<p className="mt-1 text-[11px] text-muted-foreground">
											<span
												className={
													item.status === "success"
														? "text-green-600"
														: "text-red-600"
												}
											>
												{item.status.toUpperCase()}
											</span>{" "}
											· {item.execution} · {item.time}
										</p>
									</div>
								))
							) : (
								<div className="text-xs text-muted-foreground">
									{selectedSandboxId
										? "No queries yet"
										: "Select a sandbox to view history"}
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
