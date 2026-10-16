<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import BadgeTile from './BadgeTile.svelte';

	type StripBadge = {
		id: number;
		name: string;
		rarity: 'bronze' | 'silver' | 'gold';
		svg: string;
		earnedAt: Date | null;
		progress: { current: number; target: number } | null;
	};

	let { badges, onselect }: { badges: StripBadge[]; onselect: (id: number) => void } = $props();

	let strip = $state<HTMLUListElement>();
	let canLeft = $state(false);
	let canRight = $state(false);

	function update() {
		if (!strip) return;
		canLeft = strip.scrollLeft > 1;
		canRight = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
	}

	const scrollBy = (dir: 1 | -1) => strip?.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: 'smooth' });

	$effect(() => {
		update();
		const observer = new ResizeObserver(update);
		observer.observe(strip!);
		return () => observer.disconnect();
	});
</script>

<div class="relative">
	<ul bind:this={strip} onscroll={update} class="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none]">
		{#each badges as badge (badge.id)}
			{@const locked = !badge.earnedAt}
			<li class="w-20 shrink-0">
				<button class="w-full rounded-2xl p-1 hover:bg-zinc-50" onclick={() => onselect(badge.id)}>
					<BadgeTile name={badge.name} rarity={badge.rarity} svg={badge.svg} {locked} progress={badge.progress} />
				</button>
			</li>
		{/each}
	</ul>

	{#if canLeft}
		<div class="pointer-events-none absolute inset-y-0 left-0 flex w-16 items-center bg-linear-to-r from-white via-white/80 to-transparent">
			<button class="pointer-events-auto ml-0.5 rounded-full bg-white p-1.5 shadow-md hover:bg-zinc-50" onclick={() => scrollBy(-1)} aria-label="Scroll badges left">
				<ChevronLeft size={18} />
			</button>
		</div>
	{/if}
	{#if canRight}
		<div class="pointer-events-none absolute inset-y-0 right-0 flex w-16 items-center justify-end bg-linear-to-l from-white via-white/80 to-transparent">
			<button class="pointer-events-auto mr-0.5 rounded-full bg-white p-1.5 shadow-md hover:bg-zinc-50" onclick={() => scrollBy(1)} aria-label="Scroll badges right">
				<ChevronRight size={18} />
			</button>
		</div>
	{/if}
</div>
