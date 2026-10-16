<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Pencil, Plus } from '@lucide/svelte';
	import Modal from './Modal.svelte';

	let {
		title,
		canEdit = false,
		addMode = false,
		children,
		edit
	}: {
		title: string;
		canEdit?: boolean;
		/** show "+" instead of pencil */
		addMode?: boolean;
		children: Snippet;
		/** form shown in a popup, receives a function closing it */
		edit?: Snippet<[() => void]>;
	} = $props();

	let editing = $state(false);
	const close = () => (editing = false);
</script>

<section class="card">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-lg font-semibold">{title}</h2>
		{#if canEdit && edit}
			<button class="btn-ghost" onclick={() => (editing = true)} aria-label="Edit {title}">
				{#if addMode}<Plus size={18} />{:else}<Pencil size={16} />{/if}
			</button>
		{/if}
	</div>
	{@render children()}
</section>

{#if edit}
	<Modal bind:open={editing} title={addMode ? `Add ${title.toLowerCase()}` : title}>
		{@render edit(close)}
	</Modal>
{/if}
