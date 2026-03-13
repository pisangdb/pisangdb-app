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
}

export function LegalPageLayout({
	title,
	effectiveDate,
	sections,
}: LegalPageLayoutProps) {
	return (
		<div className="relative min-h-svh bg-background">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary/10 to-transparent" />

			<header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
				<Logo size="md" />
				<a
					href="/"
					className="text-sm text-muted-foreground hover:text-foreground"
				>
					Back to home
				</a>
			</header>

			<main className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-10 md:px-8 md:pb-14">
				<Card className="border-primary/20 bg-background/90 backdrop-blur-sm">
					<CardHeader className="space-y-3">
						<Badge variant="secondary" className="w-fit">
							Legal
						</Badge>
						<CardTitle className="text-2xl md:text-3xl">{title}</CardTitle>
						<p className="text-sm text-muted-foreground">
							Effective date: {effectiveDate}
						</p>
					</CardHeader>
				</Card>

				<div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
					<Card className="lg:sticky lg:top-6">
						<CardHeader className="pb-3">
							<CardTitle className="text-base">On this page</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
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
			</main>
		</div>
	);
}
