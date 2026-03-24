import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

interface DeleteAccountDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userEmail: string;
	onConfirm: () => void;
	isLoading?: boolean;
}

export function DeleteAccountDialog({
	open,
	onOpenChange,
	userEmail,
	onConfirm,
	isLoading = false,
}: DeleteAccountDialogProps) {
	const [confirmationEmail, setConfirmationEmail] = useState("");
	const isEmailMatch = confirmationEmail === userEmail;

	const handleConfirm = () => {
		if (!isEmailMatch || isLoading) return;
		onConfirm();
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (isLoading) return;
		if (!newOpen) {
			setConfirmationEmail("");
		}
		onOpenChange(newOpen);
	};

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="text-destructive">
						Delete Account
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3">
							<p>
								This action is <strong>permanent and irreversible</strong>. All
								your data will be deleted, including:
							</p>
							<ul className="list-inside list-disc space-y-1 text-sm">
								<li>All active sandboxes and their databases</li>
								<li>Query history and AI logs</li>
								<li>Account credentials and sessions</li>
							</ul>
							<p className="font-medium">Type your email address to confirm:</p>
							<div className="space-y-2">
								<Label htmlFor="confirm-email" className="sr-only">
									Email confirmation
								</Label>
								<Input
									id="confirm-email"
									type="email"
									placeholder={userEmail}
									value={confirmationEmail}
									onChange={(e) => setConfirmationEmail(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							disabled={!isEmailMatch || isLoading}
							onClick={handleConfirm}
						>
							{isLoading ? "Deleting..." : "Delete Account"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
