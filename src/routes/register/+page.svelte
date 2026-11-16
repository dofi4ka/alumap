<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import CodeInput from '#lib/components/CodeInput.svelte';
	import { isAlumniEmail } from '#lib/emails.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let pending = $state(false);
	// svelte-ignore state_referenced_locally
	let email = $state((form && 'email' in form ? form.email : '') ?? '');
	// svelte-ignore state_referenced_locally
	let firstName = $state((form && 'firstName' in form ? form.firstName : '') ?? '');
	// svelte-ignore state_referenced_locally
	let lastName = $state((form && 'lastName' in form ? form.lastName : '') ?? '');

	const verifying = $derived(form?.step === 'verify');
	const usesInnopolisEmail = $derived(isAlumniEmail(email));

	// Restore the fields after a validation error.
	$effect(() => {
		if (!form) return;
		if ('email' in form && form.email) email = form.email;
		if ('firstName' in form && form.firstName) firstName = form.firstName;
		if ('lastName' in form && form.lastName) lastName = form.lastName;
	});

	const submit = () => {
		pending = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			pending = false;
		};
	};
</script>

{#if verifying && form}
	<AuthShell title="Check your personal email" subtitle="We sent a 6-digit code to {form.email}">
		<form method="POST" action="?/verify" class="space-y-3" use:enhance={submit}>
			<input type="hidden" name="email" value={form.email} />
			<CodeInput autofocus />
			{#if form.error}<p class="error-box">{form.error}</p>{/if}
			{#if 'resent' in form && form.resent}<p class="text-center text-sm text-brand-700">New code sent</p>{/if}
			<button class="btn-primary w-full" disabled={pending}>Confirm</button>
		</form>
		<form method="POST" action="?/resend" class="mt-3 text-center" use:enhance={submit}>
			<input type="hidden" name="email" value={form.email} />
			<button class="text-sm text-zinc-500 hover:text-zinc-800" disabled={pending}>Send the code again</button>
		</form>
	</AuthShell>
{:else}
	<AuthShell
		title="Create an account"
		subtitle="Alumap is the map of Innopolis University alumni and their friends"
	>
		<div class="mb-5 flex items-center gap-2 text-xs font-medium text-zinc-500">
			<span class="flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">1</span>
			Personal email
			<span class="h-px flex-1 bg-zinc-200"></span>
			<span class="flex size-5 items-center justify-center rounded-full bg-zinc-100">2</span>
			Innopolis email
		</div>

		<form method="POST" action="?/start" class="space-y-3" use:enhance={submit}>
			<input
				class="input"
				type="email"
				name="email"
				autocomplete="email"
				placeholder="Personal email"
				bind:value={email}
				required
			/>
			{#if usesInnopolisEmail}
				<p class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
					This looks like your Innopolis address. Please use a personal email (Gmail, Yandex, etc.) — you
					will add and verify your @innopolis.university email in step 2.
				</p>
			{/if}
			<div class="grid grid-cols-2 gap-3">
				<input
					class="input"
					name="firstName"
					placeholder="First name"
					autocomplete="given-name"
					bind:value={firstName}
					required
				/>
				<input
					class="input"
					name="lastName"
					placeholder="Last name"
					autocomplete="family-name"
					bind:value={lastName}
					required
				/>
			</div>
			<input
				class="input"
				type="password"
				name="password"
				placeholder="Password (8+ characters)"
				autocomplete="new-password"
				minlength="8"
				required
			/>
			<input
				class="input"
				type="password"
				name="passwordRepeat"
				placeholder="Repeat password"
				autocomplete="new-password"
				minlength="8"
				required
			/>
			{#if form?.error}<p class="error-box">{form.error}</p>{/if}
			<button class="btn-primary w-full" disabled={pending}>Continue</button>
		</form>

		<p class="mt-6 text-center text-sm text-zinc-500">
			Already have an account? <a href="/login" class="font-semibold text-brand-600 hover:underline">Log in</a>
		</p>
	</AuthShell>
{/if}
