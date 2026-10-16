<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import EventCard from '#lib/components/EventCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Alumap - Events</title></svelte:head>

<div class="mb-5 flex items-center justify-between">
	<h1 class="text-2xl font-bold tracking-tight">Events</h1>
	<a href="/events/new" class="btn-primary"><Plus size={18} />New event</a>
</div>

{#if data.mine.length}
	<h2 class="mb-2 text-sm font-semibold text-zinc-500">Your submissions</h2>
	<div class="mb-6 space-y-3">
		{#each data.mine as event (event.nanoId)}<EventCard {event} />{/each}
	</div>
{/if}

{#if data.upcoming.length}
	<div class="space-y-3">
		{#each data.upcoming as event (event.nanoId)}<EventCard {event} />{/each}
	</div>
{:else}
	<div class="card text-center text-sm text-zinc-500">
		No upcoming events yet. Organize the first one!
	</div>
{/if}

{#if data.past.length}
	<h2 class="mt-8 mb-2 text-sm font-semibold text-zinc-500">Past events</h2>
	<div class="space-y-3">
		{#each data.past as event (event.nanoId)}<EventCard {event} past />{/each}
	</div>
{/if}
