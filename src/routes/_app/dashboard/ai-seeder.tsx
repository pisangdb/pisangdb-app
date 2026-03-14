import { createFileRoute } from "@tanstack/react-router";
import { BotIcon, SparklesIcon, WandSparklesIcon } from "lucide-react";
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

function AiSeederPage() {
	const [mode, setMode] = useState<Mode>("schema");
	const [prompt, setPrompt] = useState(
		"Create users, products, and orders tables for a simple e-commerce app.",
	);
	const [generated, setGenerated] = useState(false);

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
							Dummy response mode. Integrate Gemini endpoint later.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
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
								onClick={() => setGenerated(true)}
							>
								<SparklesIcon className="size-4" />
								Generate SQL
							</Button>
							<Button variant="outline" size="sm">
								Save Prompt
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
						<Button variant="outline" size="sm" className="w-full gap-1.5">
							<WandSparklesIcon className="size-4" />
							Open AI Logs
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
