import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BotIcon,
	CheckIcon,
	ClockIcon,
	CopyIcon,
	DatabaseIcon,
	GraduationCapIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TimerResetIcon,
	ZapIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "#/components/logo";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { buildSeoMeta, seoDefaults } from "#/lib/seo";

export const Route = createFileRoute("/")({
	head: () =>
		buildSeoMeta({
			title: "Ephemeral Database Sandboxes for Developers | PisangDB",
			description:
				"Spin up PostgreSQL, MySQL, and MariaDB sandboxes in seconds. Copy credentials instantly, run SQL in the browser, generate seed data with AI, and let TTL auto-cleanup handle the rest.",
			path: "/",
			keywords: [
				"ephemeral database",
				"temporary database",
				"postgresql sandbox",
				"mysql sandbox",
				"mariadb sandbox",
				"database for testing",
				"online sql console",
			],
		}),
	component: LandingPage,
});

/* ─── Data ───────────────────────────────────────────────── */

const features = [
	{
		icon: DatabaseIcon,
		title: "Multi-Engine Support",
		desc: "PostgreSQL 16, MySQL 8, and MariaDB 11 — pick the engine that matches your stack.",
		color: "text-blue-500",
		bg: "bg-blue-500/10",
	},
	{
		icon: ZapIcon,
		title: "Ready in 2 Seconds",
		desc: "Credentials are provisioned instantly. No docker, no local install, no waiting.",
		color: "text-yellow-500",
		bg: "bg-yellow-500/10",
	},
	{
		icon: TimerResetIcon,
		title: "Auto TTL Cleanup",
		desc: "Set retention from 1 hour to 7 days. Expired sandboxes are destroyed automatically.",
		color: "text-green-500",
		bg: "bg-green-500/10",
	},
	{
		icon: CopyIcon,
		title: "SQL Console",
		desc: "Run queries directly in the browser — no external client needed.",
		color: "text-purple-500",
		bg: "bg-purple-500/10",
	},
	{
		icon: BotIcon,
		title: "AI Seeder",
		desc: "Generate schema and seed data using natural language with configurable AI provider.",
		color: "text-pink-500",
		bg: "bg-pink-500/10",
	},
	{
		icon: ShieldCheckIcon,
		title: "Isolated Sandboxes",
		desc: "Each sandbox gets its own credentials and DB user — fully isolated from others.",
		color: "text-orange-500",
		bg: "bg-orange-500/10",
	},
];

const engines = [
	{ emoji: "🐘", name: "PostgreSQL 16", port: "5432" },
	{ emoji: "🐬", name: "MySQL 8", port: "3306" },
	{ emoji: "🦭", name: "MariaDB 11", port: "3307" },
];

const regions = [
	{ flag: "🇮🇩", name: "Indonesia", active: true },
	{ flag: "🇸🇬", name: "Singapore", active: false },
	{ flag: "🇺🇸", name: "United States", active: false },
];

const stats = [
	{ label: "Database engines", value: "3" },
	{ label: "Max sandboxes (free)", value: "5" },
	{ label: "Max size per sandbox", value: "100 MB" },
	{ label: "Max retention", value: "7 days" },
];

const freePlanFeatures = [
	"5 active sandboxes",
	"100 MB per sandbox",
	"Retention 1h – 7 days",
	"3 database engines",
	"SQL Console (browser-based)",
	"AI Seeder — 30 requests/month",
	"Auto-cleanup on expiry",
	"Instant credentials copy",
];

const useCases = [
	{
		icon: GraduationCapIcon,
		title: "Bootcamp & learning",
		desc: "Get a live database in seconds — focus on learning, not setup.",
	},
	{
		icon: ZapIcon,
		title: "Fast prototyping",
		desc: "Skip local engine setup and ship a working prototype faster.",
	},
	{
		icon: ClockIcon,
		title: "Migration testing",
		desc: "Validate schema migrations safely before touching production.",
	},
];

/* ─── Component ──────────────────────────────────────────── */

const SCENARIOS = [
	{
		name: "migration-check",
		engine: "PostgreSQL 16",
		region: "Indonesia",
		url: "DATABASE_URL=postgresql://sb_a1b2x8:s3cr3t@id.pisangdb.com:5433/pisang_a1b2_migration_x8k2m9",
		ttl: "6h",
	},
	{
		name: "bootcamp-prisma",
		engine: "MySQL 8",
		region: "Indonesia",
		url: "DATABASE_URL=mysql://sb_c3d4y9:s3cr3t@id.pisangdb.com:3306/pisang_c3d4_bootcamp_prisma_z7j1",
		ttl: "24h",
	},
	{
		name: "quick-test",
		engine: "MariaDB 11",
		region: "Indonesia",
		url: "DATABASE_URL=mysql://sb_e5f6z1:s3cr3t@id.pisangdb.com:3307/pisang_e5f6_quick_test_q2w3",
		ttl: "1h",
	},
];

