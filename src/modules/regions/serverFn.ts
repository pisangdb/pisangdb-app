import { createServerFn } from "@tanstack/react-start";
import {
	getPrimarySandboxRegion,
	getSandboxRegionOptions,
} from "#/lib/regions";
import type { DbRegion } from "#/lib/types";

export type SandboxRegionsConfig = {
	defaultRegion: DbRegion;
	regions: ReturnType<typeof getSandboxRegionOptions>;
};

export const $getSandboxRegionsConfig = createServerFn({
	method: "GET",
}).handler(
	async (): Promise<SandboxRegionsConfig> => ({
		defaultRegion: getPrimarySandboxRegion(),
		regions: getSandboxRegionOptions(),
	}),
);
