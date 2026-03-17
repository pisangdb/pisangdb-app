import { Link } from "@tanstack/react-router";
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

const validateEmail = (email: string): boolean => {
	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return regex.test(email);
};

export function ForgotPasswordForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const [isLoading, setIsLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [email, setEmail] = useState("");

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Client-side validation
		if (!email) {
			toast.error("Please enter your email");
			return;
		}

		if (!validateEmail(email)) {
			toast.error("Please enter a valid email address");
			return;
		}

		setIsLoading(true);

		try {
			// Call server function to send reset email
			const response = await fetch("/api/auth/forget-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				const error = await response.json();
				toast.error(
					error.message || "Failed to send reset email. Please try again.",
				);
				setIsLoading(false);
				return;
			}

			setSent(true);
			toast.success("Reset link sent to your email");
			setIsLoading(false);
		} catch (error) {
			console.error("Password reset error:", error);
			toast.error("An error occurred. Please try again.");
			setIsLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<form onSubmit={handleSubmit}>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="email">Account email</FieldLabel>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={sent}
						/>
						<FieldDescription>
							We&apos;ll send a password reset link to this email.
						</FieldDescription>
					</Field>

					<Field>
						{sent ? (
							<div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center text-sm text-primary">
								✓ Check your inbox — reset link sent.
							</div>
						) : (
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? "Sending…" : "Send reset link"}
							</Button>
						)}
						<FieldDescription className="text-center">
							Remember your password?{" "}
							<Link to="/login" className="font-medium hover:underline">
								Back to sign in
							</Link>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>

			<FieldDescription className="px-2 text-center text-xs">
				For security, we only show a generic confirmation message.
			</FieldDescription>
		</div>
	);
}
