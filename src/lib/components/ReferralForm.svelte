<script lang="ts">
	import { enhance } from '$app/forms';
	import FormActions from './FormActions.svelte';
	import { submitThen } from '#lib/enhance.ts';

	let {
		referral,
		close
	}: {
		referral?: { id: number; company: string; url: string | null } | null;
		close: () => void;
	} = $props();
</script>

<form method="POST" action="?/saveReferral" use:enhance={submitThen(close)} class="space-y-3">
	{#if referral}<input type="hidden" name="id" value={referral.id} />{/if}
	<div>
		<label class="label" for="ref-company">Company</label>
		<input
			id="ref-company"
			class="input"
			name="company"
			value={referral?.company ?? ''}
			placeholder="Company name"
			maxlength="80"
			required
		/>
	</div>
	<div>
		<label class="label" for="ref-url">Referral link</label>
		<input
			id="ref-url"
			class="input"
			name="url"
			value={referral?.url ?? ''}
			placeholder="https://company.com/jobs?ref=you"
			maxlength="500"
			autocomplete="off"
			required
		/>
	</div>
	<FormActions onCancel={close} label={referral ? 'Save' : 'Add referral'} />
</form>
