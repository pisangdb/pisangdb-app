import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import * as React from "react";
import { Toaster } from "sonner";

import "../styles.css";

const getQueryClient = () => {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000,
				refetchOnWindowFocus: true,
				retry: 1,
			},
		},
	});
};

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary/8 to-transparent" />
			<div className="relative">
				<p className="text-8xl font-black tracking-tighter text-primary/20">
					404
				</p>
				<div className="absolute inset-0 flex items-center justify-center text-5xl">
					🍌
				</div>
			</div>
			<div className="space-y-2">
				<h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
				<p className="max-w-sm text-sm text-muted-foreground">
					This page doesn't exist or has been moved. Go back to the dashboard or
					landing page.
				</p>
			</div>
			<div className="flex flex-wrap justify-center gap-3">
				<Link
					to="/dashboard"
					className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Go to Dashboard
				</Link>
				<Link
					to="/"
					className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
				>
					Back to Home
				</Link>
			</div>
		</div>
	);
}

export const Route = createRootRoute({
	notFoundComponent: NotFound,
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "PisangDB",
			},
		],
	}),
	shellComponent: RootDocument,
	component: () => <Outlet />,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const [queryClient] = React.useState(() => getQueryClient());

	return (
		<QueryClientProvider client={queryClient}>
			<html lang="en" suppressHydrationWarning>
				<head>
					{/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme init script is static and trusted */}
					<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
					<HeadContent />
				</head>
				<body className="font-sans antialiased [wrap-anywhere] selection:bg-[rgba(79,184,178,0.24)]">
					{children}
					<Toaster richColors closeButton />
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
					<Scripts />
				</body>
			</html>
		</QueryClientProvider>
	);
}
