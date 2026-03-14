import { createFileRoute } from "@tanstack/react-router";
import { BellIcon, KeyRoundIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { useState } from "react";
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

export const Route = createFileRoute("/_app/dashboard/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const [displayName, setDisplayName] = useState("Rio Developer");
	const [email, setEmail] = useState("rio@example.com");
	const [expireWarning, setExpireWarning] = useState(true);
	const [newsletter, setNewsletter] = useState(false);

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
						<CardDescription>Dummy values for UI preview.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="display-name">Display name</Label>
							<Input
								id="display-name"
								value={displayName}
								onChange={(event) => setDisplayName(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>
						<Button size="sm">Save profile</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<ShieldCheckIcon className="size-4" />
							Security
						</CardTitle>
						<CardDescription>
							Password and session controls (dummy UI only).
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="password">New password</Label>
							<Input id="password" type="password" placeholder="••••••••" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirm password</Label>
							<Input id="confirm-password" type="password" placeholder="••••••••" />
						</div>
						<div className="flex gap-2">
							<Button size="sm">Update password</Button>
							<Button size="sm" variant="outline">
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
							/>
							<span>
								<span className="font-medium">Product updates</span>
								<span className="block text-xs text-muted-foreground">
									Get feature announcements and release notes.
								</span>
							</span>
						</label>
						<Button size="sm" variant="outline">
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
							<span className="font-medium">2 / 5</span>
						</div>
						<div className="flex items-center justify-between rounded-md border p-2">
							<span>AI requests today</span>
							<span className="font-medium">8 / 30</span>
						</div>
						<div className="flex items-center justify-between rounded-md border p-2">
							<span>Max size per sandbox</span>
							<span className="font-medium">100 MB</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
