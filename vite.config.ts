import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	base: "/",
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
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
	build: {
		assetsDir: "assets",
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom"],
					router: ["@tanstack/react-router"],
					query: ["@tanstack/react-query"],
				},
			},
		},
	},
});

export default config;
