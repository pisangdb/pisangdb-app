import { Logo } from "#/components/logo";

const features = [
	"🐘 PostgreSQL",
	"🐬 MySQL",
	"🦭 MariaDB",
	"🧹 Auto-cleanup",
	"⚡ Ready < 2 detik",
];

export function AuthBrandingPanel() {
	return (
		<div className="relative hidden overflow-hidden border-r bg-background p-10 lg:flex lg:flex-col lg:items-start lg:justify-between">
			<div className="absolute inset-0 bg-linear-to-br from-primary/20 via-background to-primary/10" />
			<div className="absolute inset-0 bg-linear-to-t from-background/70 via-transparent to-background/40" />
			<div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-primary/20 blur-3xl" />
			<div className="absolute -top-20 -left-20 size-72 rounded-full bg-primary/10 blur-3xl" />

			<Logo
				size="md"
				className="relative z-10 [&_span]:text-foreground [&_.text-primary]:text-primary"
			/>

			<div className="relative z-10 space-y-4">
				<blockquote className="space-y-2">
					<p className="text-2xl font-semibold leading-snug text-foreground">
						"Fresh databases, peels away when done."
					</p>
					<p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
						Spin up isolated sandboxes in seconds for development, migration
						testing, and SQL learning without local setup.
					</p>
				</blockquote>

				<div className="flex flex-wrap gap-2 pt-2">
					{features.map((feature) => (
						<span
							key={feature}
							className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm"
						>
							{feature}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}
