import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

export function ForgotPasswordForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const [isLoading, setIsLoading] = useState(false);
	const [sent, setSent] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setTimeout(() => {
			setIsLoading(false);
			setSent(true);
		}, 1200);
	};

	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<form onSubmit={handleSubmit}>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="email">Account email</FieldLabel>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
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
