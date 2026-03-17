import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthBrandingPanel } from "#/components/auth-branding-panel";
import { ForgotPasswordForm } from "#/components/forgot-password-form";
import { Logo } from "#/components/logo";
import { $getMe } from "#/modules/auth/serverFn";

export const Route = createFileRoute("/(auth)/forgot-password")({
	beforeLoad: async () => {
		const user = await $getMe();
		if (user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({ meta: [{ title: "Forgot Password — PisangDB" }] }),
	component: ForgotPasswordPage,
});

export default function ForgotPasswordPage() {
	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<AuthBrandingPanel />

			<div className="flex flex-col items-center justify-center gap-8 p-6 md:p-10">
				<div className="flex w-full max-w-sm justify-center lg:hidden">
					<Logo size="md" />
				</div>

				<div className="flex w-full max-w-sm flex-col gap-2">
					<div className="flex flex-col gap-1 text-center lg:text-left">
						<h1 className="text-2xl font-semibold tracking-tight">
							Reset your password
						</h1>
						<p className="text-sm text-muted-foreground">
							Enter your email and we&apos;ll send reset instructions
						</p>
					</div>
					<ForgotPasswordForm />
				</div>
			</div>
		</div>
	);
}
