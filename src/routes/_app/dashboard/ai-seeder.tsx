import { createFileRoute } from "@tanstack/react-router";
import { BotIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
import { useExecuteAiSql, useGenerateAiSql } from "#/hooks/use-execute-query";
import { useSandboxes } from "#/hooks/use-sandboxes";

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
	const [selectedSandboxId, setSelectedSandboxId] = useState<string>("");
	const [mode, setMode] = useState<Mode>("schema");
	const [prompt, setPrompt] = useState(
		"Create users, products, and orders tables for a simple e-commerce app.",
	);
	const [generatedSql, setGeneratedSql] = useState<string | null>(null);
	const [aiLogId, setAiLogId] = useState<string | null>(null);
	const [explanation, setExplanation] = useState<string | null>(null);

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

	const generateAiSqlMutation = useGenerateAiSql(selectedSandboxId);
	const executeAiSqlMutation = useExecuteAiSql(selectedSandboxId);

	const handleGenerate = async () => {
		if (!selectedSandboxId) {
			toast.error("Please select a sandbox first");
			return;
		}
		if (!prompt.trim()) {
			toast.error("Please enter a prompt");
			return;
		}

		try {
			const result = await generateAiSqlMutation.mutateAsync(prompt);
			setGeneratedSql(result.sql);
			setAiLogId(result.aiLogId ?? null);
			setExplanation(result.explanation);
			toast.success("SQL generated successfully!");
		} catch {
			// Error handled by mutation hook
		}
	};

	const handleExecute = async () => {
		if (!generatedSql) {
			toast.error("No SQL to execute");
			return;
		}

		try {
			if (!aiLogId) {
				toast.error("No AI log found");
				return;
			}

			await executeAiSqlMutation.mutateAsync(aiLogId);
			toast.success("SQL executed successfully!");
			setGeneratedSql(null);
			setAiLogId(null);
			setExplanation(null);
		} catch {
			// Error handled by mutation hook
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
								value={selectedSandboxId}
								onChange={(e) => setSelectedSandboxId(e.target.value)}
								disabled={sandboxesLoading}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
							>
								<option value="" disabled>
									{sandboxesLoading ? "Loading..." : "Select a sandbox"}
								</option>
								{sandboxOptions.map((opt) => (
									<option key={opt.id} value={opt.id}>
										{opt.label}
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
							className="min-h-36 w-full rounded-md border bg-muted/30 p-3 text-sm"
						/>

						<div className="flex flex-wrap items-center gap-2">
							<Button
								size="sm"
								className="gap-1.5"
								onClick={handleGenerate}
								disabled={generateAiSqlMutation.isPending || !selectedSandboxId}
							>
								{generateAiSqlMutation.isPending ? (
									<>
										<Loader2Icon className="size-4 animate-spin" />
										Generating…
									</>
								) : (
									<>
										<SparklesIcon className="size-4" />
										Generate SQL
									</>
								)}
							</Button>
							<Badge variant="outline">30 requests/day (free)</Badge>
						</div>

						{generatedSql ? (
							<div className="space-y-2 rounded-lg border p-3">
								<p className="text-sm font-medium">Generated SQL</p>
								<pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
									<code>{generatedSql}</code>
								</pre>
								{explanation && (
									<p className="text-xs text-muted-foreground">{explanation}</p>
								)}
								<div className="flex items-center gap-2">
									<Button
										size="sm"
										onClick={handleExecute}
										disabled={executeAiSqlMutation.isPending}
									>
										{executeAiSqlMutation.isPending ? (
											<>
												<Loader2Icon className="size-4 animate-spin" />
												Executing…
											</>
										) : (
											"Execute SQL"
										)}
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											navigator.clipboard.writeText(generatedSql);
											toast.success("SQL copied to clipboard");
										}}
									>
										Copy SQL
									</Button>
								</div>
							</div>
						) : (
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								{selectedSandboxId
									? "Enter a prompt and click Generate SQL to create database schema or seed data."
									: "Select a sandbox to start generating SQL."}
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
							Current model: Gemini AI
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
		</div>
	);
}
