import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	BotIcon,
	DatabaseIcon,
	LayoutTemplateIcon,
	Loader2Icon,
	ShieldCheckIcon,
	SparklesIcon,
	TerminalSquareIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "#/components/confirmation-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Progress } from "#/components/ui/progress";
import { useSandboxes } from "#/lib/hooks/useSandboxes";
import { useWorkspaceStats } from "#/lib/hooks/useUserSettings";
import type { AiGenerateResult } from "#/lib/types";
import { $aiExecute, $aiGenerate } from "#/modules/console/serverFn";

export const Route = createFileRoute("/_app/dashboard/ai-seeder")({
	head: () => ({ meta: [{ title: "AI Seeder — PisangDB" }] }),
	component: AiSeederPage,
});

type Mode = "schema" | "seed" | "helper";

type CachedAiResult = {
	cachedAt: string;
	engine: string;
	mode: Mode;
	prompt: string;
	result: AiGenerateResult;
	sandboxId: string;
};

const AI_SEEDER_CACHE_KEY = "pisangdb.ai-seeder.cache.v1";

const modeConfig: {
	key: Mode;
	title: string;
	description: string;
}[] = [
	{
		key: "schema",
		title: "Schema Generator",
		description: "Generate CREATE TABLE statements",
	},
	{
		key: "seed",
		title: "Data Seeder",
		description: "Generate realistic INSERT statements",
	},
	{
		key: "helper",
		title: "Query Helper",
		description: "Ask for SQL query suggestions",
	},
];

function getGenerationStatus(elapsedSeconds: number) {
	if (elapsedSeconds < 3) {
		return {
			detail: "Preparing your prompt and contacting the AI model.",
			label: "Starting generation",
			progress: 18,
		};
	}

	if (elapsedSeconds < 10) {
		return {
			detail: "Drafting SQL for the selected engine and sandbox.",
			label: "Generating SQL",
			progress: 52,
		};
	}

	if (elapsedSeconds < 20) {
		return {
			detail: "Parsing the response and extracting executable SQL.",
			label: "Reviewing the output",
			progress: 78,
		};
	}

	return {
		detail:
			"This prompt is taking longer than usual. Keep the tab open while generation finishes.",
		label: "Still working",
		progress: 90,
	};
}

function getPromptComplexity(mode: Mode, prompt: string) {
	const promptLength = prompt.trim().length;

	if (mode === "helper") {
		if (promptLength > 220) {
			return {
				label: "Long helper request",
				tone: "warning" as const,
				value: "Usually slower than a normal query hint",
			};
		}

		return {
			label: "Light request",
			tone: "neutral" as const,
			value: "Usually returns fastest",
		};
	}

	if (mode === "schema") {
		if (promptLength > 180) {
			return {
				label: "Large schema request",
				tone: "warning" as const,
				value: "May take longer and return more SQL",
			};
		}

		return {
			label: "Standard schema request",
			tone: "neutral" as const,
			value: "Expected wait is moderate",
		};
	}

	if (promptLength > 180) {
		return {
			label: "Large seed request",
			tone: "warning" as const,
			value: "May take longer because of output volume",
		};
	}

	return {
		label: "Standard seed request",
		tone: "neutral" as const,
		value: "Expected wait is moderate",
	};
}

