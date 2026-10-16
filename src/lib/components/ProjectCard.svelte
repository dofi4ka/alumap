<script lang="ts">
	import { HandCoins, Lightbulb } from '@lucide/svelte';
	import { formatCost } from '#lib/format.ts';
	import { imageUrl } from '#lib/images.ts';

	let {
		project
	}: {
		project: {
			nanoId: string;
			title: string;
			description: string;
			imageId: string | null;
			fundraisingGoal: number | null;
			status: string;
		};
	} = $props();
</script>

<a
	href="/projects/{project.nanoId}"
	class="flex gap-4 rounded-2xl border border-zinc-200/80 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm"
>
	{#if project.imageId}
		<img
			src={imageUrl(project.imageId, true)}
			alt=""
			loading="lazy"
			width="96"
			height="96"
			class="size-20 shrink-0 rounded-xl bg-zinc-100 object-cover sm:size-24"
		/>
	{:else}
		<div class="flex size-20 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 sm:size-24">
			<Lightbulb size={28} />
		</div>
	{/if}
	<div class="min-w-0 flex-1 py-0.5">
		<h3 class="line-clamp-2 font-semibold">{project.title}</h3>
		{#if project.description}
			<p class="mt-0.5 line-clamp-2 text-sm text-zinc-500">{project.description}</p>
		{/if}
		{#if project.fundraisingGoal}
			<div class="mt-1 flex items-center gap-1 text-sm text-zinc-500">
				<HandCoins size={14} />Goal {formatCost(project.fundraisingGoal)}
			</div>
		{/if}
		{#if project.status === 'pending'}
			<span class="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
				Waiting for review
			</span>
		{/if}
	</div>
</a>
