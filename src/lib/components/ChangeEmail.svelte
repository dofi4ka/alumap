<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import CodeInput from './CodeInput.svelte';
	import FormActions from './FormActions.svelte';

	let {
		currentEmail,
		close,
		onChanged
	}: { currentEmail: string; close: () => void; onChanged?: () => void } = $props();

	type Result = {
		step?: 'verify';
		email?: string;
		emailChanged?: boolean;
		error?: string;
	};

	let step = $state<'email' | 'verify'>('email');
	let newEmail = $state('');
	let error = $state('');
	let pending = $state(false);

	const handle =
		(onDone: (data: Result) => void): SubmitFunction =>
		() =>
		async ({ result, update }) => {
			pending = true;
			await update({ reset: false });
			if (result.type === 'failure') {
				const data = result.data as Result;
				error = data.error ?? 'Something went wrong';
			} else if (result.type === 'success') {
				error = '';
				onDone(result.data as Result);
			}
			pending = false;
		};
</script>

{#if step === 'email'}
	<form
		method="POST"
		action="?/changeEmail"
		use:enhance={handle((data) => {
			if (data.step === 'verify') {
				step = 'verify';
				newEmail = data.email ?? newEmail;
			}
		})}
		class="space-y-3"
	>
		<div>
			<label class="label" for="new-email">New email</label>
			<input
				id="new-email"
				class="input"
				type="email"
				name="email"
				value={newEmail}
				placeholder="you@example.com"
				autocomplete="email"
				required
			/>
			<p class="mt-1 text-xs text-zinc-500">
				Current main email: <b>{currentEmail}</b>. You only need to confirm the new address; your password
				and profile stay the same.
			</p>
		</div>
		{#if error}<p class="error-box">{error}</p>{/if}
		<FormActions onCancel={close} label="Send code" />
	</form>
{:else}
	<p class="mb-3 text-sm text-zinc-600">Enter the 6-digit code sent to <b>{newEmail}</b>.</p>
	<form method="POST" action="?/verifyEmailCode" use:enhance={handle((data) => {
		if (data.emailChanged) onChanged?.(), close();
	})} class="space-y-3">
		<input type="hidden" name="email" value={newEmail} />
		<CodeInput autofocus />
		{#if error}<p class="error-box">{error}</p>{/if}
		<button class="btn-primary w-full" disabled={pending}>Confirm new email</button>
	</form>
	<form method="POST" action="?/resendEmailCode" use:enhance={handle(() => {})} class="mt-3 text-center">
		<input type="hidden" name="email" value={newEmail} />
		<button class="text-sm text-zinc-500 hover:text-zinc-800" disabled={pending}>Send the code again</button>
	</form>
	<button class="mt-1 w-full text-center text-sm text-zinc-500 hover:text-zinc-800" onclick={close}>
		Cancel
	</button>
{/if}
