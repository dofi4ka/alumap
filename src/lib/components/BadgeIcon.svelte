<script lang="ts">
	import { Lock } from '@lucide/svelte';

	let {
		svg,
		rarity,
		size = 48,
		locked = false
	}: { svg: string; rarity: 'bronze' | 'silver' | 'gold'; size?: number; locked?: boolean } = $props();

	const colors = {
		bronze: 'bg-orange-100 text-orange-700 ring-orange-300',
		silver: 'bg-slate-100 text-slate-500 ring-slate-300',
		gold: 'bg-yellow-100 text-yellow-600 ring-yellow-400'
	};
</script>

<!-- svg comes from iconify (built-in badges or fetched by the server from api.iconify.design) -->
<span class="relative inline-flex shrink-0" style="width:{size}px;height:{size}px">
	<span
		class="inline-flex size-full items-center justify-center rounded-full [&>svg]:size-[55%] {size >= 56 ? 'ring-4' : 'ring-2'} {locked
			? 'bg-zinc-100 text-zinc-400 ring-zinc-200 opacity-70'
			: colors[rarity]}"
	>
		{@html svg}
	</span>
	{#if locked}
		<span
			class="absolute right-0 bottom-0 flex items-center justify-center rounded-full bg-zinc-500 text-white ring-2 ring-white"
			style="width:{size * 0.32}px;height:{size * 0.32}px"
		>
			<Lock size={size * 0.17} strokeWidth={2.5} />
		</span>
	{/if}
</span>
