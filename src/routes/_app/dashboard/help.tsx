import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	BotIcon,
	CircleAlertIcon,
	DatabaseIcon,
	KeyRoundIcon,
	LifeBuoyIcon,
	Settings2Icon,
	TerminalSquareIcon,
} from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/_app/dashboard/help")({
	head: () => ({ meta: [{ title: "Get Help — PisangDB" }] }),
	component: HelpPage,
});

const quickStartSteps = [
	{
		title: "Create a sandbox",
		description:
			"Pick an engine, region, retention window, and optional starter template.",
		href: "/dashboard/sandboxes/new",
		label: "New sandbox",
		icon: <DatabaseIcon className="size-4" />,
	},
	{
		title: "Inspect credentials",
		description:
			"Open the sandbox detail page to copy the real connection string, database name, and password.",
		href: "/dashboard/sandboxes",
		label: "View sandboxes",
		icon: <KeyRoundIcon className="size-4" />,
	},
	{
		title: "Run SQL or generate it with AI",
		description:
			"Use Console for direct queries or AI Seeder when you want schema, seed data, or helper SQL.",
		href: "/dashboard/console",
		label: "Open console",
		icon: <TerminalSquareIcon className="size-4" />,
	},
];

const troubleshootingCards = [
	{
		title: "Sandbox is not selectable",
		description:
			"Only active sandboxes can be used in Console and AI Seeder. Reopen the sandbox list to confirm status and expiry time.",
		href: "/dashboard/sandboxes",
		label: "Check sandbox status",
	},
	{
		title: "Need starter SQL fast",
		description:
			"Use AI Seeder for prompt-based generation, then review the SQL before execution against the selected sandbox.",
		href: "/dashboard/ai-seeder",
		label: "Open AI Seeder",
	},
	{
		title: "Need to manage access or sessions",
		description:
			"Use Settings to update your profile, change password, revoke sessions, and control dashboard preferences.",
		href: "/dashboard/settings",
		label: "Open settings",
	},
];

const destinationCards = [
	{
		title: "Sandbox Fleet",
		description:
			"Review active databases, TTL, storage, and connection details.",
		href: "/dashboard/sandboxes",
		icon: <DatabaseIcon className="size-5" />,
	},
	{
		title: "SQL Console",
		description: "Run manual queries with recent history and starter snippets.",
		href: "/dashboard/console",
		icon: <TerminalSquareIcon className="size-5" />,
	},
	{
		title: "AI Seeder",
		description:
			"Generate schema, seed inserts, or helper queries from prompts.",
		href: "/dashboard/ai-seeder",
		icon: <BotIcon className="size-5" />,
	},
	{
		title: "Account Settings",
		description:
			"Update profile, sessions, notifications, and security controls.",
		href: "/dashboard/settings",
		icon: <Settings2Icon className="size-5" />,
	},
];

function HelpPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/60">
				<div className="flex flex-col gap-6 p-5 md:p-7">
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant="secondary"
							className="gap-1.5 rounded-full px-3 py-1"
						>
							<LifeBuoyIcon className="size-3.5" />
							Help Center
						</Badge>
						<Badge variant="outline" className="rounded-full px-3 py-1">
							Quick start and troubleshooting
						</Badge>
					</div>

					<div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] lg:items-end">
						<div className="space-y-3">
							<div className="space-y-2">
								<h1 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
									Find the fastest path to create, query, and manage your
									sandbox workspace.
								</h1>
								<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
									This page stays practical: it points you to the routes that
									already work today, plus a few common troubleshooting paths
									for sandbox, console, and AI workflows.
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button asChild size="sm">
									<Link to="/dashboard/sandboxes/new">Create sandbox</Link>
								</Button>
								<Button asChild size="sm" variant="outline">
									<Link to="/dashboard/console">Open console</Link>
								</Button>
							</div>
						</div>

						<div className="rounded-2xl border bg-background/85 p-4 shadow-sm">
							<div className="flex items-center gap-2 text-foreground">
								<BookOpenIcon className="size-4 text-primary" />
								<p className="text-sm font-medium">What this page helps with</p>
							</div>
							<div className="mt-3 grid gap-2 text-xs text-muted-foreground">
								<div className="rounded-lg border bg-muted/30 p-3">
									Launch a new database sandbox and understand what to do next.
								</div>
								<div className="rounded-lg border bg-muted/30 p-3">
									Jump straight into SQL Console or AI Seeder without hunting
									through the sidebar.
								</div>
								<div className="rounded-lg border bg-muted/30 p-3">
									Fix the most common “why can’t I run this?” issues in one
									stop.
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
				<Card className="border-border/80">
					<CardHeader>
						<CardTitle className="text-base">Quick Start</CardTitle>
						<CardDescription>
							Three steps to go from zero to a usable database workflow.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						{quickStartSteps.map((step, index) => (
							<div
								key={step.title}
								className="rounded-xl border bg-muted/10 p-4"
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
												{index + 1}
											</div>
											<div className="flex items-center gap-2 text-sm font-medium text-foreground">
												{step.icon}
												{step.title}
											</div>
										</div>
										<p className="max-w-2xl text-sm text-muted-foreground">
											{step.description}
										</p>
									</div>
									<Button asChild size="sm" variant="outline">
										<Link to={step.href}>{step.label}</Link>
									</Button>
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				<Card className="border-border/80">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<CircleAlertIcon className="size-4" />
							Common Issues
						</CardTitle>
						<CardDescription>
							Shortcuts for the problems most users hit first.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{troubleshootingCards.map((item) => (
							<div key={item.title} className="rounded-xl border p-4">
								<p className="text-sm font-medium text-foreground">
									{item.title}
								</p>
								<p className="mt-1 text-xs leading-5 text-muted-foreground">
									{item.description}
								</p>
								<Button asChild size="sm" variant="ghost" className="mt-3 px-0">
									<Link to={item.href}>{item.label}</Link>
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			<Card className="border-border/80">
				<CardHeader>
					<CardTitle className="text-base">Popular Destinations</CardTitle>
					<CardDescription>
						Go straight to the dashboard area you need.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					{destinationCards.map((item) => (
						<Link
							key={item.title}
							to={item.href}
							className="rounded-xl border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
						>
							<div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
								{item.icon}
							</div>
							<p className="mt-4 text-sm font-medium text-foreground">
								{item.title}
							</p>
							<p className="mt-1 text-xs leading-5 text-muted-foreground">
								{item.description}
							</p>
						</Link>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
