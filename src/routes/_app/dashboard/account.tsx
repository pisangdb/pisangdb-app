import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import {
	ActivityIcon,
	BadgeCheckIcon,
	CalendarIcon,
	DatabaseIcon,
	Link2Icon,
	MailIcon,
	Settings2Icon,
	ShieldCheckIcon,
	UserIcon,
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
import { Skeleton } from "#/components/ui/skeleton";
import {
	useUserSettings,
	useWorkspaceStats,
} from "#/lib/hooks/useUserSettings";
import { MAX_RETENTION_HOURS } from "#/lib/types";
import { $getUserSettings } from "#/modules/auth/serverFn";

export const Route = createFileRoute("/_app/dashboard/account")({
	loader: async () => {
		const userSettings = await $getUserSettings();
		return { userSettings };
	},
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
	const safeMax = Math.max(max, 1);
	const pct = Math.min(100, Math.round((value / safeMax) * 100));

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">{label}</span>
				<span className="font-medium">
					{value} / {max}
				</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
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
		return null;
	}

	return new Date(createdAt).toLocaleDateString("en-US", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function AccountPage() {
	const context = useRouteContext({ from: "/_app" });
	const { userSettings: initialUserSettings } = Route.useLoaderData();
	const { data: settings } = useUserSettings();
	const { data: workspaceStats, isLoading: statsLoading } = useWorkspaceStats();

	if (statsLoading) {
		return <AccountSkeleton />;
	}

	const resolvedSettings = settings ?? initialUserSettings;
	const user = {
		...context.user,
		...resolvedSettings?.user,
		createdAt: resolvedSettings?.user?.createdAt ?? null,
	};
	const stats = workspaceStats;
	const hasCredentialAccount = Boolean(
		resolvedSettings?.accounts?.some(
			(account) => account.providerId === "credential",
		),
	);
	const hasSocialAccount = Boolean(
		resolvedSettings?.accounts?.some(
			(account) => account.providerId !== "credential",
		),
	);
	const signInMethod =
		hasCredentialAccount && hasSocialAccount
			? "Password + OAuth"
			: hasCredentialAccount
				? "Password"
				: hasSocialAccount
					? "OAuth"
					: "Pending";
	const connectedAccounts = resolvedSettings?.accounts?.length ?? 0;
	const availableSlots = Math.max(
		0,
		(stats?.maxSandboxes ?? 5) - (stats?.activeSandboxes ?? 0),
	);

	return (
		<div className="flex flex-col gap-4 p-4 md:p-5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1">
						<UserIcon className="size-3.5" />
						Account Overview
					</Badge>
					<Badge variant="outline" className="rounded-full px-3 py-1">
						Identity and workspace usage
					</Badge>
					<Badge variant="outline" className="rounded-full px-3 py-1">
						Active:{" "}
						{stats ? `${stats.activeSandboxes}/${stats.maxSandboxes}` : "—"}
					</Badge>
					<Badge variant="outline" className="rounded-full px-3 py-1">
						{signInMethod}
					</Badge>
					<Badge variant="outline" className="rounded-full px-3 py-1">
						Connected: {connectedAccounts}
					</Badge>
				</div>
				<div className="flex flex-wrap gap-2">
					{user?.email && (
						<div className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
							{user.email}
						</div>
					)}
					{user?.createdAt && (
						<div className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
							Joined {formatJoinedAt(user.createdAt)}
						</div>
					)}
					<Button asChild size="sm">
						<Link to="/dashboard/settings">Open settings</Link>
					</Button>
					<Button asChild size="sm" variant="outline">
						<Link to="/dashboard/sandboxes">View sandboxes</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<Card className="border-border/80">
					<CardHeader>
						<CardTitle className="text-base">Identity Snapshot</CardTitle>
						<CardDescription>
							The core identity currently attached to your PisangDB workspace.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-2">
						<InfoItem
							icon={<UserIcon className="size-4" />}
							label="Display Name"
							value={user?.name}
						/>
						<InfoItem
							icon={<MailIcon className="size-4" />}
							label="Email"
							value={user?.email}
						/>
						<InfoItem
							icon={<BadgeCheckIcon className="size-4" />}
							label="Role"
							value={user?.role ?? "user"}
							capitalize
						/>
						<InfoItem
							icon={<CalendarIcon className="size-4" />}
							label="Joined"
							value={formatJoinedAt(user?.createdAt)}
						/>
					</CardContent>
				</Card>

				<Card className="border-border/80">
					<CardHeader>
						<CardTitle className="text-base">Access Snapshot</CardTitle>
						<CardDescription>
							A quick read on how this account authenticates and stays
							connected.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-2">
						<InfoItem
							icon={<ShieldCheckIcon className="size-4" />}
							label="Sign-in Method"
							value={signInMethod}
						/>
						<InfoItem
							icon={<Link2Icon className="size-4" />}
							label="Connected Accounts"
							value={`${connectedAccounts}`}
						/>
						<InfoItem
							icon={<DatabaseIcon className="size-4" />}
							label="Available Slots"
							value={`${availableSlots} of ${stats?.maxSandboxes ?? 5}`}
						/>
						<InfoItem
							icon={<ActivityIcon className="size-4" />}
							label="Total Created"
							value={`${stats?.totalCreated ?? 0}`}
						/>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
				<Card className="border-border/80">
					<CardHeader>
						<CardTitle className="text-base">Workspace Overview</CardTitle>
						<CardDescription>
							Current capacity and usage constraints for this account.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<UsageBar
							value={stats?.activeSandboxes ?? 0}
							max={stats?.maxSandboxes ?? 5}
							label="Active sandboxes"
						/>
						<UsageBar
							value={stats?.aiRequestsThisMonth ?? 0}
							max={stats?.maxAiRequestsPerMonth ?? 30}
							label="AI requests this month"
						/>
						<div className="grid gap-2 text-sm sm:grid-cols-2">
							<div className="flex items-center justify-between rounded-lg border p-3">
								<span className="text-muted-foreground">
									Max size per sandbox
								</span>
								<span className="font-medium">
									{stats?.maxSizePerSandboxMb ?? 0} MB
								</span>
							</div>
							<div className="flex items-center justify-between rounded-lg border p-3">
								<span className="text-muted-foreground">Max retention</span>
								<span className="font-medium">
									{Math.floor(MAX_RETENTION_HOURS / 24)} days
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-border/80">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Settings2Icon className="size-4" />
							Next Actions
						</CardTitle>
						<CardDescription>
							Jump to the pages where you can make account changes or keep
							building inside the workspace.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						<div className="rounded-xl border bg-muted/30 p-4 text-sm">
							<p className="font-medium">Need deeper account controls?</p>
							<p className="mt-1 text-muted-foreground">
								Use settings for profile edits, password changes, session
								review, linked providers, notifications, and account deletion.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button asChild size="sm">
								<Link to="/dashboard/settings">Open settings</Link>
							</Button>
							<Button asChild size="sm" variant="outline">
								<Link to="/dashboard/sandboxes">View sandboxes</Link>
							</Button>
							<Button asChild size="sm" variant="outline">
								<Link to="/dashboard/help">Open help center</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function InfoItem({
	icon,
	label,
	value,
	capitalize = false,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | null | undefined;
	capitalize?: boolean;
}) {
	return (
		<div className="rounded-xl border p-4 text-sm">
			<p className="flex items-center gap-1.5 font-medium text-foreground">
				{icon}
				{label}
			</p>
			<p
				className={`mt-2 text-muted-foreground ${capitalize ? "capitalize" : ""}`}
			>
				{value ?? "—"}
			</p>
		</div>
	);
}

function AccountSkeleton() {
	const profileSkeletonKeys = [
		"profile-name",
		"profile-email",
		"profile-role",
		"profile-joined",
	];

	return (
		<div className="flex flex-col gap-4 p-4 md:p-5">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Account</h1>
				<p className="text-sm text-muted-foreground">
					Your profile, plan, and usage overview.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-5 w-28" />
						<Skeleton className="h-4 w-52" />
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
						<Skeleton className="h-5 w-28" />
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
