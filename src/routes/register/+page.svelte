<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let kind = $state<'alumni' | 'friend'>(form && 'kind' in form && form.kind === 'friend' ? 'friend' : 'alumni');
	let pending = $state(false);

	const verifying = $derived(form?.step === 'verify');
	const v = $derived(form && 'firstName' in form ? form : null);

	const submit = () => {
		pending = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			pending = false;
		};
	};
</script>

{#if verifying && form}
	<AuthShell title="Check your email" subtitle="We sent a 6-digit code to {form.email}">
		<form method="POST" action="?/verify" class="space-y-3" use:enhance={submit}>
			<input type="hidden" name="email" value={form.email} />
			<input
				class="input text-center text-2xl tracking-[0.5em]"
				name="code"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				placeholder="000000"
				required
			/>
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
	<AuthShell title="Create an account" subtitle="Alumap is a networking portal for Innopolis University graduates and their friends">
		<div class="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-semibold">
			{#each [['alumni', 'IU alumni'], ['friend', "Alumni's friend"]] as [k, label] (k)}
				<button
					type="button"
					class="rounded-lg py-2 transition {kind === k ? 'bg-white shadow-sm' : 'text-zinc-500'}"
					onclick={() => (kind = k as typeof kind)}>{label}</button
				>
			{/each}
		</div>

		<form method="POST" action="?/start" class="space-y-3" use:enhance={submit}>
			<input type="hidden" name="kind" value={kind} />
			<input
				class="input"
				type="email"
				name="email"
				autocomplete="email"
				placeholder={kind === 'alumni' ? 'you@innopolis.university' : 'Email'}
				value={v?.email ?? ''}
				required
			/>
			<div class="grid grid-cols-2 gap-3">
				<input class="input" name="firstName" placeholder="First name" autocomplete="given-name" value={v?.firstName ?? ''} required />
				<input class="input" name="lastName" placeholder="Last name" autocomplete="family-name" value={v?.lastName ?? ''} required />
			</div>
			{#if kind === 'alumni'}
				<input
					class="input"
					type="number"
					name="graduationYear"
					min="2014"
					max={new Date().getFullYear() + 1}
					placeholder="Graduation year"
					value={v?.graduationYear ?? ''}
					required
				/>
			{/if}
			<input class="input" type="password" name="password" placeholder="Password (8+ characters)" autocomplete="new-password" minlength="8" required />
			<input class="input" type="password" name="passwordRepeat" placeholder="Repeat password" autocomplete="new-password" minlength="8" required />
			{#if form?.error}<p class="error-box">{form.error}</p>{/if}
			<button class="btn-primary w-full" disabled={pending}>Continue</button>
		</form>

		<p class="mt-6 text-center text-sm text-zinc-500">
			Already have an account? <a href="/login" class="font-semibold text-brand-600 hover:underline">Log in</a>
		</p>
	</AuthShell>
{/if}
