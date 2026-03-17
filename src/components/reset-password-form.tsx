import { useRouter } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

export function ResetPasswordForm({
	className,
	token = "",
	...props
}: React.ComponentProps<"div"> & { token?: string }) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!token) {
			toast.error("Invalid reset token. Please request a new password reset.");
			return;
		}

		const formData = new FormData(e.currentTarget);
		const password = formData.get("password") as string;
		const confirmPassword = formData.get("confirmPassword") as string;

		if (!password) {
			toast.error("Please enter a password");
			setIsLoading(false);
			return;
		}

		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			setIsLoading(false);
			return;
		}

		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			setIsLoading(false);
			return;
		}

		try {
			const res = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, newPassword: password }),
			});

			const data = await res.json();

			if (!res.ok) {
				toast.error(data.message || "Failed to reset password");
				setIsLoading(false);
				return;
			}

			toast.success("Password reset successfully");
			router.navigate({ to: "/login" });
		} catch (error) {
			toast.error("An error occurred. Please try again.");
			console.error("Reset password error:", error);
			setIsLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="password">New Password</FieldLabel>
						<div className="relative">
							<Input
								id="password"
								name="password"
								type={showPassword ? "text" : "password"}
								required
								className="pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								tabIndex={-1}
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? (
									<EyeOffIcon className="size-4" />
								) : (
									<EyeIcon className="size-4" />
								)}
							</button>
						</div>
					</Field>

					<Field>
						<FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
						<div className="relative">
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type={showConfirm ? "text" : "password"}
								required
								className="pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowConfirm((v) => !v)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								tabIndex={-1}
								aria-label={showConfirm ? "Hide password" : "Show password"}
							>
								{showConfirm ? (
									<EyeOffIcon className="size-4" />
								) : (
									<EyeIcon className="size-4" />
								)}
							</button>
						</div>
					</Field>

					<FieldDescription className="text-xs">
						Use at least 8 characters to protect your account.
					</FieldDescription>

					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? "Resetting password…" : "Reset password"}
					</Button>
				</FieldGroup>
			</form>

			<FieldDescription className="px-2 text-center text-xs">
				Remember your password?{" "}
				<a href="/login" className="font-medium hover:underline">
					Sign in
				</a>
			</FieldDescription>
		</div>
	);
}
