<script lang="ts">
	import { enhance } from '$app/forms';
	import CodeInput from '#lib/components/CodeInput.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pending = $state(false);

	const verifying = $derived(form?.step === 'verify');
	const ssoEmail = $derived(form && 'ssoEmail' in form ? form.ssoEmail : '');
	const graduationYear = $derived(
		form && 'graduationYear' in form ? form.graduationYear : data.graduationYear
	);

	const submit = () => {
		pending = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			pending = false;
		};
	};
</script>

<svelte:head><title>Alumap - IU alumni verification</title></svelte:head>

<div class="mx-auto max-w-md">
	<div class="mb-5 flex items-center gap-2 text-xs font-medium text-zinc-500">
		<span class="flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">✓</span>
		Personal email
		<span class="h-px flex-1 bg-zinc-200"></span>
		<span class="flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">2</span>
		Innopolis email
	</div>

	<div class="card">
		{#if verifying && form}
			<h1 class="text-xl font-semibold">Check your Innopolis email</h1>
			<p class="mt-1 mb-4 text-sm text-zinc-500">
				We sent a 6-digit code to <b>{ssoEmail}</b>. Confirming it marks your account as IU alumni
				{graduationYear ? `, class of ${graduationYear}` : ''}.
			</p>
			<form method="POST" action="?/verify" class="space-y-3" use:enhance={submit}>
				<CodeInput autofocus />
				{#if form?.error}<p class="error-box">{form.error}</p>{/if}
				{#if 'resent' in form && form.resent}
					<p class="text-center text-sm text-brand-700">New code sent</p>
				{/if}
				<button class="btn-primary w-full" disabled={pending}>Verify and become IU alumni</button>
			</form>
			<div class="mt-4 flex items-center justify-between text-sm">
				<form method="POST" action="?/resend" use:enhance={submit}>
					<button class="text-zinc-500 hover:text-zinc-800" disabled={pending}>Send again</button>
				</form>
				<a href="/register/alumni" class="text-zinc-500 hover:text-zinc-800">Use another email</a>
			</div>
		{:else}
			<h1 class="text-xl font-semibold">IU Alumni Verification</h1>
			<p class="mt-1 mb-4 text-sm text-zinc-500">
				Verify your Innopolis University email to get the IU alumni status and graduation year on your
				profile. This is step 2 of registration — you can skip it and come back any time from your account.
			</p>
			<form method="POST" action="?/start" class="space-y-3" use:enhance={submit}>
				<div>
					<label class="label" for="sso-email">Innopolis email</label>
					<input
						id="sso-email"
						class="input"
						type="email"
						name="ssoEmail"
						value={ssoEmail}
						placeholder="you@innopolis.university"
						autocomplete="email"
						required
					/>
				</div>
				<div>
					<label class="label" for="sso-year">Graduation year</label>
					<input
						id="sso-year"
						class="input"
						type="number"
						name="graduationYear"
						value={graduationYear ?? ''}
						min="2014"
						max={new Date().getFullYear() + 1}
						placeholder="2024"
						required
					/>
				</div>
				{#if form?.error}<p class="error-box">{form.error}</p>{/if}
				<button class="btn-primary w-full" disabled={pending}>Send verification code</button>
			</form>

			<form method="POST" action="?/skip" class="mt-4" use:enhance={submit}>
				<button class="btn-secondary w-full" disabled={pending}>Skip for now — I am an IU Friend</button>
			</form>
			<p class="mt-2 text-center text-xs text-zinc-400">
				You can verify later in your profile: Account → IU Alumni Verification.
			</p>
		{/if}
	</div>
</div>
