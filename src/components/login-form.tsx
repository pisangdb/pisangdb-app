import { Link, useRouter } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { signIn } from "#/lib/auth-client";
import { cn } from "#/lib/utils";

const getLoginErrorMessage = (
	error:
		| { code?: string; status?: number; message?: string }
		| null
		| undefined,
): string => {
	if (!error) return "An error occurred. Please try again.";

	// Map better-auth error codes to user-friendly messages
	const code = error.code || error.status;
	const message = error.message || "";

	switch (code) {
		case "INVALID_EMAIL":
			return "Please enter a valid email address";
		case "INVALID_PASSWORD":
			return "Password must be at least 8 characters";
		case "INVALID_CREDENTIALS":
			return "Email or password is incorrect. Please try again.";
		case "USER_NOT_FOUND":
			return "No account found with this email. Try signing up instead.";
		case "EMAIL_ALREADY_EXISTS":
			return "This email is already registered. Try signing in.";
		case "TOO_MANY_REQUESTS":
			return "Too many login attempts. Please try again in 15 minutes.";
		case 429:
			return "Too many login attempts. Please try again later.";
		case 401:
		case 403:
			return "Email or password is incorrect. Please try again.";
		default:
			return message || "Failed to sign in. Please try again.";
	}
};

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		// Basic client-side validation
		if (!email) {
			toast.error("Please enter your email");
			setIsLoading(false);
			return;
		}

		if (!password) {
			toast.error("Please enter your password");
			setIsLoading(false);
			return;
		}

		const { error } = await signIn.email({
			email,
			password,
		});

		if (error) {
			toast.error(getLoginErrorMessage(error));
			setIsLoading(false);
			return;
		}

		toast.success("Signed in successfully");
		router.navigate({ to: "/dashboard" });
	};

	const handleGoogleSignIn = async () => {
		try {
			// Use better-auth OAuth method
			if (signIn.social) {
				await signIn.social({
					provider: "google",
					callbackURL: "/dashboard",
				});
			} else {
				// Fallback to direct OAuth URL
				window.location.href = "/api/auth/oauth/google";
			}
		} catch (error) {
			toast.error("Failed to sign in with Google");
			console.error("Google OAuth error:", error);
		}
	};

	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<form onSubmit={handleSubmit}>
				<FieldGroup>
					<Field>
						<Button
							variant="outline"
							type="button"
							className="w-full"
							onClick={handleGoogleSignIn}
						>
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
							name="email"
							type="email"
							placeholder="you@example.com"
							required
						/>
					</Field>
					<Field>
						<div className="flex items-center justify-between">
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Link
								to="/forgot-password"
								className="text-xs text-muted-foreground underline-offset-4 hover:underline"
							>
								Forgot your password?
							</Link>
						</div>
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
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "Signing in…" : "Sign in"}
						</Button>
						<FieldDescription className="text-center">
							Don&apos;t have an account?{" "}
							<Link to="/register" className="font-medium hover:underline">
								Sign up
							</Link>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>
			<FieldDescription className="px-2 text-center text-xs">
				By signing in, you agree to our{" "}
				<Link to="/terms" className="hover:underline">
					Terms of Service
				</Link>{" "}
				and{" "}
				<Link to="/privacy" className="hover:underline">
					Privacy Policy
				</Link>
				.
			</FieldDescription>
		</div>
	);
}
