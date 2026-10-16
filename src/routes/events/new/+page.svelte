<script lang="ts">
	import EventForm from '#lib/components/EventForm.svelte';
	import type { PageProps } from './$types';

	let { form, data }: PageProps = $props();
</script>

<svelte:head><title>Alumap - New event</title></svelte:head>

<h1 class="mb-1 text-2xl font-bold tracking-tight">New event</h1>

<EventForm error={form?.error} isAdmin={data.me?.isAdmin} ownerId={data.me?.id} />
