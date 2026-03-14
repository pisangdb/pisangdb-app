import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ExternalLinkIcon,
	LifeBuoyIcon,
	MessageSquareIcon,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/_app/dashboard/help")({
	component: HelpPage,
});

function HelpPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Get Help</h1>
				<p className="text-sm text-muted-foreground">
					Quick support links and onboarding resources.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<LifeBuoyIcon className="size-4" />
							Documentation
						</CardTitle>
						<CardDescription>Read setup and usage guides.</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="outline" size="sm" className="gap-1.5">
							Open docs
							<ExternalLinkIcon className="size-3.5" />
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<MessageSquareIcon className="size-4" />
							Contact Support
						</CardTitle>
						<CardDescription>
							Send a message for account or sandbox issues.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button size="sm">Create support ticket</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Popular Destinations</CardTitle>
						<CardDescription>Jump directly to core pages.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2 text-sm">
						<Button
							asChild
							variant="outline"
							size="sm"
							className="justify-start"
						>
							<Link to="/dashboard/sandboxes/new">Create sandbox</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="sm"
							className="justify-start"
						>
							<Link to="/dashboard/console">Open SQL console</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="sm"
							className="justify-start"
						>
							<Link to="/dashboard/ai-seeder">Open AI Seeder</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
