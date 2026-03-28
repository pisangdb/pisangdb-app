const SITE_NAME = "PisangDB";
const SITE_URL = "https://pisangdb.com";
const DEFAULT_TITLE = "PisangDB";
const DEFAULT_DESCRIPTION =
	"Ephemeral database sandboxes for developers. Launch PostgreSQL, MySQL, and MariaDB in seconds with instant credentials, browser SQL console, and auto-cleanup.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

type SeoConfig = {
	title?: string;
	description?: string;
	path?: string;
	image?: string;
	type?: "website" | "article";
	noIndex?: boolean;
	keywords?: string[];
};

function toAbsoluteUrl(path = "/") {
	return new URL(path, SITE_URL).toString();
}

export function buildSeoMeta({
	title = DEFAULT_TITLE,
	description = DEFAULT_DESCRIPTION,
	path = "/",
	image = DEFAULT_OG_IMAGE,
	type = "website",
	noIndex = false,
	keywords,
}: SeoConfig = {}) {
	const canonicalUrl = toAbsoluteUrl(path);
	const robots = noIndex ? "noindex, nofollow" : "index, follow";

	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			{ name: "robots", content: robots },
			{ name: "googlebot", content: robots },
			...(keywords?.length
				? [{ name: "keywords", content: keywords.join(", ") }]
				: []),
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:type", content: type },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:url", content: canonicalUrl },
			{ property: "og:image", content: image },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
			{ name: "twitter:image", content: image },
		],
		links: [{ rel: "canonical", href: canonicalUrl }],
	};
}

export const seoDefaults = {
	siteName: SITE_NAME,
	siteUrl: SITE_URL,
	defaultTitle: DEFAULT_TITLE,
	defaultDescription: DEFAULT_DESCRIPTION,
	defaultOgImage: DEFAULT_OG_IMAGE,
};
