<script lang="ts">
	import { onMount } from 'svelte';
	import 'quill/dist/quill.snow.css';
	import type Quill from 'quill';
	import { normalizeRichText } from '#lib/rich-text.ts';

	let {
		name = 'content',
		value = '',
		placeholder = 'Start writing…',
		onchange
	}: {
		name?: string;
		value?: string | null;
		placeholder?: string;
		onchange?: () => void;
	} = $props();

	let container = $state<HTMLDivElement>();
	// svelte-ignore state_referenced_locally
	let html = $state(normalizeRichText(value));
	let ready = $state(false);

	onMount(() => {
		let disposed = false;
		void import('quill').then(({ default: Editor }) => {
			if (disposed || !container) return;
			const quill: Quill = new Editor(container, {
				theme: 'snow',
				placeholder,
				modules: {
					toolbar: [
						[{ header: 2 }, 'bold', 'italic', 'underline', 'strike'],
						[{ list: 'ordered' }, { list: 'bullet' }, 'blockquote'],
						['link'],
						['clean']
					]
				}
			});
			if (html) quill.clipboard.dangerouslyPasteHTML(html);
			quill.on('text-change', () => {
				html = quill.getSemanticHTML();
				onchange?.();
			});
			ready = true;
		});
		return () => {
			disposed = true;
		};
	});
</script>

<div class="rich-text-editor relative">
	<div bind:this={container}></div>
	{#if !ready}
		<div class="absolute inset-0 flex items-center px-4 text-sm text-zinc-400">Loading editor…</div>
	{/if}
	<input type="hidden" {name} value={html} />
</div>
