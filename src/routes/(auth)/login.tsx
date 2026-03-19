import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthBrandingPanel } from "#/components/auth-branding-panel";
import { LoginForm } from "#/components/login-form";
import { Logo } from "#/components/logo";
import { $getMe } from "#/modules/auth/serverFn";

export const Route = createFileRoute("/(auth)/login")({
	beforeLoad: async () => {
		const user = await $getMe();
		if (user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({ meta: [{ title: "Sign In — PisangDB" }] }),
	component: LoginPage,
});

export default function LoginPage() {
	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<AuthBrandingPanel />

			{/* Right — form panel */}
			<div className="flex flex-col items-center justify-center gap-8 p-6 md:p-10">
				{/* mobile logo */}
				<div className="flex w-full max-w-sm justify-center lg:hidden">
					<Logo size="md" />
				</div>

				<div className="flex w-full max-w-sm flex-col gap-2">
					<div className="flex flex-col gap-1 text-center lg:text-left">
						<h1 className="text-2xl font-semibold tracking-tight">
							Welcome back
						</h1>
						<p className="text-sm text-muted-foreground">
							Sign in to manage your database sandboxes
						</p>
					</div>
					<LoginForm />
				</div>
			</div>
		</div>
	);
}
