import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, CopyIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useCreateSandbox } from "#/hooks/use-create-sandbox";

export const Route = createFileRoute("/_app/dashboard/sandboxes/new")({
	head: () => ({ meta: [{ title: "New Sandbox — PisangDB" }] }),
	component: NewSandboxPage,
});

type Engine = "postgresql" | "mysql" | "mariadb";
type Region = "id" | "sg" | "us";

const engineOptions: {
	value: Engine;
	label: string;
	emoji: string;
	port: number;
}[] = [
	{ value: "postgresql", label: "PostgreSQL 16", emoji: "🐘", port: 5432 },
	{ value: "mysql", label: "MySQL 8", emoji: "🐬", port: 3306 },
	{ value: "mariadb", label: "MariaDB 11", emoji: "🦭", port: 3307 },
];

const regionOptions: {
	value: Region;
	label: string;
	enabled: boolean;
}[] = [
	{ value: "id", label: "🇮🇩 Indonesia", enabled: true },
	{ value: "sg", label: "🇸🇬 Singapore (coming soon)", enabled: false },
	{ value: "us", label: "🇺🇸 United States (coming soon)", enabled: false },
];

const retentionOptions = [
	"1 hour",
	"6 hours",
	"12 hours",
	"24 hours",
	"3 days",
	"7 days",
];
const templateOptions = ["Blank", "E-commerce", "Blog", "Inventory"];

function NewSandboxPage() {
	const createSandbox = useCreateSandbox();
	const [engine, setEngine] = useState<Engine>("postgresql");
	const [region, setRegion] = useState<Region>("id");
	const [name, setName] = useState("my-project-db");
	const [retention, setRetention] = useState("6 hours");
	const [template, setTemplate] = useState("Blank");
	const [copied, setCopied] = useState(false);


	// Parse retention string to hours
	const parseRetentionToHours = (retentionStr: string): number => {
		const match = retentionStr.match(/^(\d+)\s*(hour|hours|day|days)$/i);
		if (!match) return 6; // default
		const value = Number.parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		if (unit.startsWith("day")) return value * 24;
		return value;
	};

	const handleCreate = () => {
		const retentionHours = parseRetentionToHours(retention);
		createSandbox.mutate({
			engine,
			region,
			name,
			retentionHours,
		});
	};

	const isCreating = createSandbox.isPending;
	const isCreated = createSandbox.isSuccess;

	const selectedEngine =
		engineOptions.find((item) => item.value === engine) ?? engineOptions[0];

	const generated = useMemo(() => {
		const normalizedName =
			name
				.toLowerCase()
				.trim()
				.replaceAll(/[^a-z0-9-]/g, "-")
				.replaceAll(/-{2,}/g, "-") || "sandbox";

		const dbName = `pisang_a1b2_${normalizedName}_x8k2m9`;
		const dbUser = "sb_a1b2x8";
		const host = `${region}.pisangdb.com`;
		const protocol = engine === "postgresql" ? "postgresql" : "mysql";
		const connectionUrl = `${protocol}://${dbUser}:***@${host}:${selectedEngine.port}/${dbName}`;

		return { dbName, dbUser, host, connectionUrl };
	}, [engine, name, region, selectedEngine.port]);

	const copyEnv = async () => {
		if (typeof navigator === "undefined" || !navigator.clipboard) return;
		await navigator.clipboard.writeText(
			`DATABASE_URL=${generated.connectionUrl}`,
		);
		setCopied(true);
		setTimeout(() => {
			setCopied(false);
		}, 1200);
	};

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">
						Create Sandbox
					</h1>
					<p className="text-sm text-muted-foreground">
						Choose engine, region, and TTL. Credentials are generated instantly.
					</p>
				</div>
				<Button asChild variant="outline" size="sm" className="gap-1.5">
					<Link to="/dashboard/sandboxes">
						<ArrowLeftIcon className="size-4" />
						Back
					</Link>
				</Button>
			</div>

			<div className="grid gap-4 lg:grid-cols-5">
				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle className="text-base">Sandbox Configuration</CardTitle>
						<CardDescription>
							Configure your database engine, region, and retention time.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="space-y-2">
							<Label>Engine</Label>
							<div className="grid gap-2 sm:grid-cols-3">
								{engineOptions.map((item) => (
									<button
										key={item.value}
										type="button"
										onClick={() => setEngine(item.value)}
										className={`rounded-lg border p-3 text-left transition-colors ${
											engine === item.value
												? "border-primary bg-primary/5"
												: "hover:bg-muted/40"
										}`}
									>
										<p className="text-sm font-medium">
											{item.emoji} {item.label}
										</p>
										<p className="text-xs text-muted-foreground">
											Port {item.port}
										</p>
									</button>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<Label>Region</Label>
							<div className="grid gap-2">
								{regionOptions.map((item) => (
									<button
										key={item.value}
										type="button"
										onClick={() => item.enabled && setRegion(item.value)}
										disabled={!item.enabled}
										className={`rounded-lg border p-3 text-left text-sm transition-colors ${
											region === item.value
												? "border-primary bg-primary/5"
												: "hover:bg-muted/40"
										} disabled:cursor-not-allowed disabled:opacity-60`}
									>
										{item.label}
									</button>
								))}
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="sandbox-name">Sandbox name</Label>
								<Input
									id="sandbox-name"
									value={name}
									onChange={(event) => setName(event.target.value)}
									placeholder="my-project-db"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="retention">Retention</Label>
								<select
									id="retention"
									value={retention}
									onChange={(event) => setRetention(event.target.value)}
									className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
								>
									{retentionOptions.map((option) => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="template">Template</Label>
							<select
								id="template"
								value={template}
								onChange={(event) => setTemplate(event.target.value)}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
							>
								{templateOptions.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</div>

						<Button
							className="w-full sm:w-auto"
							disabled={isCreating}
							onClick={handleCreate}
						>
							{isCreating
								? "Creating..."
								: isCreated
									? "Sandbox Created! 🎉"
									: "Create Sandbox 🍌"}
						</Button>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">Credentials Preview</CardTitle>
						<CardDescription>
							Matches PisangDB output format for quick copy-paste.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="grid gap-2 rounded-lg border p-3">
							<p>
								Engine:{" "}
								<span className="font-medium">{selectedEngine.label}</span>
							</p>
							<p>
								Region:{" "}
								<span className="font-medium">{region.toUpperCase()}</span>
							</p>
							<p>
								Host: <span className="font-medium">{generated.host}</span>
							</p>
							<p>
								Port: <span className="font-medium">{selectedEngine.port}</span>
							</p>
							<p>
								Database:{" "}
								<span className="font-mono text-xs">{generated.dbName}</span>
							</p>
							<p>
								Username:{" "}
								<span className="font-mono text-xs">{generated.dbUser}</span>
							</p>
							<p>
								Password:{" "}
								<span className="font-mono text-xs">••••••••••••••••</span>
							</p>
							<Badge variant="outline" className="w-fit text-[10px]">
								TTL: {retention}
							</Badge>
						</div>

						<div className="rounded-lg bg-muted p-3 text-xs font-mono text-muted-foreground">
							<p className="break-all">{generated.connectionUrl}</p>
						</div>

						<Button
							variant="outline"
							className="w-full gap-1.5"
							onClick={copyEnv}
						>
							<CopyIcon className="size-4" />
							Copy .env Snippet
						</Button>

						{copied ? (
							<p className="text-xs text-muted-foreground">
								Copied: DATABASE_URL={generated.connectionUrl}
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
