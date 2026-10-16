<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, subtitle, children }: { title: string; subtitle?: string; children: Snippet } = $props();
</script>

<div class="mx-auto flex min-h-[80dvh] max-w-sm flex-col justify-center">
	<div class="mb-8 text-center">
		<div class="mb-4 inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
			<img src="/favicon.png" alt="" class="size-8" />Alumap
		</div>
		<h1 class="text-xl font-semibold">{title}</h1>
		{#if subtitle}<p class="mt-1 text-sm text-zinc-500">{subtitle}</p>{/if}
	</div>
	{@render children()}
</div>
