import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
		exclude: ["node_modules", "dist"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/lib/**/*.ts"],
			exclude: ["src/lib/**/*.test.ts"],
		},
		setupFiles: ["./src/test/setup.ts"],
	},
});