function cx(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

type LandingButtonProps = {
	children: React.ReactNode;
	className?: string;
	size?: "sm" | "lg";
	to: string;
	variant?: "default" | "ghost" | "outline";
};

function LandingButton({
	children,
	className,
	size = "lg",
	to,
	variant = "default",
}: LandingButtonProps) {
	return (
		<Link
			to={to as never}
			className={cx(
				"inline-flex items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
				size === "sm" ? "h-8 px-3" : "h-10 px-4",
				variant === "default" &&
					"border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
				variant === "outline" &&
					"border-border bg-background text-foreground hover:bg-muted",
				variant === "ghost" &&
					"border-transparent bg-transparent text-foreground hover:bg-muted",
				className,
			)}
		>
			{children}
		</Link>
	);
}

type LandingBadgeProps = {
	children: React.ReactNode;
	className?: string;
	variant?: "outline" | "secondary";
};

function LandingBadge({
	children,
	className,
	variant = "secondary",
}: LandingBadgeProps) {
	return (
		<span
			className={cx(
				"inline-flex h-5 w-fit items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium",
				variant === "secondary" &&
					"border-transparent bg-secondary text-secondary-foreground",
				variant === "outline" && "border-border bg-background text-foreground",
				className,
			)}
		>
			{children}
		</span>
	);
}

function SandboxPreviewHero() {
	const [scenarioIdx, setScenarioIdx] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setScenarioIdx((cur) => (cur + 1) % SCENARIOS.length);
		}, 3200);

		return () => clearInterval(interval);
	}, []);

	const scenario = SCENARIOS[scenarioIdx];
	if (!scenario) return null;

	return (
		<div className="w-full max-w-2xl overflow-hidden rounded-2xl border bg-card text-left shadow-xl">
			<div className="flex items-center border-b bg-muted/40 px-4 py-3">
				<div>
					<p className="text-sm font-medium">Sandbox credentials preview</p>
					<p className="text-xs text-muted-foreground">
						Copy the connection string and start building immediately.
					</p>
				</div>
				<span className="ml-auto flex gap-1.5">
					{SCENARIOS.map((s, idx) => (
						<span
							key={s.name}
							className={`size-2 rounded-full transition-colors duration-300 ${idx === scenarioIdx ? "bg-primary" : "bg-border"}`}
						/>
					))}
				</span>
			</div>
			<div className="space-y-4 p-4">
				<div className="grid gap-3 sm:grid-cols-3">
					<div className="rounded-xl border bg-background p-3">
						<p className="text-xs text-muted-foreground">Sandbox</p>
						<p className="mt-1 text-sm font-medium">{scenario.name}</p>
					</div>
					<div className="rounded-xl border bg-background p-3">
						<p className="text-xs text-muted-foreground">Engine</p>
						<p className="mt-1 text-sm font-medium">{scenario.engine}</p>
					</div>
					<div className="rounded-xl border bg-background p-3">
						<p className="text-xs text-muted-foreground">TTL</p>
						<p className="mt-1 text-sm font-medium">{scenario.ttl}</p>
					</div>
				</div>
				<div className="rounded-xl border bg-background p-3">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-xs text-muted-foreground">Connection string</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Region {scenario.region} · Ready to copy
							</p>
						</div>
						<LandingBadge className="shrink-0">
							<CopyIcon className="mr-1 size-3" />
							Copy
						</LandingBadge>
					</div>
					<p className="mt-3 break-all rounded-lg bg-muted/50 p-3 font-mono text-xs text-foreground">
						{scenario.url}
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="rounded-xl border bg-background p-3">
						<p className="text-xs text-muted-foreground">Retention</p>
						<p className="mt-1 text-sm font-medium">
							Auto-cleanup enabled after {scenario.ttl}
						</p>
					</div>
					<div className="rounded-xl border bg-background p-3">
						<p className="text-xs text-muted-foreground">Isolation</p>
						<p className="mt-1 text-sm font-medium">
							Dedicated DB user and sandbox credentials
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function LandingPage() {
	const softwareApplicationSchema = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: seoDefaults.siteName,
		applicationCategory: "DeveloperApplication",
		operatingSystem: "Web",
		url: seoDefaults.siteUrl,
		description:
			"Ephemeral database sandboxes for developers with instant credentials, browser SQL console, and automatic cleanup.",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		featureList: [
			"PostgreSQL 16, MySQL 8, and MariaDB 11 sandboxes",
			"Instant database credentials",
			"Browser-based SQL console",
			"AI-powered schema and seed generation",
			"Automatic TTL cleanup",
		],
	};
	const organizationSchema = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: seoDefaults.siteName,
		url: seoDefaults.siteUrl,
		logo: `${seoDefaults.siteUrl}/logo512.png`,
		email: "hello@pisangdb.com",
	};
	const websiteSchema = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: seoDefaults.siteName,
		url: seoDefaults.siteUrl,
		description: seoDefaults.defaultDescription,
		publisher: {
			"@type": "Organization",
			name: seoDefaults.siteName,
		},
	};
	const homeSchemas = [
		softwareApplicationSchema,
		organizationSchema,
		websiteSchema,
	];

	return (
		<div className="relative min-h-svh bg-background text-foreground">
			{/* Background glows */}
			<div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-linear-to-b from-primary/8 via-background/50 to-transparent" />
			<div className="pointer-events-none absolute left-1/4 top-32 size-48 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl motion-safe:animate-pulse" />
			<div className="pointer-events-none absolute right-1/4 top-48 size-36 translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl motion-safe:animate-pulse [animation-delay:700ms]" />

			{/* ── Header ── */}
			<header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8 md:py-5">
				<Logo size="md" />
				<nav className="flex items-center gap-2">
					<LandingButton variant="ghost" size="sm" to="/login">
						Sign in
					</LandingButton>
					<LandingButton size="sm" to="/register">
						Get started free
					</LandingButton>
				</nav>
			</header>

			<main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pb-20 pt-8 md:px-8 md:pt-14">
				{/* ── Hero ── */}
				<section className="flex flex-col items-center gap-6 text-center">
					<LandingBadge className="px-3 py-1">
						🍌 Free while in beta — no credit card required
					</LandingBadge>

					<h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
						Ephemeral databases,{" "}
						<span className="text-primary">ready in seconds</span>
					</h1>

					<p className="max-w-xl text-base text-muted-foreground sm:text-lg">
						Spin up isolated PostgreSQL, MySQL, or MariaDB sandboxes instantly.
						Copy the connection string, build and test, then let auto-cleanup do
						the rest.
					</p>

					<div className="flex flex-wrap justify-center gap-3">
						<LandingButton size="lg" to="/register">
							Create free sandbox
						</LandingButton>
						<LandingButton size="lg" variant="outline" to="/login">
							Sign in
						</LandingButton>
					</div>

					<SandboxPreviewHero />
				</section>

				{/* ── Stats bar ── */}
				<section className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 md:grid-cols-4 md:gap-4">
					{stats.map((stat) => (
						<div
							key={stat.label}
							className="flex flex-col items-center gap-1 p-2"
						>
							<span className="text-2xl font-bold tracking-tight text-primary">
								{stat.value}
							</span>
							<span className="text-center text-xs text-muted-foreground">
								{stat.label}
							</span>
						</div>
					))}
				</section>

				{/* ── How it works ── */}
				<section className="flex flex-col gap-8">
					<div className="text-center">
						<h2 className="text-2xl font-bold tracking-tight md:text-3xl">
							From zero to connected in 3 steps
						</h2>
						<p className="mt-2 text-sm text-muted-foreground md:text-base">
							No local setup. No waiting. Just copy and build.
						</p>
					</div>
					<div className="grid gap-4 md:grid-cols-3">
						{[
							{
								step: "01",
								title: "Choose your engine",
								desc: "Select PostgreSQL, MySQL, or MariaDB. Pick a region and retention time from 1 hour up to 7 days.",
								icon: DatabaseIcon,
							},
							{
								step: "02",
								title: "Copy credentials",
								desc: "Host, port, username, password, and full connection URL are ready instantly. Paste into your .env file.",
								icon: CopyIcon,
							},
							{
								step: "03",
								title: "Build. Test. Done.",
								desc: "Run migrations, seed data with AI, query via browser console. TTL handles cleanup automatically.",
								icon: SparklesIcon,
							},
						].map((item) => (
							<div
								key={item.step}
								className="relative flex flex-col gap-4 rounded-xl border bg-card p-5"
							>
								<span className="text-4xl font-black tracking-tighter text-primary/20">
									{item.step}
								</span>
								<div className="flex size-10 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground">
									<item.icon className="size-5" />
								</div>
								<div>
									<p className="font-semibold">{item.title}</p>
									<p className="mt-1 text-sm text-muted-foreground">
										{item.desc}
									</p>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* ── Features ── */}
				<section className="flex flex-col gap-8">
					<div className="text-center">
						<h2 className="text-2xl font-bold tracking-tight md:text-3xl">
							Everything you need, nothing you don't
						</h2>
						<p className="mt-2 text-sm text-muted-foreground md:text-base">
							Built for developers who move fast.
						</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((f) => (
							<div
								key={f.title}
								className="flex flex-col gap-3 rounded-xl border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
							>
								<div
									className={`flex size-10 items-center justify-center rounded-lg ${f.bg} ${f.color}`}
								>
									<f.icon className="size-5" />
								</div>
								<div>
									<p className="font-semibold">{f.title}</p>
									<p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* ── Engines & Regions ── */}
				<section className="grid gap-4 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Supported engines</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{engines.map((e) => (
								<div
									key={e.name}
									className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
								>
									<span className="font-medium">
										{e.emoji} {e.name}
									</span>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<span>:{e.port}</span>
										<LandingBadge>Active</LandingBadge>
									</div>
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Available regions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{regions.map((r) => (
								<div
									key={r.name}
									className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
								>
									<span className="font-medium">
										{r.flag} {r.name}
									</span>
									<LandingBadge variant={r.active ? "secondary" : "outline"}>
										{r.active ? "Active" : "Coming soon"}
									</LandingBadge>
								</div>
							))}
							<p className="text-xs text-muted-foreground">
								Singapore and US East regions are in development.
							</p>
						</CardContent>
					</Card>
				</section>

				{/* ── Use cases ── */}
				<section className="flex flex-col gap-8">
					<div className="text-center">
						<h2 className="text-2xl font-bold tracking-tight md:text-3xl">
							Who uses PisangDB?
						</h2>
					</div>
					<div className="grid gap-4 md:grid-cols-3">
						{useCases.map((u) => (
							<div
								key={u.title}
								className="flex items-start gap-4 rounded-xl border bg-card p-5"
							>
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground">
									<u.icon className="size-5" />
								</div>
								<div>
									<p className="font-semibold">{u.title}</p>
									<p className="mt-1 text-sm text-muted-foreground">{u.desc}</p>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* ── Pricing ── */}
				<section className="flex flex-col items-center gap-6">
					<div className="text-center">
						<LandingBadge className="mb-3">Pricing</LandingBadge>
						<h2 className="text-2xl font-bold tracking-tight md:text-3xl">
							Free during beta
						</h2>
						<p className="mt-2 text-sm text-muted-foreground md:text-base">
							Full access, no payment required. Limits may change post-beta.
						</p>
					</div>

					<div className="w-full max-w-md rounded-2xl border-2 border-primary/40 bg-card p-6 shadow-lg">
						<div className="mb-5 flex items-start justify-between">
							<div>
								<p className="text-xl font-bold">Free Plan</p>
								<p className="text-sm text-muted-foreground">
									For developers & learners
								</p>
							</div>
							<div className="text-right">
								<p className="text-4xl font-black">$0</p>
								<p className="text-xs text-muted-foreground">/month</p>
							</div>
						</div>

						<ul className="mb-6 space-y-2.5 text-sm">
							{freePlanFeatures.map((f) => (
								<li key={f} className="flex items-center gap-2.5">
									<CheckIcon className="size-4 shrink-0 text-primary" />
									<span>{f}</span>
								</li>
							))}
						</ul>

						<LandingButton className="w-full" size="lg" to="/register">
							Create free account →
						</LandingButton>
					</div>
					<p className="text-xs text-muted-foreground">
						*Limits may change when PisangDB exits beta.
					</p>
				</section>

				{/* ── Final CTA ── */}
				<section className="flex flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-center md:p-12">
					<h2 className="text-2xl font-bold tracking-tight md:text-4xl">
						Stop setting up databases. Start building.
					</h2>
					<p className="max-w-xl text-sm text-muted-foreground md:text-base">
						PisangDB gives you a production-like database in 2 seconds. When
						you're done, it disappears automatically.
					</p>
					<div className="flex flex-wrap justify-center gap-3">
						<LandingButton size="lg" to="/register">
							Create free sandbox
						</LandingButton>
						<LandingButton size="lg" variant="outline" to="/login">
							Sign in
						</LandingButton>
					</div>
				</section>
			</main>

			{/* ── Footer ── */}
			<footer className="relative z-10 border-t bg-background/80">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
					<p>
						© {new Date().getFullYear()} PisangDB 🍌 Fresh databases for
						developers.
					</p>
					<div className="flex flex-wrap items-center gap-4">
						<Link to="/login" className="hover:text-foreground">
							Sign in
						</Link>
						<Link to="/register" className="hover:text-foreground">
							Create account
						</Link>
						<Link to="/dashboard/help" className="hover:text-foreground">
							Help
						</Link>
						<Link to="/terms" className="hover:text-foreground">
							Terms
						</Link>
						<Link to="/privacy" className="hover:text-foreground">
							Privacy
						</Link>
					</div>
				</div>
			</footer>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: schema JSON-LD must be injected as raw JSON
				dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchemas) }}
			/>
		</div>
	);
}
