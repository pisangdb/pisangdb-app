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
import { signIn, signUp } from "#/lib/auth-client";
import { cn } from "#/lib/utils";

const getSignupErrorMessage = (
	error:
		| { code?: string; status?: number; message?: string }
		| null
		| undefined,
): string => {
	if (!error) return "An error occurred. Please try again.";

	const code = error.code || error.status;
	const message = error.message || "";

	switch (code) {
		case "INVALID_EMAIL":
			return "Please enter a valid email address";
		case "INVALID_PASSWORD":
			return "Password must be at least 8 characters";
		case "EMAIL_ALREADY_EXISTS":
			return "This email is already registered. Try signing in instead.";
		case "USER_EMAIL_ALREADY_EXISTS":
			return "This email is already registered. Try signing in instead.";
		case "INVALID_NAME":
			return "Please enter your full name";
		case "TOO_MANY_REQUESTS":
			return "Too many signup attempts. Please try again later.";
		case 429:
			return "Too many signup attempts. Please try again later.";
		case 400:
			return "Please check your information and try again.";
		default:
			return message || "Failed to create account. Please try again.";
	}
};

const validateEmail = (email: string): boolean => {
	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return regex.test(email);
};

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const confirmPassword = formData.get("confirmPassword") as string;

		// Client-side validation
		if (!name || name.trim() === "") {
			toast.error("Please enter your full name");
			setIsLoading(false);
			return;
		}

		if (!email) {
			toast.error("Please enter your email");
			setIsLoading(false);
			return;
		}

		if (!validateEmail(email)) {
			toast.error("Please enter a valid email address");
			setIsLoading(false);
			return;
		}

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

		const { error } = await signUp.email({
			email,
			password,
			name,
		});

		if (error) {
			toast.error(getSignupErrorMessage(error));
			setIsLoading(false);
			return;
		}

		toast.success("Account created successfully");
		router.navigate({ to: "/dashboard" });
	};

	const handleGoogleSignUp = () => {
		// Use signIn.social with proper error handling
		signIn
			.social({
				provider: "google",
				callbackURL: "/dashboard",
			})
			.catch((error) => {
				console.error("Google OAuth error:", error);
				// Fallback to direct OAuth initiation
				window.location.href = `/api/auth/signin/google?callbackURL=${encodeURIComponent(window.location.origin + "/dashboard")}`;
			});
	};

	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<FieldGroup>
				<Field>
					<Button
						variant="outline"
						type="button"
						className="w-full"
						onClick={handleGoogleSignUp}
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
						Sign up with Google
					</Button>
				</Field>

				<FieldSeparator>Or sign up with email</FieldSeparator>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<Field>
						<FieldLabel htmlFor="name">Full Name</FieldLabel>
						<Input
							id="name"
							name="name"
							type="text"
							placeholder="John Doe"
							required
						/>
					</Field>

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
						<FieldLabel htmlFor="password">Password</FieldLabel>
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
						{isLoading ? "Creating account…" : "Create account"}
					</Button>

					<FieldDescription className="text-center text-xs">
						Already have an account?{" "}
						<Link to="/login" className="font-medium hover:underline">
							Sign in
						</Link>
					</FieldDescription>
				</form>
			</FieldGroup>
			<FieldDescription className="px-2 text-center text-xs">
				By creating an account, you agree to our{" "}
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
