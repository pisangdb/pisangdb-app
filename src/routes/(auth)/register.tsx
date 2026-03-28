import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthBrandingPanel } from "#/components/auth-branding-panel";
import { Logo } from "#/components/logo";
import { SignupForm } from "#/components/signup-form";
import { buildSeoMeta } from "#/lib/seo";
import { $getMe } from "#/modules/auth/serverFn";

export const Route = createFileRoute("/(auth)/register")({
	beforeLoad: async () => {
		const user = await $getMe();
		if (user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () =>
		buildSeoMeta({
			title: "Create Account | PisangDB",
			description:
				"Create a PisangDB account to launch temporary PostgreSQL, MySQL, and MariaDB sandboxes.",
			path: "/register",
			noIndex: true,
		}),
	component: SignupPage,
});

function SignupPage() {
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
							Create your PisangDB account
						</h1>
						<p className="text-sm text-muted-foreground">
							Launch your first sandbox in under 2 seconds
						</p>
					</div>
					<SignupForm />
				</div>
			</div>
		</div>
	);
}
