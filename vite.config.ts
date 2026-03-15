import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	plugins: [
		devtools(),
		nitro({
			rollupConfig: {
				external: [/^@sentry\//, /^node:/],
			},
		}),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	ssr: {
		noExternal: ["@tanstack/react-start", "@tanstack/react-router-ssr-query"],
		external: ["pg", "mysql2", "bcrypt", "jsonwebtoken", "drizzle-orm"],
	},
	optimizeDeps: {
		exclude: ["pg", "mysql2", "bcrypt", "jsonwebtoken", "drizzle-orm"],
	},
	build: {
		rollupOptions: {
			external: (id: string) => {
				const serverOnlyPackages = [
					"pg",
					"mysql2",
					"bcrypt",
					"jsonwebtoken",
					"drizzle-orm",
				];
				return serverOnlyPackages.some(
					(pkg) => id === pkg || id.startsWith(`${pkg}/`),
				);
			},
		},
	},
});

export default config;
