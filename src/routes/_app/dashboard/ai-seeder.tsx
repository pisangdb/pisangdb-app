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

const sqlPreview = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email)
VALUES
  ('Andi Pratama', 'andi@example.com'),
  ('Citra Dewi', 'citra@example.com');`;

const sandboxOptions = [
	{ id: "sb_a1b2x8", label: "migration-check (PostgreSQL 16)" },
	{ id: "sb_c3d4y9", label: "bootcamp-prisma (MySQL 8)" },
];

function AiSeederPage() {
	const [selectedSandbox, setSelectedSandbox] = useState(
		sandboxOptions[0]?.id ?? "",
	);
	const [mode, setMode] = useState<Mode>("schema");
	const [prompt, setPrompt] = useState(
		"Create users, products, and orders tables for a simple e-commerce app.",
	);
	const [generated, setGenerated] = useState(false);
	const [savedPrompt, setSavedPrompt] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	const handleSavePrompt = () => {
		setSavedPrompt(true);
		setTimeout(() => setSavedPrompt(false), 2000);
	};

	const handleGenerate = () => {
		setIsGenerating(true);
		setTimeout(() => {
			setIsGenerating(false);
			setGenerated(true);
		}, 1000);
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
							>
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
								disabled={isGenerating}
							>
								<SparklesIcon className="size-4" />
								{isGenerating ? "Generating…" : "Generate SQL"}
							</Button>
							<Button variant="outline" size="sm" onClick={handleSavePrompt}>
								{savedPrompt ? "Saved ✓" : "Save Prompt"}
							</Button>
							<Badge variant="outline">30 requests/day (free)</Badge>
						</div>

						{generated ? (
							<div className="space-y-2 rounded-lg border p-3">
								<p className="text-sm font-medium">Generated SQL</p>
								<pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
									<code>{sqlPreview}</code>
								</pre>
								<div className="flex items-center gap-2">
									<Button size="sm">Execute SQL</Button>
									<Button size="sm" variant="outline">
										Edit Before Execute
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
							Current model: Gemini (dummy integration)
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
						<p className="text-xs text-muted-foreground">
							AI interaction logs will be available in a future update.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
