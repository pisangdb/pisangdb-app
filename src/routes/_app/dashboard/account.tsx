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
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import {
	useUserSettings,
	useWorkspaceStats,
} from "#/lib/hooks/useUserSettings";
import { MAX_RETENTION_HOURS } from "#/lib/types";

export const Route = createFileRoute("/_app/dashboard/account")({
	head: () => ({ meta: [{ title: "Account — PisangDB" }] }),
	component: AccountPage,
});

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

function formatJoinedAt(createdAt: string | null | undefined) {
	if (!createdAt) {
		return "Unknown";
	}

	return new Date(createdAt).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function AccountPage() {
	const { data: settings, isLoading: settingsLoading } = useUserSettings();
	const { data: workspaceStats, isLoading: statsLoading } = useWorkspaceStats();
	const profileSkeletonKeys = [
		"profile-name",
		"profile-email",
		"profile-role",
		"profile-joined",
	];

	if (settingsLoading || statsLoading) {
		return (
			<div className="flex flex-col gap-6 p-4 md:p-6">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">Account</h1>
					<p className="text-sm text-muted-foreground">
						Your profile, plan, and usage overview.
					</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-4 w-44" />
						</CardHeader>
						<CardContent className="grid gap-3 sm:grid-cols-2">
							{profileSkeletonKeys.map((key) => (
								<div key={key} className="rounded-md border p-3 text-sm">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="mt-2 h-4 w-28" />
								</div>
							))}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-4 w-56" />
						</CardHeader>
						<CardContent className="space-y-5">
							<Skeleton className="h-14 w-full" />
							<Skeleton className="h-14 w-full" />
							<Skeleton className="h-14 w-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	const user = settings?.user;
	const stats = workspaceStats;

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
							<p className="mt-1 text-muted-foreground">{user?.name}</p>
						</div>
						<div className="rounded-md border p-3 text-sm">
							<p className="flex items-center gap-1.5 font-medium">
								<MailIcon className="size-4" />
								Email
							</p>
							<p className="mt-1 text-muted-foreground">{user?.email}</p>
						</div>
						<div className="rounded-md border p-3 text-sm">
							<p className="flex items-center gap-1.5 font-medium">
								<BadgeCheckIcon className="size-4" />
								Role
							</p>
							<p className="mt-1 capitalize text-muted-foreground">
								{user?.role ?? "user"}
							</p>
						</div>
						<div className="rounded-md border p-3 text-sm">
							<p className="flex items-center gap-1.5 font-medium">
								<CalendarIcon className="size-4" />
								Joined
							</p>
							<p className="mt-1 text-muted-foreground">
								{formatJoinedAt(user?.createdAt)}
							</p>
						</div>
					</CardContent>
					<CardFooter className="pt-0">
						<Button asChild size="sm" className="w-fit">
							<Link to="/dashboard/settings">Edit account settings</Link>
						</Button>
					</CardFooter>
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
								value={stats?.activeSandboxes ?? 0}
								max={stats?.maxSandboxes ?? 5}
								label="Active sandboxes"
							/>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm font-medium">
								<BotIcon className="size-4 text-muted-foreground" />
								AI Seeder
							</div>
							<UsageBar
								value={stats?.aiRequestsToday ?? 0}
								max={stats?.maxAiRequestsPerDay ?? 30}
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
								<span className="font-semibold">
									{stats?.totalCreated ?? 0}
								</span>
							</div>
						</div>

						<p className="text-xs text-muted-foreground">
							Max size per sandbox:{" "}
							<span className="font-medium">
								{stats?.maxSizePerSandboxMb ?? 0} MB
							</span>
							{" · "}
							Max retention:{" "}
							<span className="font-medium">
								{Math.floor(MAX_RETENTION_HOURS / 24)} days
							</span>
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
