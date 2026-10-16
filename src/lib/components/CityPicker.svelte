<script lang="ts">
	import { MapPin, X } from '@lucide/svelte';

	type Place = { name: string; lat: number; lng: number };
	type Option = Place & { label: string };

	let {
		value = null,
		placeholder = 'Start typing a city…',
		required = false
	}: { value?: Place | null; placeholder?: string; required?: boolean } = $props();

	// svelte-ignore state_referenced_locally
	let selected = $state<Place | null>(value);
	// svelte-ignore state_referenced_locally
	let query = $state(value?.name ?? '');
	let options = $state<Option[]>([]);
	let open = $state(false);
	let highlighted = $state(0);
	let timer: ReturnType<typeof setTimeout>;
	let controller: AbortController | undefined;

	function onInput() {
		selected = null;
		clearTimeout(timer);
		timer = setTimeout(search, 150);
	}

	async function search() {
		controller?.abort();
		if (query.trim().length < 2) {
			options = [];
			return;
		}
		controller = new AbortController();
		try {
			const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`, {
				signal: controller.signal
			});
			options = await res.json();
			highlighted = 0;
			open = true;
		} catch {
			// aborted
		}
	}

	function choose(o: Option) {
		selected = { name: o.name, lat: o.lat, lng: o.lng };
		query = o.name;
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open || options.length === 0) return;
		if (e.key === 'ArrowDown') highlighted = (highlighted + 1) % options.length;
		else if (e.key === 'ArrowUp') highlighted = (highlighted - 1 + options.length) % options.length;
		else if (e.key === 'Enter') choose(options[highlighted]);
		else if (e.key === 'Escape') open = false;
		else return;
		e.preventDefault();
	}
</script>

<div class="relative">
	<div class="relative">
		<MapPin size={18} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
		<input
			class="input pr-9 pl-9"
			bind:value={query}
			oninput={onInput}
			onkeydown={onKeydown}
			onfocus={() => options.length && (open = true)}
			onblur={() => setTimeout(() => (open = false), 150)}
			{placeholder}
			autocomplete="off"
			{required}
		/>
		{#if query}
			<button
				type="button"
				class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100"
				onclick={() => ((query = ''), (selected = null), (options = []))}
				aria-label="Clear"><X size={16} /></button
			>
		{/if}
	</div>

	{#if open && options.length}
		<ul class="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
			{#each options as o, i (o.label + o.lat)}
				<li>
					<button
						type="button"
						class="block w-full px-3.5 py-2 text-left text-sm {i === highlighted ? 'bg-brand-50' : ''}"
						onmousedown={(e) => e.preventDefault()}
						onclick={() => choose(o)}>{o.label}</button
					>
				</li>
			{/each}
		</ul>
	{/if}

	{#if query && !selected}
		<p class="mt-1 text-xs text-amber-600">Pick a city from the list</p>
	{/if}

	<input type="hidden" name="locationName" value={selected?.name ?? ''} />
	<input type="hidden" name="locationLat" value={selected?.lat ?? ''} />
	<input type="hidden" name="locationLng" value={selected?.lng ?? ''} />
</div>
