import { useNavigate } from "@tanstack/react-router";
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
import { register } from "#/lib/api-client";
import { cn } from "#/lib/utils";

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		setIsLoading(true);

		try {
			await register(email, password, name);
			toast.success("Account created successfully!");
			navigate({ to: "/dashboard" });
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to create account";
			setError(message);
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<form onSubmit={handleSubmit}>
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
									d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.32 2.84-8.546 0-.76-.053-1.467-.173-2.053H12.48z"
									fill="currentColor"
								/>
							</svg>
							Sign up with Google
						</Button>
					</Field>

					<FieldSeparator>Or sign up with email</FieldSeparator>

					<Field>
						<FieldLabel htmlFor="name">Full Name</FieldLabel>
						<Input
							id="name"
							type="text"
							placeholder="John Doe"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="email">Email</FieldLabel>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</Field>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									required
									className="pr-10"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
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
							<FieldLabel htmlFor="confirm-password">
								Confirm Password
							</FieldLabel>
							<div className="relative">
								<Input
									id="confirm-password"
									type={showConfirm ? "text" : "password"}
									required
									className="pr-10"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
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
					</div>

					<FieldDescription className="-mt-1 text-xs">
						Use at least 8 characters to protect your account.
					</FieldDescription>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<Field>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "Creating account…" : "Create account"}
						</Button>
						<FieldDescription className="text-center">
							Already have an account?{" "}
							<a href="/login" className="font-medium hover:underline">
								Sign in
							</a>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>
			<FieldDescription className="px-2 text-center text-xs">
				By creating an account, you agree to our{" "}
				<a href="/terms" className="hover:underline">
					Terms of Service
				</a>{" "}
				and{" "}
				<a href="/privacy" className="hover:underline">
					Privacy Policy
				</a>
				.
			</FieldDescription>
		</div>
	);
}
