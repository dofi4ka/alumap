<script lang="ts">
	import Avatar from './Avatar.svelte';
	import Modal from './Modal.svelte';

	type Person = {
		id: number;
		nanoId: string;
		firstName: string;
		lastName: string;
		avatarId: string | null;
		headline: string | null;
	};

	let { open = $bindable(false), title, people }: { open?: boolean; title: string; people: Person[] } = $props();
</script>

<Modal bind:open {title}>
	{#if people.length}
		<ul class="-mx-3">
			{#each people as p (p.id)}
				<li>
					<a href="/u/{p.nanoId}" class="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-zinc-50 active:bg-zinc-100">
						<Avatar user={p} size={44} />
						<span class="min-w-0">
							<span class="block truncate font-medium">{p.firstName} {p.lastName}</span>
							{#if p.headline}<span class="block truncate text-sm text-zinc-500">{p.headline}</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="py-4 text-center text-sm text-zinc-400">Nobody yet</p>
	{/if}
</Modal>
