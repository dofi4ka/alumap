<script lang="ts">
	import { Pencil } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Alumap - {data.about.title}</title></svelte:head>

<div class="mb-5 flex items-start justify-between gap-3">
	<h1 class="text-2xl font-bold tracking-tight">{data.about.title}</h1>
	{#if data.me?.isAdmin}
		<a href="/admin?tab=about" class="btn-secondary shrink-0 py-2"><Pencil size={16} />Edit</a>
	{/if}
</div>

{#if data.about.content}
	<div class="rich-text leading-relaxed text-zinc-800">{@html data.about.content}</div>
{/if}
