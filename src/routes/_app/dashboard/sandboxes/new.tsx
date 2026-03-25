import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useCreateSandbox } from "#/lib/hooks/useSandboxes";
import { useTemplates } from "#/lib/hooks/useTemplates";

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

function NewSandboxPage() {
	const navigate = useNavigate();
	const createSandbox = useCreateSandbox();
	const [engine, setEngine] = useState<Engine>("postgresql");
	const [region, setRegion] = useState<Region>("id");
	const [name, setName] = useState("my-project-db");
	const [retention, setRetention] = useState("6 hours");
	const [templateId, setTemplateId] = useState<string | null>(null);

	// Fetch templates filtered by selected engine
	const { data: templatesData } = useTemplates(engine);

	const RETENTION_MAP: Record<string, number> = {
		"1 hour": 1,
		"6 hours": 6,
		"12 hours": 12,
		"24 hours": 24,
		"3 days": 72,
		"7 days": 168,
	};

	const handleCreate = async () => {
		const retentionHours = RETENTION_MAP[retention];
		if (!retentionHours) {
			toast.error("Invalid retention period");
			return;
		}
		try {
			const created = await createSandbox.mutateAsync({
				displayName: name,
				engine,
				region,
				retentionHours: retentionHours as 1 | 6 | 12 | 24 | 72 | 168,
				templateId: templateId ?? undefined,
			});
			toast.success("Sandbox created!");
			void navigate({
				to: "/dashboard/sandboxes/$id",
				params: { id: created.id },
			});
		} catch {
			// Error toast already shown by useCreateSandbox
		}
	};

	const selectedEngine =
		engineOptions.find((item) => item.value === engine) ?? engineOptions[0];
	const selectedTemplate = templatesData?.find(
		(item) => item.id === templateId,
	);
	const retentionHours = RETENTION_MAP[retention] ?? 0;

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
									name="sandbox-name"
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
								value={templateId ?? ""}
								onChange={(event) => setTemplateId(event.target.value || null)}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs dark:scheme-dark [&>option]:bg-background [&>option]:text-foreground"
							>
								<option value="">Blank</option>
								{templatesData?.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>

							{/* Template preview card */}
							{templatesData && templatesData.length > 0 ? (
								<div className="rounded-lg border p-3">
									<Label className="text-sm font-medium">
										Templates ({templatesData.length})
									</Label>
									<p className="text-xs text-muted-foreground">
										{templatesData.map((t) => t.name).join(", ")}
									</p>
								</div>
							) : null}
						</div>

						<Button
							size="lg"
							className="w-full gap-2 sm:w-auto cursor-pointer disabled:cursor-not-allowed"
							disabled={!name.trim() || createSandbox.isPending}
							onClick={handleCreate}
						>
							{createSandbox.isPending ? (
								<>
									<span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									Creating...
								</>
							) : (
								"Create Sandbox 🍌"
							)}
						</Button>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">Creation Summary</CardTitle>
						<CardDescription>
							Credentials are generated on create and shown on the sandbox
							detail page.
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
								Region host:{" "}
								<span className="font-medium">{region}.pisangdb.com</span>
							</p>
							<p className="font-medium">Port: {selectedEngine.port}</p>
							<p>
								Sandbox name:{" "}
								<span className="font-medium">{name.trim() || "Untitled"}</span>
							</p>
							<p>
								Retention: <span className="font-medium">{retention}</span>
							</p>
							<p>
								Template:{" "}
								<span className="font-medium">
									{selectedTemplate?.name ?? "Blank"}
								</span>
							</p>
							<Badge variant="outline" className="w-fit text-[10px]">
								TTL: {retentionHours}h
							</Badge>
						</div>

						<div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
							<p>
								Database name, username, password, and connection URL are
								provisioned server-side after creation succeeds.
							</p>
							<p className="mt-2">
								After submit, you will be redirected to the sandbox detail page
								with the real credentials.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
