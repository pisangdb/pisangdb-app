import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import {
	ActivityIcon,
	AlertTriangleIcon,
	BellIcon,
	ComputerIcon,
	KeyRoundIcon,
	Link2Icon,
	Loader2Icon,
	ShieldCheckIcon,
	UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DeleteAccountDialog } from "#/components/delete-account-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import {
	useChangePassword,
	useDeleteAccount,
	usePreferences,
	useRevokeAllSessions,
	useRevokeSession,
	useSessions,
	useUpdatePreferences,
	useUpdateProfile,
	useUserSettings,
	useWorkspaceStats,
} from "#/lib/hooks/useUserSettings";
import { MAX_RETENTION_HOURS } from "#/lib/types";
import { $getUserSettings } from "#/modules/auth/serverFn";

export const Route = createFileRoute("/_app/dashboard/settings")({
	loader: async () => {
		const userSettings = await $getUserSettings();
		return { userSettings };
	},
	head: () => ({ meta: [{ title: "Settings — PisangDB" }] }),
	component: SettingsPage,
});

function SettingsPage() {
	const context = useRouteContext({ from: "/_app" });
	const { userSettings: initialUserSettings } = Route.useLoaderData();
	const { data: settings } = useUserSettings();
	const { data: sessions } = useSessions();
	const resolvedSettings = settings ?? initialUserSettings;
	const user = {
		...context.user,
		...resolvedSettings?.user,
		createdAt: resolvedSettings?.user?.createdAt ?? null,
	};
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
	const otherSessions =
		sessions?.filter((session) => !session.isCurrent).length ?? 0;

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/60">
				<div className="flex flex-col gap-6 p-5 md:p-7">
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant="secondary"
							className="gap-1.5 rounded-full px-3 py-1"
						>
							<UserIcon className="size-3.5" />
							Account Control
						</Badge>
						<Badge variant="outline" className="rounded-full px-3 py-1">
							Profile, security, and sessions
						</Badge>
					</div>

					<div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] lg:items-end">
						<div className="space-y-3">
							<div className="space-y-2">
								<h1 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
									Keep your workspace identity, access, and preferences under
									control.
								</h1>
								<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
									Update your profile, manage active sessions, review linked
									providers, and check workspace limits from one place without
									hopping between account screens.
								</p>
							</div>
							{(user.email || user.createdAt) && (
								<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
									{user.email && (
										<div className="rounded-full border bg-background/80 px-3 py-1.5">
											{user.email}
										</div>
									)}
									{user.createdAt && (
										<div className="rounded-full border bg-background/80 px-3 py-1.5">
											Joined {formatDate(user.createdAt)}
										</div>
									)}
								</div>
							)}
						</div>

						<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
							<div className="rounded-xl border bg-background/80 p-4 shadow-sm">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Link2Icon className="size-4" />
									<p className="text-xs font-medium uppercase tracking-[0.16em]">
										Connected Accounts
									</p>
								</div>
								<p className="mt-3 text-2xl font-semibold">
									{connectedAccounts}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Authentication providers linked to this user.
								</p>
							</div>
							<div className="rounded-xl border bg-background/80 p-4 shadow-sm">
								<div className="flex items-center gap-2 text-muted-foreground">
									<ComputerIcon className="size-4" />
									<p className="text-xs font-medium uppercase tracking-[0.16em]">
										Other Sessions
									</p>
								</div>
								<p className="mt-3 text-2xl font-semibold">{otherSessions}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Devices that can be revoked without signing out here.
								</p>
							</div>
							<div className="rounded-xl border bg-background/80 p-4 shadow-sm">
								<div className="flex items-center gap-2 text-muted-foreground">
									<ActivityIcon className="size-4" />
									<p className="text-xs font-medium uppercase tracking-[0.16em]">
										Sign-in Method
									</p>
								</div>
								<p className="mt-3 text-lg font-semibold">{signInMethod}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									How this account currently authenticates into the dashboard.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="space-y-3">
				<div className="space-y-1">
					<h2 className="text-sm font-semibold tracking-tight">Identity</h2>
					<p className="text-xs text-muted-foreground">
						Core profile details, authentication methods, and notification
						defaults.
					</p>
				</div>
				<div className="grid gap-4 lg:grid-cols-2">
					<ProfileCard />
					<SecurityCard />
					<ConnectedAccountsCard />
					<NotificationsCard />
				</div>
			</section>

			<section className="space-y-3">
				<div className="space-y-1">
					<h2 className="text-sm font-semibold tracking-tight">
						Workspace Access
					</h2>
					<p className="text-xs text-muted-foreground">
						Review device sessions and current workspace quota in one pass.
					</p>
				</div>
				<div className="grid gap-4 lg:grid-cols-2">
					<SessionsCard />
					<WorkspaceLimitsCard />
				</div>
			</section>

			<section className="space-y-3">
				<div className="space-y-1">
					<h2 className="text-sm font-semibold tracking-tight text-destructive">
						Danger Zone
					</h2>
					<p className="text-xs text-muted-foreground">
						High-impact actions that permanently affect this account.
					</p>
				</div>
				<DangerZoneCard />
			</section>
		</div>
	);
}

