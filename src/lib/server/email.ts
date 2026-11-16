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

export type CodePurpose = 'registration' | 'password-reset' | 'sso-verify' | 'email-change';

const codeSubject: Record<CodePurpose, string> = {
	registration: 'Confirm your email',
	'password-reset': 'Reset your password',
	'sso-verify': 'Verify your Innopolis email',
	'email-change': 'Confirm your new email'
};

const codeReason: Record<CodePurpose, string> = {
	registration: 'Finish creating your Alumap account.',
	'password-reset': 'Use it to choose a new password. If you did not ask for a reset, ignore this email.',
	'sso-verify': 'Use it to confirm that this Innopolis address belongs to you.',
	'email-change': 'Use it to make this address the main email of your Alumap account.'
};

export async function sendMail(to: string, subject: string, text: string) {
	if (!transport) {
		console.log(`[email] SMTP is not configured. Message for ${to}: ${subject}\n${text}`);
		return;
	}
	await transport.sendMail({ from: env.smtp.from, to, subject, text });
}

export async function sendVerificationCode(to: string, code: string, purpose: CodePurpose = 'registration') {
	await sendMail(
		to,
		`Alumap: ${codeSubject[purpose].toLowerCase()}`,
		`Your Alumap verification code is ${code}\n\n${codeReason[purpose]}\n\nIt is valid for 15 minutes.`
	);
}

export async function sendNotificationEmail(
	to: string,
	subject: string,
	message: string,
	link?: string,
	linkLabel = 'Open'
) {
	await sendMail(
		to,
		subject,
		`${message}\n${link ? `\n${linkLabel}: ${link}\n` : ''}\nYou receive this because you follow a city in Alumap notifications.`
	);
}
