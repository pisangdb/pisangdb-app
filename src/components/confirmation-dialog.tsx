import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";

export interface ConfirmationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

export function ConfirmationDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = "Confirm",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
	isLoading = false,
}: ConfirmationDialogProps) {
	const handleCancel = () => {
		if (isLoading) return;
		onCancel?.();
		onOpenChange(false);
	};

	const handleConfirm = () => {
		if (isLoading) return;
		onConfirm();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel asChild>
						<Button
							variant="outline"
							disabled={isLoading}
							onClick={handleCancel}
						>
							{cancelText}
						</Button>
					</AlertDialogCancel>
					<Button
						variant="destructive"
						disabled={isLoading}
						onClick={handleConfirm}
					>
						{isLoading ? `${confirmText}…` : confirmText}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
