<script lang="ts">
	import { enhance } from '$app/forms';
	import { submitThen } from '#lib/enhance.ts';
	import BadgeTile from './BadgeTile.svelte';
	import IconPicker from './IconPicker.svelte';

	type Rarity = 'bronze' | 'silver' | 'gold';
	type EditedBadge = { id: number; name: string; description: string; rarity: Rarity; svg: string; builtIn: boolean };

	/** New badge when `badge` is null. Mounted fresh every time the popup opens. */
	let { badge = null, close }: { badge?: EditedBadge | null; close: () => void } = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(badge?.name ?? '');
	// svelte-ignore state_referenced_locally
	let rarity = $state<Rarity>(badge?.rarity ?? 'bronze');
	// svelte-ignore state_referenced_locally
	let svg = $state(badge?.svg ?? '');
</script>

<form method="POST" action="?/saveBadge" use:enhance={submitThen(close)} class="space-y-3">
	{#if badge}<input type="hidden" name="id" value={badge.id} />{/if}
	<div>
		<label class="label" for="badge-name">Title</label>
		<input id="badge-name" class="input" name="name" maxlength="60" bind:value={name} required />
	</div>
	<div>
		<label class="label" for="badge-desc">Description</label>
		<input id="badge-desc" class="input" name="description" maxlength="200" value={badge?.description ?? ''} required />
	</div>
	<div>
		<label class="label" for="badge-rarity">Rarity</label>
		<select id="badge-rarity" class="input" name="rarity" bind:value={rarity} required>
			<option value="bronze">Bronze</option>
			<option value="silver">Silver</option>
			<option value="gold">Gold</option>
		</select>
	</div>
	<div>
		<span class="label">Icon</span>
		<IconPicker {rarity} bind:svg />
	</div>
	<div class="flex flex-col items-center rounded-2xl bg-zinc-50 py-3">
		<span class="mb-2 text-xs text-zinc-400">Preview</span>
		{#if svg}
			<div class="w-20 p-1"><BadgeTile name={name || 'Badge title'} {rarity} {svg} /></div>
		{:else}
			<p class="py-6 text-sm text-zinc-400">Pick an icon</p>
		{/if}
	</div>
	<div class="flex items-center gap-2 pt-2">
		{#if badge && !badge.builtIn}
			<button
				class="btn-danger"
				formaction="?/deleteBadge"
				formnovalidate
				onclick={(e) => !confirm(`Delete "${badge.name}" and take it from everyone?`) && e.preventDefault()}
			>
				Delete
			</button>
		{/if}
		<button type="button" class="btn-secondary ml-auto" onclick={close}>Cancel</button>
		<button class="btn-primary">{badge ? 'Save' : 'Create badge'}</button>
	</div>
</form>
