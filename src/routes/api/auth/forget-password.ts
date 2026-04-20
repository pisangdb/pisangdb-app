import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "#/db";
import * as schema from "#/db/schema";

// Initialize email transporter with SMTP config
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || "smtp.mailgun.org",
	port: parseInt(process.env.SMTP_PORT || "587", 10),
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

// Generate reset token (valid for 1 hour)
function generateResetToken(): string {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const Route = createFileRoute("/api/auth/forget-password")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				try {
					const body = await request.json();
					const { email } = body;

					// Validate email
					if (!email || typeof email !== "string") {
						return new Response(
							JSON.stringify({ message: "Email is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check if user exists
					const user = await db
						.select()
						.from(schema.users)
						.where(eq(schema.users.email, email))
						.limit(1);

					// Always return success for security (don't reveal if email exists)
					if (user.length === 0) {
						return new Response(
							JSON.stringify({
								message:
									"If an account exists with that email, a reset link will be sent",
							}),
							{ status: 200, headers: { "Content-Type": "application/json" } },
						);
					}

					// Generate reset token and expiry
					const resetToken = generateResetToken();
					const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

					// Save token to verifications table
					await db.insert(schema.verifications).values({
						id: resetToken,
						identifier: email,
						value: "password_reset",
						expiresAt: expiresAt,
					});

					// Send email
					const resetLink = `${process.env.BETTER_AUTH_URL || "http://localhost:3100"}/reset-password?token=${resetToken}`;

					try {
						await transporter.sendMail({
							from: process.env.SMTP_FROM,
							to: email,
							subject: "Reset Your PisangDB Password",
							html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { text-align: center; margin-bottom: 30px; }
                            .content { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
                            .button { display: inline-block; padding: 12px 30px; background: #4fb2b2; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🍌 PisangDB</h1>
                            </div>
                            <h2>Reset Your Password</h2>
                            <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
                            <div class="content">
                                <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
                                <a href="${resetLink}" class="button">Reset Password</a>
                            </div>
                            <p>Or copy and paste this link in your browser:</p>
                            <p><small>${resetLink}</small></p>
                            <div class="footer">
                                <p>This is an automated email. Please do not reply to this message.</p>
                                <p>&copy; 2026 PisangDB. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
							text: `Reset your password by visiting: ${resetLink}`,
						});
					} catch (emailError) {
						console.error("Email sending error:", emailError);
						// Still return success to avoid revealing email issues
					}

					return new Response(
						JSON.stringify({
							message:
								"If an account exists with that email, a reset link will be sent",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Password reset error:", error);
					return new Response(
						JSON.stringify({ message: "An error occurred. Please try again." }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
