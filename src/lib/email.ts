import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import { ResetPasswordEmail } from "#/components/emails/reset-password-email";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT ?? "587", 10),
	secure: process.env.SMTP_PORT === "465",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

export async function sendPasswordResetEmail({
	to,
	resetLink,
}: {
	to: string;
	resetLink: string;
}) {
	console.log(`[EMAIL] Sending password reset to: ${to}`);
	console.log(`[EMAIL] Reset link: ${resetLink}`);

	const emailHtml = await render(ResetPasswordEmail({ resetLink }));

	try {
		const info = await transporter.sendMail({
			from: process.env.SMTP_FROM ?? "noreply@pisangdb.com",
			to,
			subject: "Reset your PisangDB password",
			html: emailHtml,
		});
		console.log(`[EMAIL] Email sent successfully: ${info.messageId}`);
	} catch (error) {
		console.error(`[EMAIL] Failed to send email:`, error);
		throw error;
	}
}
