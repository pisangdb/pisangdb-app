import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout } from "#/components/legal-page-layout";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
});

const termsSections = [
	{
		id: "service-overview",
		title: "1. Service overview",
		content: [
			"PisangDB provides temporary (ephemeral) database sandboxes intended for software development, testing, and learning scenarios.",
			"The platform supports PostgreSQL, MySQL, and MariaDB depending on feature availability, region support, and your account limits.",
		],
	},
	{
		id: "accounts",
		title: "2. Account responsibilities",
		content: [
			"You are responsible for keeping your credentials secure and for all activity performed under your account.",
			"You agree to provide accurate registration information and keep your account details up to date.",
		],
		bullets: [
			"Do not share credentials with unauthorized parties.",
			"Notify us promptly if you suspect account compromise.",
		],
	},
	{
		id: "acceptable-use",
		title: "3. Acceptable use",
		content: [
			"You may use PisangDB only for lawful purposes and in ways that do not degrade service quality for other users.",
		],
		bullets: [
			"No unauthorized access attempts, scanning, exploitation, or bypass of security controls.",
			"No abuse of query execution, AI generation, or resource-intensive workloads intended to disrupt the service.",
			"No use of the platform to store or process illegal content or malicious payloads.",
		],
	},
	{
		id: "ephemeral-data",
		title: "4. Ephemeral data and cleanup",
		content: [
			"Sandbox data is temporary by design and may be deleted automatically when TTL expires or when you manually delete a sandbox.",
			"You are fully responsible for exporting or backing up any data you want to retain before expiration.",
		],
		bullets: [
			"No recovery guarantee for expired or deleted sandbox data.",
			"Do not treat sandbox environments as production backup storage.",
		],
	},
	{
		id: "limits-fair-use",
		title: "5. Limits and fair use",
		content: [
			"Service limits may apply, including active sandbox caps, retention windows, engine availability, and request quotas.",
			"We may throttle, suspend, or restrict workloads that threaten reliability, security, or fair access for other users.",
		],
	},
	{
		id: "availability",
		title: "6. Availability and limitations",
		content: [
			"We aim for reliable performance, but uptime, latency, and feature behavior are not guaranteed in all conditions, plans, engines, or regions.",
			"Scheduled maintenance, infrastructure incidents, and third-party disruptions may temporarily affect the service.",
		],
	},
	{
		id: "third-party",
		title: "7. Third-party dependencies",
		content: [
			"Certain capabilities rely on third-party infrastructure, network providers, and AI services.",
			"Availability, latency, pricing constraints, and behavior of these dependencies may change outside our direct control.",
		],
	},
	{
		id: "liability",
		title: "8. Disclaimer and liability",
		content: [
			"The service is provided on an as-is and as-available basis without warranties of uninterrupted or error-free operation.",
			"To the extent permitted by law, PisangDB is not liable for indirect, incidental, special, or consequential damages arising from use of the platform.",
		],
	},
	{
		id: "updates",
		title: "9. Changes to these terms",
		content: [
			"We may update these Terms periodically to reflect legal, technical, or product changes.",
			"Continued use of PisangDB after updates means you accept the revised Terms.",
		],
	},
];

function TermsPage() {
	return (
		<LegalPageLayout
			title="Terms of Service"
			effectiveDate="March 14, 2026"
			sections={termsSections}
		/>
	);
}
