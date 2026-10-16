<script lang="ts">
	import { Search, X } from '@lucide/svelte';
	import Avatar from './Avatar.svelte';

	type Person = { id: number; firstName: string; lastName: string; avatarId: string | null };

	let {
		name,
		value = [],
		exclude = [],
		placeholder = 'Search people by name'
	}: { name: string; value?: Person[]; exclude?: number[]; placeholder?: string } = $props();

	// svelte-ignore state_referenced_locally
	let selected = $state<Person[]>([...value]);
	let query = $state('');
	let results = $state<Person[]>([]);
	let open = $state(false);
	let timer: ReturnType<typeof setTimeout>;
	let controller: AbortController | undefined;

	const options = $derived(results.filter((p) => !exclude.includes(p.id) && !selected.some((s) => s.id === p.id)));

	function onInput() {
		clearTimeout(timer);
		timer = setTimeout(search, 200);
	}

	async function search() {
		controller?.abort();
		if (query.trim().length < 2) return (results = []);
		controller = new AbortController();
		try {
			results = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((r) => r.json());
			open = true;
		} catch {
			// aborted
		}
	}

	function add(p: Person) {
		selected.push(p);
		query = '';
		results = [];
	}
</script>

<div class="space-y-2">
	{#if selected.length}
		<div class="flex flex-wrap gap-2">
			{#each selected as p (p.id)}
				<span class="flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pr-1.5 pl-1 text-sm">
					<Avatar user={p} size={24} />{p.firstName} {p.lastName}
					<button type="button" class="rounded-full p-0.5 hover:bg-zinc-200" onclick={() => (selected = selected.filter((s) => s.id !== p.id))} aria-label="Remove {p.firstName}">
						<X size={14} />
					</button>
				</span>
				<input type="hidden" {name} value={p.id} />
			{/each}
		</div>
	{/if}
	<div class="relative">
		<Search size={18} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
		<input
			class="input pl-9"
			bind:value={query}
			oninput={onInput}
			onfocus={() => (open = true)}
			onblur={() => setTimeout(() => (open = false), 150)}
			{placeholder}
			autocomplete="off"
		/>
		{#if open && options.length}
			<ul class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
				{#each options as p (p.id)}
					<li>
						<button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50" onmousedown={(e) => e.preventDefault()} onclick={() => add(p)}>
							<Avatar user={p} size={28} />{p.firstName} {p.lastName}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
