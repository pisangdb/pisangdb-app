import { Link } from "@tanstack/react-router";
import { Logo } from "#/components/logo";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";

export interface LegalSection {
	id: string;
	title: string;
	content: string[];
	bullets?: string[];
}

interface LegalPageLayoutProps {
	title: string;
	effectiveDate: string;
	sections: LegalSection[];
	contactLabel: string;
	contactHref: string;
}

export function LegalPageLayout({
	title,
	effectiveDate,
	sections,
	contactLabel,
	contactHref,
}: LegalPageLayoutProps) {
	return (
		<div className="relative min-h-svh bg-background">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary/10 to-transparent" />

			{/* Header */}
			<header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
				<Logo size="md" />
				<div className="flex items-center gap-4 text-sm">
					<Link to="/" className="text-muted-foreground hover:text-foreground">
						← Back to home
					</Link>
					<Link
						to="/register"
						className="text-muted-foreground hover:text-foreground"
					>
						Create account
					</Link>
				</div>
			</header>

			<main className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 pb-10 md:px-8 md:pb-14">
				{/* Title card */}
				<Card className="border-primary/20 bg-background/90 backdrop-blur-sm">
					<CardHeader className="space-y-3">
						<Badge variant="secondary" className="w-fit">
							Legal
						</Badge>
						<CardTitle className="text-2xl md:text-3xl">{title}</CardTitle>
						<p className="text-sm text-muted-foreground">
							Effective date:{" "}
							<span className="font-medium text-foreground">
								{effectiveDate}
							</span>
						</p>
					</CardHeader>
				</Card>

				{/* TOC + Content */}
				<div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
					{/* Sticky sidebar TOC */}
					<Card className="lg:sticky lg:top-6">
						<CardHeader className="pb-3">
							<CardTitle className="text-base">On this page</CardTitle>
						</CardHeader>
						<CardContent className="space-y-1 text-sm">
							{sections.map((section) => (
								<a
									key={section.id}
									href={`#${section.id}`}
									className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
								>
									{section.title}
								</a>
							))}
						</CardContent>
					</Card>

					{/* Main content */}
					<Card>
						<CardContent className="space-y-6 pt-6 text-sm text-muted-foreground md:text-base">
							{sections.map((section, index) => {
								const isLast = index === sections.length - 1;
								return (
									<div key={section.id} className="space-y-6">
										<section id={section.id} className="scroll-mt-24 space-y-3">
											<h2 className="text-base font-semibold text-foreground md:text-lg">
												{section.title}
											</h2>
											<div className="space-y-3">
												{section.content.map((paragraph) => (
													<p key={paragraph}>{paragraph}</p>
												))}
											</div>
											{section.bullets ? (
												<ul className="list-disc space-y-2 pl-5">
													{section.bullets.map((bullet) => (
														<li key={bullet}>{bullet}</li>
													))}
												</ul>
											) : null}
										</section>
										{!isLast && <Separator />}
									</div>
								);
							})}
						</CardContent>
					</Card>
				</div>

				{/* Footer card */}
				<Card>
					<CardContent className="flex flex-col gap-2 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
						<p>
							Last updated:{" "}
							<span className="text-foreground">{effectiveDate}</span>
						</p>
						<p>
							Contact:{" "}
							<a
								href={contactHref}
								className="text-foreground underline underline-offset-4"
							>
								{contactLabel}
							</a>
						</p>
					</CardContent>
				</Card>
			</main>

			{/* Site footer */}
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
						<Link to="/terms" className="hover:text-foreground">
							Terms
						</Link>
						<Link to="/privacy" className="hover:text-foreground">
							Privacy
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
