import { browser } from '$app/env';

/**
 * Thin wrapper around @tma.js/sdk. The SDK is loaded lazily and only inside a real Telegram
 * Mini App, so the website stays a normal SvelteKit app everywhere else.
 */
type Sdk = typeof import('@tma.js/sdk');

let sdk: Sdk | null = null;
let setup: Promise<Sdk | null> | null = null;

const looksLikeTelegram = () => {
	if (!browser) return false;
	return (
		'TelegramWebviewProxy' in window ||
		window.location.hash.includes('tgWebAppData') ||
		window.location.search.includes('tgWebAppData')
	);
};

const safe = (fn: () => void, label: string) => {
	try {
		fn();
	} catch (err) {
		console.warn(`[miniapp] ${label} failed`, err);
	}
};

export function setupMiniApp(): Promise<Sdk | null> {
	if (!browser) return Promise.resolve(null);
	if (setup) return setup;

	setup = (async () => {
		if (!looksLikeTelegram()) return null;

		let mod: Sdk;
		try {
			mod = await import('@tma.js/sdk');
		} catch (err) {
			console.warn('[miniapp] SDK failed to load', err);
			return null;
		}
		if (!mod.isTMA()) return null;

		try {
			mod.init();
		} catch (err) {
			console.warn('[miniapp] init failed', err);
			return null;
		}
		sdk = mod;
		document.documentElement.dataset.tma = 'true';

		safe(() => {
			mod.miniApp.mount();
			mod.miniApp.ready();
		}, 'mini app');
		for (const [label, apply] of [
			['header color', () => mod.miniApp.setHeaderColor('#ffffff')],
			['background color', () => mod.miniApp.setBgColor('#ffffff')],
			['bottom bar color', () => mod.miniApp.setBottomBarColor('#ffffff')]
		] as const)
			safe(apply, label);

		// Viewport + safe area variables drive the layout in fullscreen mode.
		try {
			await mod.viewport.mount({ timeout: 5000 });
			mod.viewport.bindCssVars();
			mod.viewport.expand();
			if (mod.viewport.requestFullscreen.isSupported() && !mod.viewport.isFullscreen()) {
				await mod.viewport.requestFullscreen({ timeout: 5000 });
			}
			// In fullscreen Telegram draws its controls over the webview; reserve room above our header.
			const syncFullscreen = () =>
				document.documentElement.toggleAttribute(
					'data-tma-fullscreen',
					mod.viewport.isFullscreen()
				);
			syncFullscreen();
			mod.viewport.isFullscreen.sub(syncFullscreen);
		} catch (err) {
			console.warn('[miniapp] viewport setup failed', err);
		}

		safe(() => {
			if (!mod.backButton.isSupported()) return;
			mod.backButton.mount();
			mod.backButton.onClick(() => {
				window.history.back();
			});
		}, 'back button');

		safe(() => {
			if (!mod.swipeBehavior.isSupported()) return;
			mod.swipeBehavior.mount();
			mod.swipeBehavior.disableVertical();
		}, 'swipe behavior');

		safe(() => {
			mod.closingBehavior.mount();
			mod.closingBehavior.disableConfirmation();
		}, 'closing behavior');

		return mod;
	})();

	return setup;
}

export const inMiniApp = () => !!sdk;

/** Shows the native Telegram back button on every page except the map. */
export function syncBackButton(pathname: string) {
	if (!sdk) return;
	safe(() => {
		if (pathname !== '/' && window.history.length > 1) sdk!.backButton.show();
		else sdk!.backButton.hide();
	}, 'back button state');
}

export function hapticTap() {
	if (!sdk) return;
	safe(() => sdk!.hapticFeedback.impactOccurred('light'), 'haptic');
}

/** Raw init data for the server-side Telegram login. */
export async function getRawInitData(): Promise<string | null> {
	const mod = await setupMiniApp();
	if (!mod) return null;
	return mod.retrieveRawInitData() ?? null;
}
