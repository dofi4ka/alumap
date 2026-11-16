<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import CodeInput from '#lib/components/CodeInput.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let pending = $state(false);

	const verifying = $derived(form?.step === 'verify');
	const channel = $derived(form && 'channel' in form ? form.channel : 'email');

	const submit = () => {
		pending = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			pending = false;
		};
	};
</script>

{#if verifying && form}
	<AuthShell
		title="Reset your password"
		subtitle={channel === 'telegram'
			? 'We sent a 6-digit code to your Telegram'
			: `We sent a 6-digit code to ${form.email}`}
	>
		{#if channel === 'telegram'}
			<p class="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
				Open the Alumap bot chat in Telegram to find the code, then enter it here.
			</p>
		{/if}
		<form method="POST" action="?/reset" class="space-y-3" use:enhance={submit}>
			<input type="hidden" name="email" value={form.email} />
			<input type="hidden" name="channel" value={channel} />
			<CodeInput autofocus />
			<input
				class="input"
				type="password"
				name="password"
				placeholder="New password (8+ characters)"
				autocomplete="new-password"
				minlength="8"
				required
			/>
			<input
				class="input"
				type="password"
				name="passwordRepeat"
				placeholder="Repeat new password"
				autocomplete="new-password"
				minlength="8"
				required
			/>
			{#if form.error}<p class="error-box">{form.error}</p>{/if}
			{#if 'resent' in form && form.resent}
				<p class="text-center text-sm text-brand-700">New code sent</p>
			{/if}
			<button class="btn-primary w-full" disabled={pending}>Set new password</button>
		</form>
		<div class="mt-3 flex items-center justify-center gap-3 text-sm">
			<form method="POST" action="?/resend" use:enhance={submit}>
				<input type="hidden" name="email" value={form.email} />
				<input type="hidden" name="channel" value={channel} />
				<button class="text-zinc-500 hover:text-zinc-800" disabled={pending}>Send the code again</button>
			</form>
			<span class="text-zinc-300">|</span>
			<form method="POST" action="?/change" use:enhance={submit}>
				<input type="hidden" name="email" value={form.email} />
				<button class="text-zinc-500 hover:text-zinc-800" disabled={pending}>Wrong email?</button>
			</form>
		</div>
	</AuthShell>
{:else}
	<AuthShell
		title="Forgot your password?"
		subtitle="We will send a verification code to your Telegram if it is connected, otherwise to your main email"
	>
		<form method="POST" action="?/start" class="space-y-3" use:enhance={submit}>
			<input
				class="input"
				type="email"
				name="email"
				placeholder="Your main email"
				autocomplete="email"
				value={form && 'email' in form ? form.email : ''}
				required
			/>
			{#if form?.error}<p class="error-box">{form.error}</p>{/if}
			<button class="btn-primary w-full" disabled={pending}>Send code</button>
		</form>
		<p class="mt-6 text-center text-sm text-zinc-500">
			Remembered it? <a href="/login" class="font-semibold text-brand-600 hover:underline">Log in</a>
		</p>
	</AuthShell>
{/if}
