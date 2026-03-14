import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	BadgeCheckIcon,
	BotIcon,
	CalendarIcon,
	DatabaseIcon,
	MailIcon,
	UserIcon,
} from "lucide-react";
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

const dummyUser = {
	name: "Rio Developer",
	email: "rio@example.com",
	role: "user",
	joinedAt: "12 March 2026",
	activeSandboxes: 2,
	maxSandboxes: 5,
	totalCreated: 14,
	aiRequestsToday: 8,
	maxAiRequestsPerDay: 30,
};

function UsageBar({
	value,
	max,
	label,
}: {
	value: number;
	max: number;
	label: string;
}) {
	const pct = Math.round((value / max) * 100);
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">{label}</span>
				<span className="font-medium">
					{value} / {max}
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-all"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

function AccountPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Account</h1>
				<p className="text-sm text-muted-foreground">
					Your profile, plan, and usage overview.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Profile card */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Profile</CardTitle>
						<CardDescription>
							Your account identity on PisangDB.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-2">
						<div className="rounded-md border p-3 text-sm">
							<p className="flex items-center gap-1.5 font-medium">
								<UserIcon className="size-4" />
								Name
							</p>
							<p className="mt-1 text-muted-foreground">{dummyUser.name}</p>
						</div>
						<div className="rounded-md border p-3 text-sm">
							<p className="flex items-center gap-1.5 font-medium">
								<MailIcon className="size-4" />
								Email
							</p>
							<p className="mt-1 text-muted-foreground">{dummyUser.email}</p>
						</div>
						<div className="rounded-md border p-3 text-sm">
							<p className="flex items-center gap-1.5 font-medium">
								<BadgeCheckIcon className="size-4" />
								Role
							</p>
							<p className="mt-1 capitalize text-muted-foreground">
								{dummyUser.role} — Free tier
							</p>
						</div>
						<div className="rounded-md border p-3 text-sm">
							<p className="flex items-center gap-1.5 font-medium">
								<CalendarIcon className="size-4" />
								Joined
							</p>
							<p className="mt-1 text-muted-foreground">{dummyUser.joinedAt}</p>
						</div>
						<div className="sm:col-span-2">
							<Button asChild size="sm" className="w-fit">
								<Link to="/dashboard/settings">Edit account settings</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Usage card */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Usage</CardTitle>
						<CardDescription>
							Free tier limits refresh daily or on sandbox delete.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm font-medium">
								<DatabaseIcon className="size-4 text-muted-foreground" />
								Sandboxes
							</div>
							<UsageBar
								value={dummyUser.activeSandboxes}
								max={dummyUser.maxSandboxes}
								label="Active sandboxes"
							/>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm font-medium">
								<BotIcon className="size-4 text-muted-foreground" />
								AI Seeder
							</div>
							<UsageBar
								value={dummyUser.aiRequestsToday}
								max={dummyUser.maxAiRequestsPerDay}
								label="AI requests today"
							/>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm font-medium">
								<ActivityIcon className="size-4 text-muted-foreground" />
								Lifetime
							</div>
							<div className="flex items-center justify-between rounded-md border p-2.5 text-sm">
								<span className="text-muted-foreground">
									Total sandboxes created
								</span>
								<span className="font-semibold">{dummyUser.totalCreated}</span>
							</div>
						</div>

						<p className="text-xs text-muted-foreground">
							Max size per sandbox: <span className="font-medium">100 MB</span>
							{" · "}
							Max retention: <span className="font-medium">7 days</span>
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
