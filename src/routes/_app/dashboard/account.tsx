import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheckIcon, MailIcon, UserIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/_app/dashboard/account")({
	component: AccountPage,
});

function AccountPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Account</h1>
				<p className="text-sm text-muted-foreground">
					Your account profile and workspace role.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Profile Overview</CardTitle>
					<CardDescription>Dummy profile data for MVP UI.</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2">
					<div className="rounded-md border p-3 text-sm">
						<p className="flex items-center gap-1.5 font-medium">
							<UserIcon className="size-4" />
							Name
						</p>
						<p className="mt-1 text-muted-foreground">Rio Developer</p>
					</div>
					<div className="rounded-md border p-3 text-sm">
						<p className="flex items-center gap-1.5 font-medium">
							<MailIcon className="size-4" />
							Email
						</p>
						<p className="mt-1 text-muted-foreground">rio@example.com</p>
					</div>
					<div className="rounded-md border p-3 text-sm sm:col-span-2">
						<p className="flex items-center gap-1.5 font-medium">
							<BadgeCheckIcon className="size-4" />
							Role
						</p>
						<p className="mt-1 text-muted-foreground">User (free tier)</p>
					</div>
					<Button size="sm" className="w-fit">
						Edit account settings
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
