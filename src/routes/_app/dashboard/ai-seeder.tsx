import { createFileRoute } from "@tanstack/react-router";
import { BotIcon, SparklesIcon } from "lucide-react";
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
import type { AiGenerateResult, AiLogItem, SandboxListItem } from "#/lib/types";
import {
	$aiExecute,
	$aiGenerate,
	$getAiLogs,
} from "#/modules/console/serverFn";
import { $getSandboxes } from "#/modules/sandboxes/serverFn";

export const Route = createFileRoute("/_app/dashboard/ai-seeder")({
	loader: async () => {
		const sandboxes = await $getSandboxes();
		return { sandboxes };
	},
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

const ENGINE_LABELS: Record<string, string> = {
	postgresql: "PostgreSQL",
	mysql: "MySQL",
	mariadb: "MariaDB",
};

function AiSeederPage() {
	const { sandboxes } = Route.useLoaderData();
	const [selectedSandboxId, setSelectedSandboxId] = useState<string>("");
	const [mode, setMode] = useState<Mode>("schema");
	const [prompt, setPrompt] = useState(
		"Create users, products, and orders tables for a simple e-commerce app.",
	);
	const [generatedResult, setGeneratedResult] =
		useState<AiGenerateResult | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isExecuting, setIsExecuting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [aiLogs, setAiLogs] = useState<AiLogItem[]>([]);

	const activeSandboxes = sandboxes.filter(
		(s: SandboxListItem) => s.status === "active",
	) as SandboxListItem[];

	const selectedSandbox = activeSandboxes.find(
		(s) => s.id === selectedSandboxId,
	);

	const handleSandboxChange = async (sandboxId: string) => {
		setSelectedSandboxId(sandboxId);
		setGeneratedResult(null);
		setError(null);

		if (sandboxId) {
			try {
				const logs = await $getAiLogs({ sandboxId });
				setAiLogs(logs);
			} catch {
				setAiLogs([]);
			}
		} else {
			setAiLogs([]);
		}
	};

	const handleGenerate = async () => {
		if (!selectedSandboxId || !prompt.trim()) return;

		setIsGenerating(true);
		setError(null);
		setGeneratedResult(null);

		try {
			const result = await $aiGenerate({
				sandboxId: selectedSandboxId,
				prompt,
				mode,
			});
			setGeneratedResult(result);

			const logs = await $getAiLogs({ sandboxId: selectedSandboxId });
			setAiLogs(logs);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Generation failed");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleExecute = async () => {
		if (!selectedSandboxId || !generatedResult) return;

		setIsExecuting(true);
		setError(null);

		try {
			const result = await $aiExecute({
				sandboxId: selectedSandboxId,
				logId: generatedResult.logId,
				sql: generatedResult.sqlGenerated,
			});

			if (result.rowsAffected > 0) {
				setGeneratedResult(null);
				setPrompt("");
				setError(null);
				alert(
					`SQL executed successfully! ${result.rowsAffected} row(s) affected.`,
				);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Execution failed");
		} finally {
			setIsExecuting(false);
		}
	};

	const handleHistoryClick = (log: AiLogItem) => {
		setPrompt(log.prompt);
		setGeneratedResult({
			logId: log.id,
			sqlGenerated: log.sqlGenerated || "",
			explanation: log.response,
			tokensUsed: log.tokensUsed,
		});
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
								value={selectedSandboxId}
								onChange={(e) => handleSandboxChange(e.target.value)}
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
							placeholder="Create users, products, and orders tables for a simple e-commerce app."
							className="min-h-36 w-full rounded-md border bg-muted/30 p-3 text-sm"
						/>

						<div className="flex flex-wrap items-center gap-2">
							<Button
								size="sm"
								className="gap-1.5"
								onClick={handleGenerate}
								disabled={!selectedSandboxId || !prompt.trim() || isGenerating}
							>
								<SparklesIcon className="size-4" />
								{isGenerating ? "Generating…" : "Generate SQL"}
							</Button>
							<Badge variant="outline">30 requests/day (free)</Badge>
						</div>

						{error && (
							<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
								{error}
							</div>
						)}

						{generatedResult ? (
							<div className="space-y-2 rounded-lg border p-3">
								<p className="text-sm font-medium">Generated SQL</p>
								<pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
									<code>{generatedResult.sqlGenerated}</code>
								</pre>
								<p className="text-xs text-muted-foreground">
									{generatedResult.explanation}
								</p>
								<div className="flex items-center gap-2">
									<Button
										size="sm"
										onClick={handleExecute}
										disabled={isExecuting}
									>
										{isExecuting ? "Executing…" : "Execute SQL"}
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											navigator.clipboard.writeText(
												generatedResult.sqlGenerated,
											);
										}}
									>
										Copy SQL
									</Button>
								</div>
							</div>
						) : (
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								Select a sandbox and generate SQL to preview and run it.
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
							Current model: Gemini 2.0 Flash
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

						{selectedSandbox && (
							<div className="rounded-md border p-3 text-xs">
								<p className="font-medium text-foreground">Selected Sandbox</p>
								<p className="mt-1">{selectedSandbox.displayName}</p>
								<p className="text-muted-foreground">
									{ENGINE_LABELS[selectedSandbox.engine]} •{" "}
									{selectedSandbox.host}:{selectedSandbox.port}
								</p>
							</div>
						)}

						{aiLogs.length > 0 && (
							<div className="space-y-2">
								<p className="text-sm font-medium text-foreground">
									Recent AI Generations
								</p>
								{aiLogs.slice(0, 3).map((log) => (
									<button
										key={log.id}
										type="button"
										className="w-full cursor-pointer rounded-md border p-2 text-left hover:bg-muted/50"
										onClick={() => handleHistoryClick(log)}
									>
										<p className="line-clamp-1 text-xs">{log.prompt}</p>
										<p className="mt-1 text-[11px] text-muted-foreground">
											{log.executed ? "Executed" : "Generated"} •{" "}
											{new Date(log.createdAt).toLocaleDateString()}
										</p>
									</button>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
