import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	BotIcon,
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
			<div>
				<h1 className="text-xl font-semibold tracking-tight">AI Seeder</h1>
				<p className="text-sm text-muted-foreground">
					Generate schema, seed data, and SQL helpers using natural language.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">Prompt</CardTitle>
						<CardDescription>
							Generate SQL and run it against your selected sandbox.
						</CardDescription>
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
									No sandboxes found.{" "}
									<a href="/dashboard/sandboxes" className="underline">
										Create one
									</a>{" "}
									to get started.
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
							<Badge variant="outline">
								{workspaceStats
									? `${workspaceStats.aiRequestsToday}/${workspaceStats.maxAiRequestsPerDay} requests today`
									: "Loading AI usage…"}
							</Badge>
						</div>

						{generated ? (
							<div className="space-y-2 rounded-lg border p-3">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">Generated SQL</p>
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
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								Generate SQL to preview and run it in your selected sandbox.
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
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