// ─── Profile Card ──────────────────────────────────────────────────────────────

function ProfileCard() {
	const context = useRouteContext({ from: "/_app" });
	const { userSettings: initialUserSettings } = Route.useLoaderData();
	const { data: settings, isLoading } = useUserSettings();
	const updateProfile = useUpdateProfile();
	const [name, setName] = useState("");
	const resolvedSettings = settings ?? initialUserSettings;
	const resolvedUser = {
		...context.user,
		...resolvedSettings?.user,
	};
	const currentName = resolvedUser.name ?? "";

	useEffect(() => {
		setName(currentName);
	}, [currentName]);

	const handleSave = () => {
		const trimmedName = name.trim();
		if (!trimmedName || trimmedName === currentName) return;
		updateProfile.mutate({ name: trimmedName });
	};

	if (isLoading && !initialUserSettings) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<UserIcon className="size-4" />
						Profile
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-4">
						<Loader2Icon className="size-4 animate-spin" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-border/80">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<UserIcon className="size-4" />
					Profile
				</CardTitle>
				<CardDescription>
					Keep your public workspace identity up to date.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-2">
					<Label htmlFor="display-name">Display name</Label>
					<Input
						id="display-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={resolvedUser.name}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						value={resolvedUser.email || ""}
						disabled
						className="bg-muted"
					/>
					<p className="text-xs text-muted-foreground">
						Email cannot be changed.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Label htmlFor="role">Role</Label>
					<Badge variant="secondary">{resolvedUser.role || "user"}</Badge>
				</div>
				<Button
					size="sm"
					onClick={handleSave}
					disabled={
						!name.trim() ||
						name.trim() === currentName ||
						updateProfile.isPending
					}
				>
					{updateProfile.isPending ? (
						<>
							<Loader2Icon className="mr-2 size-4 animate-spin" />
							Saving...
						</>
					) : (
						"Save profile"
					)}
				</Button>
			</CardContent>
		</Card>
	);
}

// ─── Security Card ─────────────────────────────────────────────────────────────

