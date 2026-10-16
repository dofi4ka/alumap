<script lang="ts">
	import EventForm from '#lib/components/EventForm.svelte';
	import type { PageProps } from './$types';

	let { form, data }: PageProps = $props();
</script>

<svelte:head><title>Alumap - Edit event</title></svelte:head>

<a href="/events/{data.event.nanoId}" class="text-sm text-zinc-500 hover:text-zinc-800">← Back to event</a>
<h1 class="mt-2 mb-1 text-2xl font-bold tracking-tight">Edit event</h1>
{#if !data.me?.isAdmin}
	<p class="mb-5 text-sm text-zinc-500">After saving, the event will be reviewed by admins again.</p>
{/if}
<div class="mt-4">
	<EventForm event={data.event} error={form?.error} ownerId={data.event.ownerId} coOrganizers={data.coOrganizers} />
</div>
