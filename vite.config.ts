import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const nitroExternalDeps = [
	/^@sentry\//,
	/^drizzle-orm/,
	/^pg$/,
	/^pg\//,
	/^mysql2$/,
	/^mysql2\//,
	/^nodemailer$/,
	/^nodemailer\//,
	/^better-auth$/,
	/^better-auth\//,
	/^@react-email\//,
	/^bcryptjs$/,
	/^bcryptjs\//,
];

function manualChunks(id: string) {
	if (!id.includes("node_modules")) {
		return undefined;
	}

	if (
		id.includes("/node_modules/scheduler/") ||
		id.includes("/node_modules/react/") ||
		id.includes("/node_modules/react-dom/")
	) {
		return "vendor-react";
	}

	if (
		id.includes("/node_modules/@tanstack/") ||
		id.includes("/node_modules/@tanstack-router-devtools/") ||
		id.includes("/node_modules/@tanstack-react-devtools/")
	) {
		return "vendor-tanstack";
	}

	if (
		id.includes("/node_modules/@codemirror/") ||
		id.includes("/node_modules/@lezer/") ||
		id.includes("/node_modules/@marijn/") ||
		id.includes("/node_modules/style-mod/") ||
		id.includes("/node_modules/w3c-keyname/")
	) {
		return "vendor-editor";
	}

	if (
		id.includes("/node_modules/class-variance-authority/") ||
		id.includes("/node_modules/clsx/") ||
		id.includes("/node_modules/tailwind-merge/")
	) {
		return "vendor-style";
	}

	if (
		id.includes("/node_modules/sonner/") ||
		id.includes("/node_modules/@radix-ui/") ||
		id.includes("/node_modules/@floating-ui/") ||
		id.includes("/node_modules/vaul/") ||
		id.includes("/node_modules/react-remove-scroll/") ||
		id.includes("/node_modules/react-remove-scroll-bar/") ||
		id.includes("/node_modules/react-style-singleton/") ||
		id.includes("/node_modules/use-callback-ref/") ||
		id.includes("/node_modules/use-sidecar/") ||
		id.includes("/node_modules/aria-hidden/") ||
		id.includes("/node_modules/get-nonce/")
	) {
		return "vendor-ui";
	}

	if (
		id.includes("/node_modules/lucide-react/") ||
		id.includes("/node_modules/zod/")
	) {
		return "vendor-misc";
	}

	return "vendor";
}

const config = defineConfig(({ isSsrBuild }) => ({
	base: "/",
	plugins: [
		devtools(),
		nitro({
			rollupConfig: {
				external: nitroExternalDeps,
			},
		}),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	optimizeDeps: {
		// Pre-bundle drizzle-orm so it's available when @better-auth/drizzle-adapter
		// imports it as an optional peer dependency during build
		include: ["drizzle-orm"],
	},
	ssr: {
		external: ["drizzle-orm"],
	},
	build: {
		assetsDir: "assets",
		rollupOptions: !isSsrBuild
			? {
					output: {
						manualChunks,
					},
				}
			: undefined,
	},
}));

export default config;
