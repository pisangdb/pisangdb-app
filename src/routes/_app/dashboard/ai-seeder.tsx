import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	BotIcon,
	DatabaseIcon,
	LayoutTemplateIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TerminalSquareIcon,
} from "lucide-react";
import { useState } from "react";
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
import { useSandboxes } from "#/lib/hooks/useSandboxes";
import { useWorkspaceStats } from "#/lib/hooks/useUserSettings";
import type { AiGenerateResult } from "#/lib/types";
import { $aiExecute, $aiGenerate } from "#/modules/console/serverFn";

export const Route = createFileRoute("/_app/dashboard/ai-seeder")({
	head: () => ({ meta: [{ title: "AI Seeder — PisangDB" }] }),
	component: AiSeederPage,
});

type Mode = "schema" | "seed" | "helper";

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
	const [executeError, setExecuteError] = useState<string | null>(null);
	const selectedSandboxDetails = activeSandboxes.find(
		(sandbox) => sandbox.id === selectedSandbox,
	);
	const usageRatio = workspaceStats
		? Math.min(
				100,
				Math.round(
					(workspaceStats.aiRequestsToday /
						Math.max(workspaceStats.maxAiRequestsPerDay, 1)) *
						100,
				),
			)
		: 0;
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
	const handleGenerate = async () => {
		if (!selectedSandbox) {
			toast.error("Please select a sandbox first");
			return;
		}
		if (!prompt.trim()) {
			toast.error("Please enter a prompt");
			return;
		}

		setIsGenerating(true);
		setExecuteError(null);
		try {
			const selected = sandboxes?.find((s) => s.id === selectedSandbox);
			if (selected?.status !== "active") {
				throw new Error("Selected sandbox is not active");
			}
			const engine = selected?.engine ?? "postgresql";
			const result = await $aiGenerate({
				data: { sandboxId: selectedSandbox, prompt, engine },
			});
			setGenerated(result);
			setSqlText(result.sqlGenerated);
			await queryClient.invalidateQueries({ queryKey: ["workspace-stats"] });
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to generate SQL";
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
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/60">
				<div className="flex flex-col gap-6 p-5 md:p-7">
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant="secondary"
							className="gap-1.5 rounded-full px-3 py-1"
						>
							<BotIcon className="size-3.5" />
							AI SQL Workspace
						</Badge>
						<Badge variant="outline" className="rounded-full px-3 py-1">
							Prompt to SQL
						</Badge>
						<Badge variant="outline" className="rounded-full px-3 py-1">
							Manual execution control
						</Badge>
					</div>

					<div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] lg:items-end">
						<div className="space-y-3">
							<div className="space-y-2">
								<h1 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
									Generate cleaner schema, seed data, and helper queries against
									a real sandbox.
								</h1>
								<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
									Use natural language to draft SQL, then review the output
									before anything runs. The page stays focused on one job:
									faster iteration without hiding what will execute.
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									className="gap-1.5"
									onClick={handleGenerate}
									disabled={
										isGenerating ||
										sandboxesLoading ||
										activeSandboxes.length === 0
									}
								>
									<SparklesIcon className="size-4" />
									{isGenerating ? "Generating…" : "Generate SQL"}
								</Button>
								<Button asChild size="sm" variant="outline">
									<Link to="/dashboard/sandboxes">Browse Sandboxes</Link>
								</Button>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
							<div className="rounded-xl border bg-background/80 p-4 shadow-sm">
								<div className="flex items-center gap-2 text-muted-foreground">
									<DatabaseIcon className="size-4" />
									<p className="text-xs font-medium uppercase tracking-[0.16em]">
										Active Targets
									</p>
								</div>
								<p className="mt-3 text-2xl font-semibold">
									{activeSandboxes.length}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Sandboxes available for AI-assisted generation.
								</p>
							</div>
							<div className="rounded-xl border bg-background/80 p-4 shadow-sm">
								<div className="flex items-center gap-2 text-muted-foreground">
									<ActivityIcon className="size-4" />
									<p className="text-xs font-medium uppercase tracking-[0.16em]">
										AI Usage Today
									</p>
								</div>
								<p className="mt-3 text-2xl font-semibold">
									{workspaceStats
										? `${workspaceStats.aiRequestsToday}/${workspaceStats.maxAiRequestsPerDay}`
										: "—"}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{workspaceStats
										? `${usageRatio}% of the daily allowance has been used.`
										: "Loading workspace usage."}
								</p>
							</div>
							<div className="rounded-xl border bg-background/80 p-4 shadow-sm">
								<div className="flex items-center gap-2 text-muted-foreground">
									<LayoutTemplateIcon className="size-4" />
									<p className="text-xs font-medium uppercase tracking-[0.16em]">
										Current Focus
									</p>
								</div>
								<p className="mt-3 text-lg font-semibold">
									{modeConfig.find((item) => item.key === mode)?.title}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{modeConfig.find((item) => item.key === mode)?.description}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

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
								disabled={sandboxesLoading}
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
							placeholder={
								mode === "schema"
									? "e.g. Create users, products, and orders tables for a simple e-commerce app."
									: mode === "seed"
										? "e.g. Generate 20 employee records with realistic Indonesian names."
										: "e.g. How do I JOIN orders with users?"
							}
							className="min-h-36 w-full rounded-md border bg-muted/30 p-3 text-sm"
						/>

						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<Button
									size="sm"
									className="gap-1.5"
									onClick={handleGenerate}
									disabled={
										isGenerating ||
										sandboxesLoading ||
										activeSandboxes.length === 0
									}
								>
									<SparklesIcon className="size-4" />
									{isGenerating ? "Generating…" : "Generate SQL"}
								</Button>
								<Badge variant="outline" className="rounded-full px-3 py-1">
									Review before execute
								</Badge>
							</div>
							<Badge variant="outline" className="rounded-full px-3 py-1">
								{workspaceStats
									? `${workspaceStats.aiRequestsToday}/${workspaceStats.maxAiRequestsPerDay} requests today`
									: "Loading AI usage…"}
							</Badge>
						</div>

						{generated ? (
							<div className="space-y-3 rounded-xl border bg-muted/10 p-4">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-sm font-medium">Generated SQL</p>
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
										Stores prompts and generated SQL in your sandbox activity
										log
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
