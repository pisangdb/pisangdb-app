import { createFileRoute, redirect, useSearch } from "@tanstack/react-router";
import { AuthBrandingPanel } from "#/components/auth-branding-panel";
import { Logo } from "#/components/logo";
import { ResetPasswordForm } from "#/components/reset-password-form";
import { buildSeoMeta } from "#/lib/seo";
import { $getMe } from "#/modules/auth/serverFn";

export const Route = createFileRoute("/(auth)/reset-password")({
	beforeLoad: async () => {
		const user = await $getMe();
		if (user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	validateSearch: (search: Record<string, unknown>) => ({
		token: (search.token as string) || "",
	}),
	head: () =>
		buildSeoMeta({
			title: "Reset Password | PisangDB",
			description: "Set a new password for your PisangDB account.",
			path: "/reset-password",
			noIndex: true,
		}),
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token } = useSearch({ from: "/(auth)/reset-password" });

	if (!token) {
		return (
			<div className="grid min-h-svh lg:grid-cols-2">
				<AuthBrandingPanel />
				<div className="flex flex-col items-center justify-center gap-8 p-6 md:p-10">
					<div className="flex w-full max-w-sm justify-center lg:hidden">
						<Logo size="md" />
					</div>
					<div className="flex w-full max-w-sm flex-col gap-4 text-center">
						<h1 className="text-2xl font-semibold tracking-tight">
							Invalid Reset Link
						</h1>
						<p className="text-sm text-muted-foreground">
							The password reset link is missing or invalid. Please request a
							new one.
						</p>
						<a
							href="/forgot-password"
							className="text-sm font-medium text-primary hover:underline"
						>
							Request a new reset link
						</a>
					</div>
				</div>
			</div>
		);
	}

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
							Create new password
						</h1>
						<p className="text-sm text-muted-foreground">
							Enter a new password to reset your account
						</p>
					</div>
					<ResetPasswordForm token={token} />
				</div>
			</div>
		</div>
	);
}
