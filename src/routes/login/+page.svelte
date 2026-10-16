<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let telegramStatus = $state<'idle' | 'checking' | 'not-linked'>('idle');
	let pending = $state(false);

	onMount(async () => {
		// Telegram passes miniapp launch params in the URL hash
		const initData = new URLSearchParams(location.hash.slice(1)).get('tgWebAppData');
		if (!initData) return;
		telegramStatus = 'checking';
		try {
			const res = await fetch('/api/telegram-auth', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ initData })
			});
			if (res.ok && (await res.json()).ok) return goto('/', { invalidateAll: true });
		} catch {
			// fall back to the regular login
		}
		telegramStatus = 'not-linked';
	});
</script>

<AuthShell title="Welcome back" subtitle="Map of Innopolis University alumni">
	{#if telegramStatus === 'checking'}
		<p class="mb-4 text-center text-sm text-zinc-500">Logging in with Telegram…</p>
	{:else if telegramStatus === 'not-linked'}
		<p class="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
			Your Telegram is not connected to Alumap yet. Log in once with email, then press
			<b>Connect Telegram</b> in your profile — next time you will be logged in automatically.
		</p>
	{/if}

	<form
		method="POST"
		class="space-y-3"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update();
				pending = false;
			};
		}}
	>
		<input class="input" type="email" name="email" placeholder="Email" autocomplete="email" value={form?.email ?? ''} required />
		<input class="input" type="password" name="password" placeholder="Password" autocomplete="current-password" required />
		{#if form?.error}<p class="error-box">{form.error}</p>{/if}
		<button class="btn-primary w-full" disabled={pending}>Log in</button>
	</form>

	<p class="mt-6 text-center text-sm text-zinc-500">
		New here? <a href="/register" class="font-semibold text-brand-600 hover:underline">Create an account</a>
	</p>
</AuthShell>
