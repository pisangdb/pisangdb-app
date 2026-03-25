import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangleIcon,
	BellIcon,
	ComputerIcon,
	KeyRoundIcon,
	Link2Icon,
	Loader2Icon,
	ShieldCheckIcon,
	UserIcon,
} from "lucide-react";
import { useState } from "react";
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
} from "#/lib/hooks/useUserSettings";

export const Route = createFileRoute("/_app/dashboard/settings")({
	head: () => ({ meta: [{ title: "Settings — PisangDB" }] }),
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Settings</h1>
				<p className="text-sm text-muted-foreground">
					Manage your account and dashboard preferences.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<ProfileCard />
				<SecurityCard />
				<ConnectedAccountsCard />
				<SessionsCard />
				<NotificationsCard />
				<WorkspaceLimitsCard />
				<DangerZoneCard />
			</div>
		</div>
	);
}

// ─── Profile Card ──────────────────────────────────────────────────────────────

function ProfileCard() {
	const { data: settings, isLoading } = useUserSettings();
	const updateProfile = useUpdateProfile();
	const [name, setName] = useState("");

	const handleSave = () => {
		if (!name.trim()) return;
		updateProfile.mutate({ name });
	};

	if (isLoading) {
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
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<UserIcon className="size-4" />
					Profile
				</CardTitle>
				<CardDescription>Update your display name.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-2">
					<Label htmlFor="display-name">Display name</Label>
					<Input
						id="display-name"
						value={name || settings?.user?.name || ""}
						onChange={(e) => setName(e.target.value)}
						placeholder={settings?.user?.name}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						value={settings?.user?.email || ""}
						disabled
						className="bg-muted"
					/>
					<p className="text-xs text-muted-foreground">
						Email cannot be changed.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Label htmlFor="role">Role</Label>
					<Badge variant="secondary">{settings?.user?.role || "user"}</Badge>
				</div>
				<Button
					size="sm"
					onClick={handleSave}
					disabled={!name.trim() || updateProfile.isPending}
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
	const { data: settings } = useUserSettings();
	const changePassword = useChangePassword();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	// Check if user has credential account
	const hasCredentialAccount = settings?.accounts?.some(
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

	if (!hasCredentialAccount) {
		return (
			<Card>
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
		<Card>
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
	const { data: settings, isLoading } = useUserSettings();

	if (isLoading) {
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

	const accounts = settings?.accounts || [];

	return (
		<Card>
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
							{account.providerId === "credential" ? (
								<KeyRoundIcon className="size-4 text-muted-foreground" />
							) : (
								<span className="text-lg">
									{account.providerId === "google"
										? "🔗"
										: account.providerId === "github"
											? "🐙"
											: "🔐"}
								</span>
							)}
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
		<Card className="lg:col-span-2">
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
								{session.ipAddress || "Unknown IP"} • Created{" "}
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
	useState(() => {
		if (preferences) {
			setLocalPrefs(preferences);
		}
	});

	const handleSave = () => {
		updatePreferences.mutate(localPrefs);
	};

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
		<Card>
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
					disabled={updatePreferences.isPending}
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
	const { isLoading } = useUserSettings();
	// TODO: Create a dedicated $getWorkspaceStats endpoint
	// For now, use placeholder data

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
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<KeyRoundIcon className="size-4" />
					Workspace Limits
				</CardTitle>
				<CardDescription>Free tier quota and usage snapshot.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				<div className="flex items-center justify-between rounded-md border p-2">
					<span>Active sandboxes</span>
					<span className="font-medium">0 / 5</span>
				</div>
				<div className="flex items-center justify-between rounded-md border p-2">
					<span>AI requests today</span>
					<span className="font-medium">0 / 30</span>
				</div>
				<div className="flex items-center justify-between rounded-md border p-2">
					<span>Max size per sandbox</span>
					<span className="font-medium">100 MB</span>
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Danger Zone Card ──────────────────────────────────────────────────────────

function DangerZoneCard() {
	const { data: settings } = useUserSettings();
	const deleteAccount = useDeleteAccount();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const handleDeleteConfirm = () => {
		deleteAccount.mutate({
			confirmationEmail: settings?.user?.email || "",
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
				userEmail={settings?.user?.email || ""}
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