function SecurityCard() {
	const { userSettings: initialUserSettings } = Route.useLoaderData();
	const { data: settings, isLoading } = useUserSettings();
	const changePassword = useChangePassword();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const resolvedSettings = settings ?? initialUserSettings;

	// Check if user has credential account
	const hasCredentialAccount = resolvedSettings?.accounts?.some(
		(a) => a.providerId === "credential",
	);

	const handleChangePassword = () => {
		if (newPassword !== confirmPassword) {
			return;
		}
		changePassword.mutate({
			currentPassword,
			newPassword,
		});
	};

	useEffect(() => {
		if (changePassword.isSuccess) {
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		}
	}, [changePassword.isSuccess]);

	if (isLoading && !initialUserSettings) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<ShieldCheckIcon className="size-4" />
						Security
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-4">
						<Loader2Icon className="size-4 animate-spin" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!hasCredentialAccount) {
		return (
			<Card className="border-border/80">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<ShieldCheckIcon className="size-4" />
						Security
					</CardTitle>
					<CardDescription>
						Password management is not available for OAuth accounts.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground">
					You signed up using a social provider. Your password is managed by
					that provider.
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-border/80">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<ShieldCheckIcon className="size-4" />
					Security
				</CardTitle>
				<CardDescription>Manage your password.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-2">
					<Label htmlFor="current-password">Current password</Label>
					<Input
						id="current-password"
						type="password"
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="new-password">New password</Label>
					<Input
						id="new-password"
						type="password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="confirm-password">Confirm new password</Label>
					<Input
						id="confirm-password"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
					/>
				</div>
				{confirmPassword && newPassword !== confirmPassword && (
					<p className="text-xs text-destructive">
						Confirmation password must match the new password.
					</p>
				)}
				<Button
					size="sm"
					onClick={handleChangePassword}
					disabled={
						!currentPassword ||
						!newPassword ||
						newPassword !== confirmPassword ||
						changePassword.isPending
					}
				>
					{changePassword.isPending ? (
						<>
							<Loader2Icon className="mr-2 size-4 animate-spin" />
							Updating...
						</>
					) : (
						"Change password"
					)}
				</Button>
			</CardContent>
		</Card>
	);
}

// ─── Connected Accounts Card ───────────────────────────────────────────────────

