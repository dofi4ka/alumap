<script lang="ts">
	import { Search } from '@lucide/svelte';

	let {
		name = 'icon',
		rarity = 'bronze',
		svg = $bindable('')
	}: {
		name?: string;
		rarity?: 'bronze' | 'silver' | 'gold';
		/** markup of the selected icon, for previews */
		svg?: string;
	} = $props();

	// same tones as BadgeIcon (tailwind orange-700, slate-500, yellow-600)
	const rarityColors = { bronze: '#c2410c', silver: '#64748b', gold: '#ca8a04' };

	type IconData = { body: string; width: number; height: number };
	type IconSet = {
		width?: number;
		height?: number;
		icons: Record<string, { body: string; width?: number; height?: number }>;
		aliases?: Record<string, { parent: string }>;
	};

	let query = $state('');
	let icons = $state<string[]>([]);
	let data = $state<Record<string, IconData>>({});
	let selected = $state('');
	let loading = $state(false);

	// only a picked icon replaces the bound svg, so editing keeps the current icon until then
	$effect(() => {
		const d = data[selected];
		if (d) svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.width} ${d.height}">${d.body}</svg>`;
	});
	let timer: ReturnType<typeof setTimeout>;
	let controller: AbortController | undefined;

	function onInput() {
		clearTimeout(timer);
		timer = setTimeout(search, 300);
	}

	/** Search, then load SVG bodies with one request per icon set (instead of one image per icon). */
	async function search() {
		controller?.abort();
		if (query.trim().length < 2) return (icons = []);
		controller = new AbortController();
		const { signal } = controller;
		loading = true;
		try {
			const found: string[] =
				(await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query.trim())}&limit=64`, { signal })
					.then((r) => r.json())).icons ?? [];

			const byPrefix = Map.groupBy(found, (icon) => icon.split(':')[0]);
			const loaded: Record<string, IconData> = {};
			await Promise.all(
				[...byPrefix].map(async ([prefix, list]) => {
					const names = list.map((icon) => icon.split(':')[1]);
					const set: IconSet = await fetch(`https://api.iconify.design/${prefix}.json?icons=${names.join(',')}`, {
						signal
					}).then((r) => r.json());
					for (const n of names) {
						const icon = set.icons[n] ?? set.icons[set.aliases?.[n]?.parent ?? ''];
						if (icon)
							loaded[`${prefix}:${n}`] = {
								body: icon.body,
								width: icon.width ?? set.width ?? 16,
								height: icon.height ?? set.height ?? 16
							};
					}
				})
			);
			data = loaded;
			icons = found.filter((icon) => loaded[icon]);
		} catch {
			// aborted or offline
		}
		loading = false;
	}
</script>

{#snippet iconSvg(icon: string, cls: string)}
	{@const d = data[icon]}
	<!-- monochrome icons use currentColor, so the rarity color is just CSS -->
	<svg viewBox="0 0 {d.width} {d.height}" class={cls} style="color:{rarityColors[rarity]}" aria-label={icon}>
		{@html d.body}
	</svg>
{/snippet}

<div class="space-y-2">
	<div class="relative">
		<Search size={18} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
		<input class="input pl-9" bind:value={query} oninput={onInput} placeholder="Search icons, e.g. rocket" autocomplete="off" />
	</div>
	{#if icons.length}
		<div class="grid max-h-56 grid-cols-8 gap-1 overflow-auto rounded-xl border border-zinc-200 p-2">
			{#each icons as icon (icon)}
				<button
					type="button"
					title={icon}
					onclick={() => (selected = icon)}
					class="flex aspect-square items-center justify-center rounded-lg hover:bg-zinc-100 {selected === icon
						? 'bg-brand-50 ring-2 ring-brand-500'
						: ''}"
				>
					{@render iconSvg(icon, 'size-6')}
				</button>
			{/each}
		</div>
	{:else if query.trim().length >= 2 && !loading}
		<p class="text-sm text-zinc-400">Nothing found</p>
	{/if}
	<input type="hidden" {name} value={selected} />
</div>
