<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { Link2, Send } from '@lucide/svelte';
	import FormActions from './FormActions.svelte';
	import { submitThen } from '#lib/enhance.ts';

	let {
		referral,
		close
	}: {
		referral?: { id: number; company: string; kind: 'link' | 'manual'; url: string | null } | null;
		close: () => void;
	} = $props();

	let kind = $state<'link' | 'manual'>(untrack(() => referral?.kind ?? 'link'));
	const isManual = $derived(kind === 'manual');
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
		<span class="label">How can alumni reach this referral?</span>
		<div class="grid grid-cols-2 gap-2">
			<label
				class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition {kind ===
				'link'
					? 'border-brand-500 bg-brand-50 text-brand-800'
					: 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}"
			>
				<input class="sr-only" type="radio" name="kind" value="link" bind:group={kind} />
				<Link2 size={15} />Link
			</label>
			<label
				class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition {kind ===
				'manual'
					? 'border-brand-500 bg-brand-50 text-brand-800'
					: 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}"
			>
				<input class="sr-only" type="radio" name="kind" value="manual" bind:group={kind} />
				<Send size={15} />Manual
			</label>
		</div>
	</div>
	<div>
		<label class="label" for="ref-url">{isManual ? 'Company link' : 'Referral link'}</label>
		<input
			id="ref-url"
			class="input"
			name="url"
			value={referral?.url ?? ''}
			placeholder={isManual ? 'https://company.com' : 'https://company.com/jobs?ref=you'}
			maxlength="500"
			autocomplete="off"
			required
		/>
		{#if isManual}
			<p class="mt-1.5 text-xs text-zinc-500">
				Paste the company's website. Visitors will see a “DM me” button that opens a chat with you in
				Telegram instead of a copied link.
			</p>
		{/if}
	</div>
	<FormActions onCancel={close} label={referral ? 'Save' : 'Add referral'} />
</form>
