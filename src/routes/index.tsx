import { createFileRoute } from "@tanstack/react-router";
import { Clock3, Database, Sparkles, TimerReset } from "lucide-react";
import { Logo } from "#/components/logo";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

const highlights = [
	{
		title: "Sandbox Multi-Engine",
		desc: "Use PostgreSQL, MySQL, and MariaDB in one consistent workflow.",
		icon: Database,
	},
	{
		title: "Instant Credentials",
		desc: "Host, port, username, password, and connection URL ready to copy in one click.",
		icon: Sparkles,
	},
	{
		title: "Auto-Cleanup TTL",
		desc: "Databases are cleaned up automatically from 1 hour up to 7 days, no manual cleanup needed.",
		icon: TimerReset,
	},
	{
		title: "SQL Console + AI Seeder",
		desc: "Run queries in the browser and generate schema or seed data from prompts.",
		icon: Clock3,
	},
];

const engineOptions = ["🐘 PostgreSQL 16", "🐬 MySQL 8", "🦭 MariaDB 11"];

const regions = [
	{ name: "🇮🇩 Indonesia", status: "Active" as const },
	{ name: "🇸🇬 Singapore", status: "Coming soon" as const },
	{ name: "🇺🇸 US", status: "Coming soon" as const },
];

const useCases = ["Migration testing", "Learning SQL", "Faster project setup"];

function RouteComponent() {
	return (
		<div className="relative min-h-svh bg-background">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-115 bg-linear-to-b from-primary/10 via-background/60 to-transparent" />
			<div className="pointer-events-none absolute left-10 top-28 size-32 rounded-full bg-primary/15 blur-2xl motion-safe:animate-pulse" />
			<div className="pointer-events-none absolute right-8 top-40 size-24 rounded-full bg-primary/10 blur-2xl motion-safe:animate-pulse [animation-delay:500ms]" />

			<header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8 md:py-5">
				<div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-700">
					<Logo size="md" />
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" asChild>
						<a href="/login">Sign in</a>
					</Button>
					<Button asChild>
						<a href="/register">Create account</a>
					</Button>
				</div>
			</header>

			<main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-10 pt-6 md:gap-14 md:px-8 md:pb-14 md:pt-12">
				<section className="grid gap-8 md:gap-10 lg:grid-cols-2 lg:items-center">
					<div className="space-y-4 md:space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-700">
						<Badge variant="secondary" className="w-fit">
							PisangDB 🍌 • Fresh Databases, Peels Away When Done
						</Badge>
						<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
							Production-like databases ready in under 2 seconds, with zero
							local install.
						</h1>
						<p className="max-w-xl text-sm text-muted-foreground sm:text-base md:text-lg">
							Create isolated PostgreSQL, MySQL, or MariaDB sandboxes, copy the
							connection string, use it instantly in your local project, and let
							auto-cleanup handle the rest.
						</p>

						<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<Badge variant="outline">No local engine installation</Badge>
							<Badge variant="outline">Isolated sandbox per project</Badge>
							<Badge variant="outline">
								Auto-cleanup from 1 hour to 7 days
							</Badge>
						</div>

						<div className="flex flex-wrap gap-2 sm:gap-3">
							<Button size="lg" asChild>
								<a href="/register">Create free sandbox</a>
							</Button>
							<Button size="lg" variant="outline" asChild>
								<a href="/login">I already have an account</a>
							</Button>
						</div>
					</div>

					<Card className="border-primary/20 bg-background/90 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-700 motion-safe:[animation-delay:120ms]">
						<CardHeader>
							<CardTitle>How it works (3 steps)</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm md:space-y-4">
							<div className="rounded-lg border bg-muted/30 p-3">
								<p className="font-medium">1. Create sandbox</p>
								<p className="text-muted-foreground">
									Choose engine, region, and retention time (1 hour to 7 days).
								</p>
							</div>
							<div className="rounded-lg border bg-muted/30 p-3">
								<p className="font-medium">2. Copy credentials</p>
								<p className="text-muted-foreground">
									Paste the connection string into your project environment
									file.
								</p>
							</div>
							<div className="rounded-lg border bg-muted/30 p-3">
								<p className="font-medium">3. Build and test</p>
								<p className="text-muted-foreground">
									Test migrations safely, query via SQL Console, and let TTL
									expire automatically.
								</p>
							</div>
						</CardContent>
					</Card>
				</section>

				<section className="grid gap-3 rounded-xl border bg-card p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:[animation-delay:180ms] md:grid-cols-3 md:gap-4 md:p-4">
					<div className="h-full rounded-lg border bg-muted/20 p-3 md:p-4">
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							Engine options
						</p>
						<div className="mt-2 space-y-2 text-sm md:mt-3">
							{engineOptions.map((engine) => (
								<div
									key={engine}
									className="flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-2 md:px-3"
								>
									<span className="font-medium">{engine}</span>
									<Badge variant="secondary" className="whitespace-nowrap">
										Active
									</Badge>
								</div>
							))}
						</div>
					</div>
					<div className="h-full rounded-lg border bg-muted/20 p-3 md:p-4">
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							Region
						</p>
						<div className="mt-2 space-y-2 text-sm md:mt-3">
							{regions.map((region) => (
								<div
									key={region.name}
									className="flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-2 md:px-3"
								>
									<span className="font-medium">{region.name}</span>
									<Badge
										variant={
											region.status === "Active" ? "secondary" : "outline"
										}
										className="whitespace-nowrap"
									>
										{region.status === "Active" ? "Active" : "Coming soon"}
									</Badge>
								</div>
							))}
						</div>
					</div>
					<div className="h-full rounded-lg border bg-muted/20 p-3 md:p-4">
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							Built for
						</p>
						<ul className="mt-2 space-y-2 text-sm md:mt-3">
							{useCases.map((useCase) => (
								<li
									key={useCase}
									className="rounded-md border bg-background px-2.5 py-2 font-medium md:px-3"
								>
									{useCase}
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
					{highlights.map((item) => (
						<Card
							key={item.title}
							className="transition-transform duration-300 hover:-translate-y-1"
						>
							<CardHeader className="gap-3 pb-2">
								<div className="flex size-8 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground">
									<item.icon className="size-4" />
								</div>
								<CardTitle className="text-base">{item.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">{item.desc}</p>
							</CardContent>
						</Card>
					))}
				</section>

				<section className="rounded-xl border bg-card p-4 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:[animation-delay:260ms] md:p-6">
					<h2 className="text-2xl font-semibold tracking-tight">
						Ready to stop manual database setup?
					</h2>
					<p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
						Create your first sandbox now, copy the connection string, and keep
						building. PisangDB handles cleanup automatically.
					</p>
					<div className="mt-4 flex flex-wrap justify-center gap-2 md:mt-5 md:gap-3">
						<Button size="lg" asChild>
							<a href="/register">Create account</a>
						</Button>
						<Button size="lg" variant="outline" asChild>
							<a href="/login">Sign in</a>
						</Button>
					</div>
				</section>
			</main>

			<footer className="relative z-10 border-t bg-background/80">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
					<p>
						© {new Date().getFullYear()} PisangDB. Fresh databases for
						developers.
					</p>
					<div className="flex flex-wrap items-center gap-4">
						<a href="/login" className="hover:text-foreground">
							Sign in
						</a>
						<a href="/register" className="hover:text-foreground">
							Create account
						</a>
						<a href="/terms" className="hover:text-foreground">
							Terms
						</a>
						<a href="/privacy" className="hover:text-foreground">
							Privacy
						</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
