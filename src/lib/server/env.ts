import path from 'node:path';

try {
	process.loadEnvFile();
} catch {
	// no .env file, rely on the real environment
}

const e = process.env;

export const env = {
	dataDir: path.resolve(e.DATA_DIR || 'data'),

	smtp: {
		host: e.SMTP_HOST || '',
		port: Number(e.SMTP_PORT || 587),
		secure: e.SMTP_SECURE === 'true',
		user: e.SMTP_USER || '',
		pass: e.SMTP_PASS || '',
		from: e.SMTP_FROM || 'Alumap <noreply@localhost>'
	},

	botToken: e.BOT_TOKEN || '',
	miniappUrl: e.MINIAPP_URL || ''
};