function readAiSeederCache(): CachedAiResult[] {
	if (typeof window === "undefined") {
		return [];
	}

	try {
		const raw = window.sessionStorage.getItem(AI_SEEDER_CACHE_KEY);
		if (!raw) {
			return [];
		}

		const parsed = JSON.parse(raw) as CachedAiResult[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function writeAiSeederCache(entries: CachedAiResult[]) {
	if (typeof window === "undefined") {
		return;
	}

	window.sessionStorage.setItem(
		AI_SEEDER_CACHE_KEY,
		JSON.stringify(entries.slice(0, 12)),
	);
}

function buildAiSeederCacheKey(params: {
	mode: Mode;
	prompt: string;
	sandboxId: string;
}) {
	return `${params.sandboxId}::${params.mode}::${params.prompt.trim()}`;
}

function isIncompleteAiResponseError(message: string | null | undefined) {
	if (!message) {
		return false;
	}

	const normalized = message.toLowerCase();
	return (
		normalized.includes("truncated") ||
		normalized.includes("incomplete") ||
		normalized.includes("malformed") ||
		normalized.includes("not closed with a semicolon")
	);
}

function AiSeederPage() {
	const queryClient = useQueryClient();
	const { data: sandboxes, isLoading: sandboxesLoading } = useSandboxes();
	const { data: workspaceStats } = useWorkspaceStats();
	const activeSandboxes = (sandboxes ?? []).filter(
		(sandbox) => sandbox.status === "active",
	);
	const [selectedSandbox, setSelectedSandbox] = useState("");
	const [mode, setMode] = useState<Mode>("schema");
	const [prompt, setPrompt] = useState("");
	const [generated, setGenerated] = useState<AiGenerateResult | null>(null);
	const [sqlText, setSqlText] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [confirmExecute, setConfirmExecute] = useState(false);
	const [isExecuting, setIsExecuting] = useState(false);
	const [generateError, setGenerateError] = useState<string | null>(null);
	const [executeError, setExecuteError] = useState<string | null>(null);
	const [generationElapsed, setGenerationElapsed] = useState(0);
	const [loadedFromCache, setLoadedFromCache] = useState(false);
	const [cachedEntries, setCachedEntries] = useState<CachedAiResult[]>([]);
	const selectedSandboxDetails = activeSandboxes.find(
		(sandbox) => sandbox.id === selectedSandbox,
	);
	const promptIdeas =
		mode === "schema"
			? [
					"Build a SaaS billing schema with plans, subscriptions, invoices, and payments.",
					"Design tables for a school system with students, classes, teachers, and attendance.",
					"Create marketplace tables with products, carts, orders, and shipment events.",
				]
			: mode === "seed"
				? [
						"Generate 25 realistic Indonesian customers with phone numbers and city names.",
						"Seed products with categories, prices, stock counts, and short descriptions.",
						"Create monthly order history with mixed statuses and believable totals.",
					]
				: [
						"Write a query to find top customers by total revenue in the last 30 days.",
						"Show how to join users, orders, and payments with a failed-payment filter.",
						"Suggest a query to detect products with low stock and high recent sales.",
					];
	const generationStatus = getGenerationStatus(generationElapsed);
	const promptComplexity = getPromptComplexity(mode, prompt);
	const recentPrompts = cachedEntries.filter((entry) => {
		if (selectedSandbox && entry.sandboxId !== selectedSandbox) {
			return false;
		}

		return entry.mode === mode;
	});

	useEffect(() => {
		setCachedEntries(readAiSeederCache());
	}, []);

	useEffect(() => {
		if (!isGenerating) {
			setGenerationElapsed(0);
			return;
		}

		setGenerationElapsed(0);
		const startedAt = Date.now();
		const interval = window.setInterval(() => {
			setGenerationElapsed(
				Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
			);
		}, 1000);

		return () => window.clearInterval(interval);
	}, [isGenerating]);

	const handleGenerate = async (options?: { forceFresh?: boolean }) => {
		if (!selectedSandbox) {
			toast.error("Please select a sandbox first");
			return;
		}
		if (!prompt.trim()) {
			toast.error("Please enter a prompt");
			return;
		}

		setIsGenerating(true);
		setGenerateError(null);
		setExecuteError(null);
		setLoadedFromCache(false);
		try {
			const selected = sandboxes?.find((s) => s.id === selectedSandbox);
			if (selected?.status !== "active") {
				throw new Error("Selected sandbox is not active");
			}
			const engine = selected?.engine ?? "postgresql";
			const cacheKey = buildAiSeederCacheKey({
				sandboxId: selectedSandbox,
				mode,
				prompt,
			});
			const cachedEntry = cachedEntries.find(
				(entry) =>
					buildAiSeederCacheKey({
						sandboxId: entry.sandboxId,
						mode: entry.mode,
						prompt: entry.prompt,
					}) === cacheKey,
			);

			if (cachedEntry && !options?.forceFresh) {
				setGenerated(cachedEntry.result);
				setSqlText(cachedEntry.result.sqlGenerated);
				setLoadedFromCache(true);
				setGenerateError(null);
				toast.success("Loaded cached SQL for the same prompt");
				return;
			}

			const result = await $aiGenerate({
				data: { sandboxId: selectedSandbox, prompt, engine, mode },
			});
			setGenerated(result);
			setSqlText(result.sqlGenerated);
			setGenerateError(null);
			const nextCacheEntries = [
				{
					cachedAt: new Date().toISOString(),
					engine,
					mode,
					prompt,
					result,
					sandboxId: selectedSandbox,
				},
				...cachedEntries.filter(
					(entry) =>
						buildAiSeederCacheKey({
							sandboxId: entry.sandboxId,
							mode: entry.mode,
							prompt: entry.prompt,
						}) !== cacheKey,
				),
			];
			writeAiSeederCache(nextCacheEntries);
			setCachedEntries(nextCacheEntries.slice(0, 12));
			await queryClient.invalidateQueries({ queryKey: ["workspace-stats"] });
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to generate SQL";
			setGenerated(null);
			setSqlText("");
			setGenerateError(message);
			toast.error(message);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleExecute = async () => {
		if (!generated) return;
		setConfirmExecute(false);
		setIsExecuting(true);
		setExecuteError(null);
		try {
			await $aiExecute({
				data: {
					sandboxId: selectedSandbox,
					logId: generated.logId,
					sql: sqlText,
				},
			});
			toast.success("SQL executed successfully!");
			setGenerated(null);
			setSqlText("");
			setIsEditing(false);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Execution failed";
			setExecuteError(message);
			toast.error(message);
		} finally {
			setIsExecuting(false);
		}
	};

	return (
		<div className="flex flex-col gap-4 p-4 md:p-5">
			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="overflow-hidden border-border/80 lg:col-span-2">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="space-y-1">
								<CardTitle className="text-base">Prompt Workspace</CardTitle>
								<CardDescription>
									Select a target, choose a generation mode, then refine the SQL
									before execution.
								</CardDescription>
							</div>
							<div className="flex flex-wrap gap-2">
								<Badge
									variant="outline"
									className="gap-1.5 rounded-full px-3 py-1"
								>
									<DatabaseIcon className="size-3.5" />
									Active Targets: {activeSandboxes.length}
								</Badge>
								<Badge
									variant="outline"
									className="gap-1.5 rounded-full px-3 py-1"
								>
									<ActivityIcon className="size-3.5" />
									{workspaceStats
										? `${workspaceStats.aiRequestsThisMonth}/${workspaceStats.maxAiRequestsPerMonth} this month`
										: "Loading AI usage…"}
								</Badge>
								<Badge
									variant="outline"
									className="gap-1.5 rounded-full px-3 py-1"
								>
									<LayoutTemplateIcon className="size-3.5" />
									{modeConfig.find((item) => item.key === mode)?.title}
								</Badge>
								{selectedSandboxDetails && (
									<Badge
										variant="secondary"
										className="gap-1 rounded-full px-3 py-1"
									>
										<DatabaseIcon className="size-3.5" />
										{selectedSandboxDetails.displayName} ·{" "}
										{selectedSandboxDetails.engine}
									</Badge>
								)}
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-1.5">
							<label htmlFor="ai-sandbox" className="text-sm font-medium">
								Target Sandbox
							</label>
							<select
								id="ai-sandbox"
								value={selectedSandbox}
								onChange={(e) => setSelectedSandbox(e.target.value)}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
								disabled={sandboxesLoading || isGenerating}
							>
								<option value="">Select a sandbox…</option>
								{activeSandboxes.map((sandbox) => (
									<option key={sandbox.id} value={sandbox.id}>
										{sandbox.displayName} ({sandbox.engine})
									</option>
								))}
							</select>
							{!sandboxesLoading && activeSandboxes.length === 0 && (
								<p className="text-xs text-muted-foreground">
									No active sandboxes found.{" "}
									<Link to="/dashboard/sandboxes" className="underline">
										Create one
									</Link>{" "}
									to start generating SQL.
								</p>
							)}
						</div>
						<div className="grid gap-2 sm:grid-cols-3">
							{modeConfig.map((item) => (
								<button
									key={item.key}
									type="button"
									onClick={() => setMode(item.key)}
									disabled={isGenerating}
									className={`rounded-lg border p-3 text-left transition-colors ${
										mode === item.key
											? "border-primary bg-primary/5"
											: "hover:bg-muted/40"
									}`}
								>
									<p className="text-sm font-medium">{item.title}</p>
									<p className="text-xs text-muted-foreground">
										{item.description}
									</p>
								</button>
							))}
						</div>

						<div className="rounded-xl border bg-muted/20 p-4">
							<div className="flex items-center gap-2 text-foreground">
								<SparklesIcon className="size-4 text-primary" />
								<p className="text-sm font-medium">Prompt Ideas</p>
							</div>
							<p className="mt-1 text-xs text-muted-foreground">
								Click any idea to load it into the prompt editor.
							</p>
							<div className="mt-3 grid gap-2">
								{promptIdeas.map((idea) => (
									<button
										key={idea}
										type="button"
										onClick={() => setPrompt(idea)}
										disabled={isGenerating}
										className="rounded-lg border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
									>
										{idea}
									</button>
								))}
							</div>
						</div>

						<textarea
							value={prompt}
							onChange={(event) => setPrompt(event.target.value)}
							disabled={isGenerating}
							placeholder={
								mode === "schema"
									? "e.g. Create users, products, and orders tables for a simple e-commerce app."
									: mode === "seed"
										? "e.g. Generate 20 employee records with realistic Indonesian names."
										: "e.g. How do I JOIN orders with users?"
							}
							className="min-h-36 w-full rounded-md border bg-muted/30 p-3 text-sm"
						/>
						<div className="flex flex-wrap items-center gap-2 text-xs">
							<Badge
								variant={
									promptComplexity.tone === "warning" ? "secondary" : "outline"
								}
								className="rounded-full px-3 py-1"
							>
								{promptComplexity.label}
							</Badge>
							<span className="text-muted-foreground">
								{promptComplexity.value}
							</span>
						</div>

						{recentPrompts.length > 0 && (
							<div className="rounded-xl border bg-muted/10 p-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-medium text-foreground">
											Recent Prompts
										</p>
										<p className="text-xs text-muted-foreground">
											Reuse a recent prompt for this mode
											{selectedSandbox ? " and sandbox" : ""}.
										</p>
									</div>
									<Badge variant="outline" className="rounded-full px-3 py-1">
										{recentPrompts.length} cached
									</Badge>
								</div>
								<div className="mt-3 grid gap-2">
									{recentPrompts.slice(0, 4).map((entry) => (
										<button
											key={`${entry.sandboxId}-${entry.mode}-${entry.cachedAt}`}
											type="button"
											onClick={() => {
												setSelectedSandbox(entry.sandboxId);
												setMode(entry.mode);
												setPrompt(entry.prompt);
											}}
											disabled={isGenerating}
											className="rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
										>
											<div className="flex flex-wrap items-center gap-2">
												<Badge
													variant={
														getPromptComplexity(entry.mode, entry.prompt)
															.tone === "warning"
															? "secondary"
															: "outline"
													}
													className="rounded-full px-2 py-0.5 text-[10px]"
												>
													{getPromptComplexity(entry.mode, entry.prompt).label}
												</Badge>
											</div>
											<p className="line-clamp-2 text-xs text-foreground">
												{entry.prompt}
											</p>
											<p className="mt-1 text-[11px] text-muted-foreground">
												{entry.engine} • cached{" "}
												{new Date(entry.cachedAt).toLocaleTimeString("en-US", {
													hour: "numeric",
													minute: "2-digit",
												})}
											</p>
										</button>
									))}
								</div>
							</div>
						)}

						{isGenerating && (
							<div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="space-y-1">
										<div className="flex items-center gap-2 text-sm font-medium text-foreground">
											<Loader2Icon className="size-4 animate-spin text-primary" />
											{generationStatus.label}
										</div>
										<p className="text-xs text-muted-foreground">
											{generationStatus.detail}
										</p>
									</div>
									<div className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
										{generationElapsed}s elapsed
									</div>
								</div>
								<Progress
									value={generationStatus.progress}
									className="mt-4 h-2 bg-primary/10"
									indicatorClassName="bg-primary"
								/>
								<div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
									<Badge variant="outline" className="rounded-full px-3 py-1">
										{selectedSandboxDetails
											? `${selectedSandboxDetails.displayName} (${selectedSandboxDetails.engine})`
											: "Sandbox selected"}
									</Badge>
									<Badge variant="outline" className="rounded-full px-3 py-1">
										Expected wait: 15-60s
									</Badge>
								</div>
							</div>
						)}

						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<Button
									size="sm"
									className="gap-1.5"
									onClick={() => {
										void handleGenerate();
									}}
									disabled={
										isGenerating ||
										sandboxesLoading ||
										activeSandboxes.length === 0
									}
								>
									{isGenerating ? (
										<Loader2Icon className="size-4 animate-spin" />
									) : (
										<SparklesIcon className="size-4" />
									)}
									{isGenerating ? "Generating…" : "Generate SQL"}
								</Button>
								<Badge variant="outline" className="rounded-full px-3 py-1">
									Review before execute
								</Badge>
							</div>
							<Badge variant="outline" className="rounded-full px-3 py-1">
								{workspaceStats
									? `${workspaceStats.aiRequestsThisMonth}/${workspaceStats.maxAiRequestsPerMonth} requests this month`
									: "Loading AI usage…"}
							</Badge>
						</div>

						{generated ? (
							<div className="space-y-3 rounded-xl border bg-muted/10 p-4">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<div className="flex flex-wrap items-center gap-2">
											<p className="text-sm font-medium">Generated SQL</p>
											{loadedFromCache && (
												<Badge
													variant="outline"
													className="rounded-full px-2.5 py-0.5 text-[11px]"
												>
													Loaded from cache
												</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground">
											Inspect the statement, adjust it if needed, then run it
											against the selected sandbox.
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setIsEditing((v) => !v)}
									>
										{isEditing ? "View Only" : "Edit Before Execute"}
									</Button>
								</div>
								{loadedFromCache && (
									<div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
										<span>This result came from local cache.</span>
										<Button
											size="sm"
											variant="outline"
											className="h-7"
											onClick={() => {
												void handleGenerate({ forceFresh: true });
											}}
											disabled={isGenerating}
										>
											Generate Fresh
										</Button>
									</div>
								)}
								{isEditing ? (
									<textarea
										value={sqlText}
										onChange={(e) => setSqlText(e.target.value)}
										className="min-h-32 w-full rounded-md bg-muted p-3 font-mono text-xs"
									/>
								) : (
									<pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
										<code>{sqlText}</code>
									</pre>
								)}
								{executeError && (
									<p className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
										{executeError}
									</p>
								)}
								<div className="flex items-center gap-2">
									<Button
										size="sm"
										onClick={() => setConfirmExecute(true)}
										disabled={isExecuting}
									>
										{isExecuting ? "Executing…" : "Execute SQL"}
									</Button>
								</div>
							</div>
						) : generateError ? (
							<div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
								<div className="flex flex-wrap items-center gap-2">
									<p className="font-medium">
										{isIncompleteAiResponseError(generateError)
											? "Incomplete response detected"
											: "Generation failed"}
									</p>
									{isIncompleteAiResponseError(generateError) && (
										<Badge
											variant="outline"
											className="rounded-full border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] text-amber-900 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100"
										>
											Retry recommended
										</Badge>
									)}
								</div>
								<p>{generateError}</p>
								{isIncompleteAiResponseError(generateError) && (
									<p className="text-xs text-amber-800/80 dark:text-amber-200/80">
										The model likely stopped before finishing the SQL. Generate
										a fresh response or shorten the prompt slightly.
									</p>
								)}
								<div className="flex flex-wrap items-center gap-2">
									<Button
										size="sm"
										onClick={() => {
											void handleGenerate({ forceFresh: true });
										}}
										disabled={isGenerating}
									>
										Generate Fresh
									</Button>
								</div>
							</div>
						) : (
							<div className="rounded-xl border border-dashed bg-muted/10 p-5 text-sm text-muted-foreground">
								<p className="font-medium text-foreground">
									No SQL generated yet
								</p>
								<p className="mt-1">
									Start with a target sandbox and a concrete prompt. The output
									will appear here with an edit step before execution.
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="border-border/80">
					<CardHeader>
						<CardTitle className="text-base">AI Guardrails</CardTitle>
						<CardDescription>
							Built to generate cleaner SQL, sharper prompts, and safer
							execution boundaries.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm text-muted-foreground">
						<div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-muted p-4">
							<div className="flex items-start gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
									<BotIcon className="size-5" />
								</div>
								<div className="space-y-2">
									<p className="font-medium text-foreground">
										Engine-aware generation tuned for your selected sandbox
									</p>
									<div className="flex flex-wrap gap-2">
										<Badge variant="secondary" className="gap-1">
											<TerminalSquareIcon className="size-3" />
											SQL-first
										</Badge>
										<Badge variant="secondary" className="gap-1">
											<ShieldCheckIcon className="size-3" />
											Manual review before execute
										</Badge>
									</div>
								</div>
							</div>
						</div>

						<div className="grid gap-3">
							<div className="rounded-lg border bg-muted/30 p-3">
								<p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground/80">
									What It Enforces
								</p>
								<ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
									<li>
										Understands PostgreSQL, MySQL, and MariaDB syntax
										differences
									</li>
									<li>
										Reads the selected sandbox schema before generation and
										stores prompts plus SQL in the activity log
									</li>
									<li>
										Potentially risky SQL still requires your manual approval
									</li>
								</ul>
							</div>

							<div className="rounded-lg border p-3">
								<div className="flex items-center gap-2 text-foreground">
									<SparklesIcon className="size-4 text-primary" />
									<p className="text-sm font-medium">Prompt Tips</p>
								</div>
								<div className="mt-3 space-y-2 text-xs">
									<div className="rounded-md bg-muted/40 p-2.5">
										<p className="font-medium text-foreground">Mention shape</p>
										<p className="mt-1">
											State table names, key columns, and relationships you
											expect.
										</p>
									</div>
									<div className="rounded-md bg-muted/40 p-2.5">
										<p className="font-medium text-foreground">
											Specify constraints
										</p>
										<p className="mt-1">
											Include uniqueness, foreign keys, nullable fields, and
											default values.
										</p>
									</div>
									<div className="rounded-md bg-muted/40 p-2.5">
										<p className="font-medium text-foreground">
											Set data volume
										</p>
										<p className="mt-1">
											Say whether you want 10 rows, 100 rows, or only starter
											seed data.
										</p>
									</div>
								</div>
							</div>

							<div className="rounded-lg bg-muted p-3 text-xs">
								<p className="font-medium text-foreground">
									Example Prompt Formula
								</p>
								<p className="mt-2 font-mono leading-5 text-muted-foreground">
									Create tables for users, products, and orders. Use UUID
									primary keys, add foreign keys, keep price columns numeric,
									and generate 25 realistic seed rows for each core table.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<ConfirmationDialog
				open={confirmExecute}
				onOpenChange={setConfirmExecute}
				title="Execute SQL?"
				description="This will run the SQL against your selected sandbox. This action cannot be undone."
				confirmText="Execute"
				cancelText="Cancel"
				onConfirm={handleExecute}
				isLoading={isExecuting}
			/>
		</div>
	);
}
