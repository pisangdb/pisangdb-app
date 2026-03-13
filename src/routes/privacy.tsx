import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout } from "#/components/legal-page-layout";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
});

const privacySections = [
	{
		id: "information-collected",
		title: "1. Information we collect",
		content: [
			"We collect account information (such as email and authentication data), service usage metadata, and sandbox-related operational logs required to provide the platform.",
		],
		bullets: [
			"Account data: email, hashed credentials, profile metadata.",
			"Operational data: sandbox lifecycle events, query execution metadata, system logs.",
			"AI usage data: prompts and generated responses when AI features are used.",
		],
	},
	{
		id: "how-we-use",
		title: "2. How we use information",
		content: [
			"We use your information to authenticate accounts, provision and manage sandboxes, enforce quotas, detect abuse, and maintain platform reliability.",
			"We may also use aggregated usage patterns to improve product quality and performance.",
		],
	},
	{
		id: "retention",
		title: "3. Data retention",
		content: [
			"Sandbox data is ephemeral and follows selected TTL policies or manual deletion events.",
			"Account and operational metadata may be retained for security, audit, troubleshooting, compliance, and continuity purposes.",
		],
		bullets: [
			"Expired sandbox data may be permanently removed.",
			"Retention periods can vary by data type and legal requirements.",
		],
	},
	{
		id: "security",
		title: "4. Security practices",
		content: [
			"We apply reasonable safeguards such as encrypted transport, controlled access, and monitoring to protect service data.",
			"No internet-based system can be guaranteed to be fully secure, and you share responsibility for protecting your account credentials.",
		],
	},
	{
		id: "cookies-sessions",
		title: "5. Cookies and session data",
		content: [
			"We use essential cookies or equivalent session mechanisms to maintain secure authentication and core product functionality.",
		],
		bullets: [
			"Session continuity and sign-in state",
			"Security and anti-abuse protection",
		],
	},
	{
		id: "third-party-services",
		title: "6. Third-party services",
		content: [
			"PisangDB may rely on third-party providers for infrastructure, networking, analytics, and AI capabilities.",
			"Those providers may process data under their own terms and privacy policies.",
		],
	},
	{
		id: "user-responsibilities",
		title: "7. Your responsibilities",
		content: [
			"You should avoid storing sensitive personal, financial, or regulated data in temporary sandboxes unless you fully understand and accept associated risks.",
		],
		bullets: [
			"Do not use ephemeral sandboxes as your only storage for critical data.",
			"Export and secure important data before TTL expiration.",
		],
	},
	{
		id: "policy-updates",
		title: "8. Policy updates",
		content: [
			"We may update this Privacy Policy periodically to reflect legal, technical, or product changes.",
			"Any updates are reflected on this page with the latest effective date.",
		],
	},
];

function PrivacyPage() {
	return (
		<LegalPageLayout
			title="Privacy Policy"
			effectiveDate="March 14, 2026"
			sections={privacySections}
			contactLabel="privacy@pisangdb.com"
			contactHref="mailto:privacy@pisangdb.com"
		/>
	);
}
