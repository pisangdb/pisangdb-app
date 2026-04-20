import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

interface ResetPasswordEmailProps {
	resetLink?: string;
}

const baseUrl = process.env.BETTER_AUTH_URL
	? `${process.env.BETTER_AUTH_URL}`
	: "http://localhost:3100";

export function ResetPasswordEmail({ resetLink }: ResetPasswordEmailProps) {
	const previewText = `Reset your PisangDB password`;

	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Tailwind>
				<Body className="bg-gray-100 font-sans">
					<Container className="mx-auto my-10 max-w-[580px] rounded bg-white p-8">
						<Section>
							<Img
								src={`${baseUrl}/logo.svg`}
								width="40"
								height="40"
								alt="PisangDB"
								className="mx-auto"
							/>
							<Heading className="my-6 text-center text-2xl font-bold text-gray-900">
								Reset your password
							</Heading>
							<Text className="text-base text-gray-600">Hi there,</Text>
							<Text className="text-base text-gray-600">
								We received a request to reset your PisangDB password. Click the
								button below to create a new password:
							</Text>
							<Button
								href={resetLink}
								className="mx-auto my-6 block w-full max-w-[240px] rounded bg-[#6C47FF] px-6 py-3 text-center text-base font-semibold text-white"
							>
								Reset Password
							</Button>
							<Text className="text-base text-gray-600">
								Or copy and paste this link into your browser:
							</Text>
							<Link
								href={resetLink}
								className="break-all text-base text-blue-600 underline"
							>
								{resetLink}
							</Link>
							<Text className="mt-4 text-base text-gray-600">
								This link will expire in 1 hour for security purposes.
							</Text>
							<Text className="mt-6 text-base text-gray-600">
								If you didn&apos;t request a password reset, you can safely
								ignore this email.
							</Text>
						</Section>
						<Hr className="my-6 border-gray-200" />
						<Text className="text-sm text-gray-500">
							PisangDB 🍌 — Ephemeral databases, ready in seconds.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
