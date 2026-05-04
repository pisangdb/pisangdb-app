import type { DbRegion } from "#/lib/types";

const REGION_ORDER: DbRegion[] = ["sg", "id", "us", "eu"];

export const REGION_METADATA: Record<
	DbRegion,
	{ flag: string; label: string }
> = {
	sg: { flag: "🇸🇬", label: "Singapore" },
	id: { flag: "🇮🇩", label: "Indonesia" },
	us: { flag: "🇺🇸", label: "United States" },
	eu: { flag: "🇪🇺", label: "Europe" },
};

export type SandboxRegionOption = {
	value: DbRegion;
	label: string;
	enabled: boolean;
};

function isDbRegion(value: string): value is DbRegion {
	return REGION_ORDER.includes(value as DbRegion);
}

function uniqueRegions(regions: DbRegion[]): DbRegion[] {
	return Array.from(new Set(regions));
}

function parseRegionList(value: string | undefined): DbRegion[] {
	if (!value) return [];
	return uniqueRegions(
		value
			.split(",")
			.map((region) => region.trim().toLowerCase())
			.filter(isDbRegion),
	);
}

function inferConfiguredRegions(env: NodeJS.ProcessEnv): DbRegion[] {
	return REGION_ORDER.filter((region) => {
		const key = region.toUpperCase();
		return Boolean(
			env[`POSTGRES_SANDBOX_URL_${key}`] &&
				env[`MYSQL_SANDBOX_URL_${key}`] &&
				env[`MARIADB_SANDBOX_URL_${key}`],
		);
	});
}

export function getEnabledSandboxRegions(
	env: NodeJS.ProcessEnv = process.env,
): DbRegion[] {
	const configured = parseRegionList(env.ENABLED_SANDBOX_REGIONS);
	if (configured.length > 0) return configured;

	const inferred = inferConfiguredRegions(env);
	return inferred.length > 0 ? inferred : ["sg"];
}

export function getPrimarySandboxRegion(
	env: NodeJS.ProcessEnv = process.env,
): DbRegion {
	const enabledRegions = getEnabledSandboxRegions(env);
	const configuredPrimary = env.PRIMARY_SANDBOX_REGION?.trim().toLowerCase();

	if (configuredPrimary && isDbRegion(configuredPrimary)) {
		if (enabledRegions.includes(configuredPrimary)) return configuredPrimary;
	}

	return enabledRegions[0] ?? "sg";
}

export function isSandboxRegionEnabled(
	region: string,
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	return isDbRegion(region) && getEnabledSandboxRegions(env).includes(region);
}

export function getSandboxRegionOptions(
	env: NodeJS.ProcessEnv = process.env,
): SandboxRegionOption[] {
	const enabledRegions = getEnabledSandboxRegions(env);
	const enabledSet = new Set(enabledRegions);
	const orderedRegions = uniqueRegions([
		...enabledRegions,
		...REGION_ORDER.filter((region) => !enabledSet.has(region)),
	]);

	return orderedRegions.map((region) => {
		const meta = REGION_METADATA[region];
		const enabled = enabledSet.has(region);
		return {
			value: region,
			label: enabled
				? `${meta.flag} ${meta.label}`
				: `${meta.flag} ${meta.label} (coming soon)`,
			enabled,
		};
	});
}
