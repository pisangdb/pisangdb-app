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
	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<form>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="email">Account email</FieldLabel>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							required
						/>
						<FieldDescription>
							We&apos;ll send a password reset link to this email.
						</FieldDescription>
					</Field>

					<Field>
						<Button type="submit" className="w-full">
							Send reset link
						</Button>
						<FieldDescription className="text-center">
							Remember your password?{" "}
							<a href="/login" className="font-medium hover:underline">
								Back to sign in
							</a>
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