function ConnectedAccountsCard() {
	const { userSettings: initialUserSettings } = Route.useLoaderData();
	const { data: settings, isLoading } = useUserSettings();

	if (isLoading && !initialUserSettings) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Link2Icon className="size-4" />
						Connected Accounts
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-4">
						<Loader2Icon className="size-4 animate-spin" />
					</div>
				</CardContent>
			</Card>
		);
	}

	const accounts = settings?.accounts || initialUserSettings?.accounts || [];

	return (
		<Card className="border-border/80">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Link2Icon className="size-4" />
					Connected Accounts
				</CardTitle>
				<CardDescription>Your linked authentication providers.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				{accounts.map((account) => (
					<div
						key={account.id}
						className="flex items-center justify-between rounded-md border p-3 text-sm"
					>
						<div className="flex items-center gap-2">
							<KeyRoundIcon className="size-4 text-muted-foreground" />
							<span className="capitalize">{account.providerId}</span>
						</div>
						<Badge variant="outline" className="text-xs">
							Connected
						</Badge>
					</div>
				))}
				{accounts.length === 0 && (
					<p className="text-sm text-muted-foreground">
						No accounts connected.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

// ─── Sessions Card ─────────────────────────────────────────────────────────────

function SessionsCard() {
	const { data: sessions, isLoading } = useSessions();
	const revokeSession = useRevokeSession();
	const revokeAllSessions = useRevokeAllSessions();

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<ComputerIcon className="size-4" />
						Active Sessions
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-4">
						<Loader2Icon className="size-4 animate-spin" />
					</div>
				</CardContent>
			</Card>
		);
	}

	const otherSessions = sessions?.filter((s) => !s.isCurrent) || [];

	return (
		<Card className="border-border/80 lg:col-span-2">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<ComputerIcon className="size-4" />
					Active Sessions
				</CardTitle>
				<CardDescription>
					Manage your active sessions across devices.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{sessions?.map((session) => (
					<div
						key={session.id}
						className="flex items-center justify-between rounded-md border p-3 text-sm"
					>
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<span className="font-medium">
									{parseUserAgent(session.userAgent)}
								</span>
								{session.isCurrent && (
									<Badge variant="default" className="text-xs">
										Current
									</Badge>
								)}
							</div>
							<div className="text-xs text-muted-foreground">
								{session.ipAddress || "IP unavailable"} • Created{" "}
								{formatRelativeTime(session.createdAt)}
							</div>
						</div>
						{!session.isCurrent && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => revokeSession.mutate(session.token)}
								disabled={revokeSession.isPending}
							>
								Revoke
							</Button>
						)}
					</div>
				))}
				{otherSessions.length > 0 && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => revokeAllSessions.mutate()}
						disabled={revokeAllSessions.isPending}
					>
						{revokeAllSessions.isPending ? (
							<>
								<Loader2Icon className="mr-2 size-4 animate-spin" />
								Signing out...
							</>
						) : (
							"Sign out all other sessions"
						)}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

// ─── Notifications Card ────────────────────────────────────────────────────────

function NotificationsCard() {
	const { data: preferences, isLoading } = usePreferences();
	const updatePreferences = useUpdatePreferences();
	const [localPrefs, setLocalPrefs] = useState({
		sandboxExpiryWarning: true,
		productUpdates: false,
	});

	// Sync local state with server state
	useEffect(() => {
		if (preferences) {
			setLocalPrefs(preferences);
		}
	}, [preferences]);

	const handleSave = () => {
		updatePreferences.mutate(localPrefs);
	};
	const hasChanges =
		localPrefs.sandboxExpiryWarning !==
			(preferences?.sandboxExpiryWarning ?? true) ||
		localPrefs.productUpdates !== (preferences?.productUpdates ?? false);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<BellIcon className="size-4" />
						Notifications
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-4">
						<Loader2Icon className="size-4 animate-spin" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-border/80">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<BellIcon className="size-4" />
					Notifications
				</CardTitle>
				<CardDescription>
					Choose what updates you receive from PisangDB.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label>Sandbox expiry warning</Label>
						<p className="text-xs text-muted-foreground">
							Notify when sandbox has less than 30 minutes TTL.
						</p>
					</div>
					<Switch
						checked={localPrefs.sandboxExpiryWarning}
						onCheckedChange={(checked) =>
							setLocalPrefs((p) => ({ ...p, sandboxExpiryWarning: checked }))
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label>Product updates</Label>
						<p className="text-xs text-muted-foreground">
							Get feature announcements and release notes.
						</p>
					</div>
					<Switch
						checked={localPrefs.productUpdates}
						onCheckedChange={(checked) =>
							setLocalPrefs((p) => ({ ...p, productUpdates: checked }))
						}
					/>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={handleSave}
					disabled={updatePreferences.isPending || !hasChanges}
				>
					{updatePreferences.isPending ? (
						<>
							<Loader2Icon className="mr-2 size-4 animate-spin" />
							Saving...
						</>
					) : (
						"Save preferences"
					)}
				</Button>
			</CardContent>
		</Card>
	);
}

// ─── Workspace Limits Card ──────────────────────────────────────────────────────

function WorkspaceLimitsCard() {
	const { data: workspaceStats, isLoading } = useWorkspaceStats();

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<KeyRoundIcon className="size-4" />
						Workspace Limits
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-4">
						<Loader2Icon className="size-4 animate-spin" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-border/80">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<KeyRoundIcon className="size-4" />
					Workspace Limits
				</CardTitle>
				<CardDescription>Free tier quota and usage snapshot.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				<div className="rounded-xl border bg-muted/20 p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-foreground">
								Sandbox Capacity
							</p>
							<p className="text-xs text-muted-foreground">
								{workspaceStats?.activeSandboxes ?? 0} active sandboxes are
								currently running in this workspace.
							</p>
						</div>
						<p className="text-lg font-semibold text-foreground">
							{workspaceStats
								? `${Math.min(
										100,
										Math.round(
											((workspaceStats.activeSandboxes ?? 0) /
												Math.max(workspaceStats.maxSandboxes ?? 1, 1)) *
												100,
										),
									)}%`
								: "—"}
						</p>
					</div>
					<div className="mt-3 h-2 rounded-full bg-muted">
						<div
							className="h-2 rounded-full bg-primary transition-all"
							style={{
								width: `${
									workspaceStats
										? Math.min(
												100,
												Math.round(
													((workspaceStats.activeSandboxes ?? 0) /
														Math.max(workspaceStats.maxSandboxes ?? 1, 1)) *
														100,
												),
											)
										: 0
								}%`,
							}}
						/>
					</div>
				</div>
				<div className="flex items-center justify-between rounded-md border p-2">
					<span>AI requests today</span>
					<span className="font-medium">
						{workspaceStats?.aiRequestsToday ?? 0} /{" "}
						{workspaceStats?.maxAiRequestsPerDay ?? 30}
					</span>
				</div>
				<div className="flex items-center justify-between rounded-md border p-2">
					<span>Available sandbox slots</span>
					<span className="font-medium">
						{Math.max(
							(workspaceStats?.maxSandboxes ?? 5) -
								(workspaceStats?.activeSandboxes ?? 0),
							0,
						)}{" "}
						slot(s)
					</span>
				</div>
				<div className="flex items-center justify-between rounded-md border p-2">
					<span>Max size per sandbox</span>
					<span className="font-medium">
						{workspaceStats?.maxSizePerSandboxMb ?? 100} MB
					</span>
				</div>
				<div className="flex items-center justify-between rounded-md border p-2">
					<span>Max retention</span>
					<span className="font-medium">
						{Math.floor(MAX_RETENTION_HOURS / 24)} days
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Danger Zone Card ──────────────────────────────────────────────────────────

function DangerZoneCard() {
	const context = useRouteContext({ from: "/_app" });
	const { userSettings: initialUserSettings } = Route.useLoaderData();
	const { data: settings } = useUserSettings();
	const deleteAccount = useDeleteAccount();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const resolvedEmail =
		settings?.user?.email ||
		initialUserSettings?.user?.email ||
		context.user.email ||
		"";

	const handleDeleteConfirm = () => {
		deleteAccount.mutate({
			confirmationEmail: resolvedEmail,
		});
	};

	return (
		<>
			<Card className="border-destructive/50 lg:col-span-2">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base text-destructive">
						<AlertTriangleIcon className="size-4" />
						Danger Zone
					</CardTitle>
					<CardDescription>
						Irreversible actions that affect your account.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-4">
						<div className="space-y-0.5">
							<p className="font-medium">Delete Account</p>
							<p className="text-xs text-muted-foreground">
								Permanently delete your account and all associated data. This
								action cannot be undone.
							</p>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onClick={() => setShowDeleteDialog(true)}
						>
							Delete Account
						</Button>
					</div>
				</CardContent>
			</Card>

			<DeleteAccountDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				userEmail={resolvedEmail}
				onConfirm={handleDeleteConfirm}
				isLoading={deleteAccount.isPending}
			/>
		</>
	);
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function parseUserAgent(userAgent: string | null): string {
	if (!userAgent) return "Unknown device";

	// Simple user agent parsing
	if (userAgent.includes("Chrome")) {
		if (userAgent.includes("Edg")) return "Edge";
		if (userAgent.includes("OPR")) return "Opera";
		return "Chrome";
	}
	if (userAgent.includes("Firefox")) return "Firefox";
	if (userAgent.includes("Safari")) return "Safari";
	if (userAgent.includes("Mobile")) return "Mobile";

	// OS detection
	if (userAgent.includes("Windows")) return "Windows";
	if (userAgent.includes("Mac")) return "Mac";
	if (userAgent.includes("Linux")) return "Linux";

	return "Unknown device";
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - new Date(date).getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	return "just now";
}

function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(date));
}
