import { createFileRoute } from "@tanstack/react-router";
import {
	BellIcon,
	KeyRoundIcon,
	Loader2Icon,
	LogOutIcon,
	ShieldCheckIcon,
	UserIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { useAuth } from "#/contexts/auth-context";
import { useSandboxes } from "#/hooks/use-sandboxes";

export const Route = createFileRoute("/_app/dashboard/settings")({
	head: () => ({ meta: [{ title: "Settings — PisangDB" }] }),
	component: SettingsPage,
});

function SettingsPage() {
	const { user, isLoading: userLoading } = useAuth();
	const { data: sandboxesData } = useSandboxes();

	const [displayName, setDisplayName] = useState(user?.name ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [expireWarning, setExpireWarning] = useState(true);
	const [newsletter, setNewsletter] = useState(false);
	const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
	const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

	// Update form when user data loads
	useState(() => {
		if (user) {
			setDisplayName(user.name);
			setEmail(user.email);
		}
	});

	const activeSandboxes =
		sandboxesData?.sandboxes?.filter((s) => s.status === "active").length ?? 0;

	const handleSaveProfile = async () => {
		if (!displayName.trim()) {
			toast.error("Display name is required");
			return;
		}
		setIsUpdatingProfile(true);
		try {
			// TODO: Call actual API endpoint when available
			await new Promise((resolve) => setTimeout(resolve, 500));
			toast.success("Profile saved", {
				description: `Display name updated to "${displayName}".`,
			});
		} catch (error) {
			toast.error("Failed to save profile");
		} finally {
			setIsUpdatingProfile(false);
		}
	};

	const handleUpdatePassword = async () => {
		if (!newPassword || !confirmPassword) {
			toast.error("Please fill in both password fields");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}
		if (newPassword.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		setIsUpdatingPassword(true);
		try {
			// TODO: Call actual API endpoint when available
			await new Promise((resolve) => setTimeout(resolve, 500));
			toast.success("Password updated", {
				description: "Your password has been changed successfully.",
			});
			setNewPassword("");
			setConfirmPassword("");
		} catch (error) {
			toast.error("Failed to update password");
		} finally {
			setIsUpdatingPassword(false);
		}
	};

	const handleSignOutAll = async () => {
		// TODO: Call actual API endpoint when available
		await new Promise((resolve) => setTimeout(resolve, 300));
		toast("Signed out from all sessions", {
			description: "All other sessions have been terminated.",
		});
	};

	const handleSavePreferences = () => {
		toast.success("Preferences saved", {
			description: "Notification settings updated.",
		});
	};

	if (userLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Settings</h1>
				<p className="text-sm text-muted-foreground">
					Manage your account and dashboard preferences.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<UserIcon className="size-4" />
							Profile
						</CardTitle>
						<CardDescription>
							Update your display name and email address.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="display-name">Display name</Label>
							<Input
								id="display-name"
								value={displayName}
								onChange={(event) => setDisplayName(event.target.value)}
								placeholder="Your name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								placeholder="your@email.com"
							/>
						</div>
						<Button
							size="sm"
							onClick={handleSaveProfile}
							disabled={isUpdatingProfile}
						>
							{isUpdatingProfile ? (
								<>
									<Loader2Icon className="size-4 animate-spin" />
									Saving...
								</>
							) : (
								"Save profile"
							)}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<ShieldCheckIcon className="size-4" />
							Security
						</CardTitle>
						<CardDescription>
							Manage your password and active sessions.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="password">New password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirm password</Label>
							<Input
								id="confirm-password"
								type="password"
								placeholder="••••••••"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								size="sm"
								onClick={handleUpdatePassword}
								disabled={isUpdatingPassword}
							>
								{isUpdatingPassword ? (
									<>
										<Loader2Icon className="size-4 animate-spin" />
										Updating...
									</>
								) : (
									"Update password"
								)}
							</Button>
							<Button size="sm" variant="outline" onClick={handleSignOutAll}>
								<LogOutIcon className="size-4" />
								Sign out all sessions
							</Button>
						</div>
					</CardContent>
				</Card>

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
					<CardContent className="space-y-3 text-sm">
						<label className="flex items-start gap-2 rounded-md border p-3">
							<input
								type="checkbox"
								checked={expireWarning}
								onChange={(event) => setExpireWarning(event.target.checked)}
								className="mt-0.5"
							/>
							<span>
								<span className="font-medium">Sandbox expiry warning</span>
								<span className="block text-xs text-muted-foreground">
									Notify me when sandbox has less than 30 minutes TTL.
								</span>
							</span>
						</label>
						<label className="flex items-start gap-2 rounded-md border p-3">
							<input
								type="checkbox"
								checked={newsletter}
								onChange={(event) => setNewsletter(event.target.checked)}
								className="mt-0.5"
							/>
							<span>
								<span className="font-medium">Product updates</span>
								<span className="block text-xs text-muted-foreground">
									Get feature announcements and release notes.
								</span>
							</span>
						</label>
						<Button size="sm" variant="outline" onClick={handleSavePreferences}>
							Save preferences
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<KeyRoundIcon className="size-4" />
							Workspace Limits
						</CardTitle>
						<CardDescription>
							Free tier quota and API usage snapshot.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<div className="flex items-center justify-between rounded-md border p-2">
							<span>Active sandboxes</span>
							<span className="font-medium">{activeSandboxes} / 5</span>
						</div>
						<div className="flex items-center justify-between rounded-md border p-2">
							<span>AI requests today</span>
							<span className="font-medium">— / 30</span>
						</div>
						<div className="flex items-center justify-between rounded-md border p-2">
							<span>Max size per sandbox</span>
							<span className="font-medium">100 MB</span>
						</div>
						<div className="flex items-center justify-between rounded-md border p-2">
							<span>Account role</span>
							<span className="font-medium capitalize">
								{user?.role ?? "user"}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
