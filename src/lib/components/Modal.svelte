<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { X } from '@lucide/svelte';

	let {
		open = $bindable(false),
		title,
		children
	}: { open?: boolean; title: string; children: Snippet } = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<!-- Centered popup on desktop, bottom sheet on phones. Content is mounted only while open,
     so forms start from the current values every time. -->
<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	onclick={(e) => e.target === dialog && dialog.close()}
	class="m-auto max-h-[90dvh] w-full max-w-lg rounded-3xl bg-white p-0 backdrop:bg-black/40 open:flex open:flex-col max-sm:mb-0 max-sm:max-w-none max-sm:rounded-b-none"
>
	{#if open}
		<div class="flex items-center justify-between px-5 pt-4 pb-2">
			<h2 class="text-lg font-semibold">{title}</h2>
			<button class="btn-ghost" onclick={() => dialog.close()} aria-label="Close"><X size={20} /></button>
		</div>
		<div class="overflow-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
			{@render children()}
			{#if page.form?.error}<p class="error-box mt-3">{page.form.error}</p>{/if}
		</div>
	{/if}
</dialog>
