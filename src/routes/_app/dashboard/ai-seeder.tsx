import { createFileRoute } from "@tanstack/react-router";
import { BotIcon, SparklesIcon } from "lucide-react";
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
	const { data: sandboxes, isLoading: sandboxesLoading } = useSandboxes();
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
			const engine = selected?.engine ?? "postgresql";
			const result = await $aiGenerate({
				data: { sandboxId: selectedSandbox, prompt, engine },
			});
			setGenerated(result);
			setSqlText(result.sqlGenerated);
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
								{sandboxes?.map((sandbox) => (
									<option key={sandbox.id} value={sandbox.id}>
										{sandbox.displayName} ({sandbox.engine})
									</option>
								))}
							</select>
							{!sandboxesLoading && sandboxes && sandboxes.length === 0 && (
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
								disabled={isGenerating || sandboxesLoading}
							>
								<SparklesIcon className="size-4" />
								{isGenerating ? "Generating…" : "Generate SQL"}
							</Button>
							<Badge variant="outline">30 requests/day (free)</Badge>
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
							Configured for engine-specific SQL and safer generation.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p className="flex items-center gap-1.5 text-foreground">
							<BotIcon className="size-4" />
							Current model: Gemini
						</p>
						<ul className="list-disc space-y-1 pl-4 text-xs">
							<li>Prompt length up to 1000 chars</li>
							<li>Prompt and SQL output saved to AI logs</li>
							<li>Potentially unsafe SQL requires manual review</li>
						</ul>
						<div className="rounded-md bg-muted p-3 text-xs">
							<p className="font-medium text-foreground">Tip</p>
							<p className="mt-1">
								Be specific about tables, constraints, and data volume to get
								better SQL output.
							</p>
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
