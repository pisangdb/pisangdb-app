import { Button } from "#/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<form>
				<FieldGroup>
					<Field>
						<Button variant="outline" type="button" className="w-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								role="img"
								aria-label="Google"
								className="size-4"
							>
								<path
									d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
									fill="currentColor"
								/>
							</svg>
							Sign in with Google
						</Button>
					</Field>
					<FieldSeparator>Or sign in with email</FieldSeparator>
					<Field>
						<FieldLabel htmlFor="email">Email</FieldLabel>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							required
						/>
					</Field>
					<Field>
						<div className="flex items-center justify-between">
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<a
								href="/forgot-password"
								className="text-xs text-muted-foreground underline-offset-4 hover:underline"
							>
								Forgot your password?
							</a>
						</div>
						<Input id="password" type="password" required />
					</Field>
					<Field>
						<Button type="submit" className="w-full">
							Sign in
						</Button>
						<FieldDescription className="text-center">
							Don&apos;t have an account?{" "}
							<a href="/register" className="font-medium hover:underline">
								Sign up
							</a>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>
			<FieldDescription className="px-2 text-center text-xs">
				By signing in, you agree to our <a href="/terms">Terms of Service</a>{" "}
				and <a href="/privacy">Privacy Policy</a>.
			</FieldDescription>
		</div>
	);
}
