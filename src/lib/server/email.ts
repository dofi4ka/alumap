import nodemailer from 'nodemailer';
import { env } from './env.ts';

const transport = env.smtp.host
	? nodemailer.createTransport({
			host: env.smtp.host,
			port: env.smtp.port,
			secure: env.smtp.secure,
			auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined
		})
	: null;

export async function sendVerificationCode(to: string, code: string) {
	if (!transport) {
		console.log(`[email] SMTP is not configured. Verification code for ${to}: ${code}`);
		return;
	}
	await transport.sendMail({
		from: env.smtp.from,
		to,
		subject: `Alumap verification code: ${code}`,
		text: `Your Alumap verification code is ${code}\n\nIt is valid for 15 minutes.`
	});
}
