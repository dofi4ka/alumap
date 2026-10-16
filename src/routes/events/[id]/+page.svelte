<script lang="ts">
	import { enhance } from '$app/forms';
	import { CalendarDays, ChevronRight, MapPin, Pencil, Trash, Wallet } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import PeopleModal from '#lib/components/PeopleModal.svelte';
	import { submitThen } from '#lib/enhance.ts';
	import { formatCost, formatEventDate } from '#lib/format.ts';
	import { imageUrl } from '#lib/images.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const e = $derived(data.event);

	let attendeesOpen = $state(false);
	const stack = $derived(data.participants.slice(0, 5));
</script>

<svelte:head><title>Alumap - {e.title}</title></svelte:head>

<a href="/events" class="text-sm text-zinc-500 hover:text-zinc-800">← All events</a>

{#if e.status === 'pending'}
	<div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
		This event is waiting for review by admins and is visible only to you and admins.
	</div>
{/if}

<article class="mt-4">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
		<div class="flex min-w-0 flex-1 flex-col">
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{e.title}</h1>
			<div class="mt-3 space-y-1.5 text-zinc-700">
				<div class="flex items-center gap-2.5">
					<CalendarDays size={18} class="shrink-0 text-brand-600" />{formatEventDate(e.startsAt)}
				</div>
				<a href="/?lat={e.locationLat}&lng={e.locationLng}&zoom=10" class="flex items-center gap-2.5 hover:text-brand-700">
					<MapPin size={18} class="shrink-0 text-brand-600" />{[e.address, e.locationName].filter(Boolean).join(', ')}
				</a>
				<div class="flex items-center gap-2.5"><Wallet size={18} class="shrink-0 text-brand-600" />{formatCost(e.cost)}</div>
			</div>
			{#if e.status === 'published' && !data.past && !data.isOrganizer}
				<form method="POST" action={data.joined ? '?/leave' : '?/join'} use:enhance={submitThen()} class="mt-4 sm:mt-auto sm:pt-4">
					{#if data.joined}
						<button class="btn-secondary">Exit event</button>
					{:else}
						<button class="btn-primary">Attend</button>
					{/if}
				</form>
			{/if}
      {#if e.description}
        <p class="mt-6 whitespace-pre-line text-zinc-800 hidden sm:block">{e.description}</p>
      {/if}
		</div>
		<div class="aspect-square w-36 shrink-0 overflow-hidden rounded-2xl sm:w-52">
			{#if e.imageId}
				<img src={imageUrl(e.imageId)} alt="" class="size-full bg-zinc-100 object-cover {data.past ? 'grayscale' : ''}" />
			{:else}
				<div class="flex size-full items-center justify-center bg-brand-50 text-brand-500"><CalendarDays size={36} /></div>
			{/if}
		</div>
	</header>

  {#if e.description}
    <p class="mt-6 whitespace-pre-line text-zinc-800 sm:hidden">{e.description}</p>
  {/if}

	<div class="mt-6 flex items-center gap-3 text-sm">
		<!-- the main organizer is the leftmost avatar, on top of the others -->
		<span class="flex shrink-0 -space-x-2.5">
			{#each data.organizers as o, i (o.id)}
				<span class="relative rounded-full ring-2 ring-white" style="z-index:{data.organizers.length - i}">
					<Avatar user={o} size={36} />
				</span>
			{/each}
		</span>
		<span class="text-zinc-500">
			Organized by
			{#each data.organizers as o, i (o.id)}<a href="/u/{o.nanoId}" class="font-medium text-zinc-900 hover:underline">{o.firstName} {o.lastName}</a>{i < data.organizers.length - 1 ? ', ' : ''}{/each}
		</span>
	</div>

	{#if data.participants.length}
		<!-- phones: one button with the count, a few avatars and a chevron, opens the full list -->
		<button
			class="mt-8 flex w-full items-center gap-3 rounded-2xl bg-zinc-100 px-4 py-3 text-left active:bg-zinc-200 sm:hidden"
			onclick={() => (attendeesOpen = true)}
		>
			<span class="flex-1 font-semibold">{data.participants.length} attendees</span>
			<span class="flex -space-x-2">
				{#each stack as p (p.id)}
					<Avatar user={p} size={32} class="ring-2 ring-zinc-100" />
				{/each}
			</span>
			<ChevronRight size={22} class="text-zinc-500" />
		</button>

		<h2 class="mt-8 mb-3 hidden font-semibold sm:block">Attendees</h2>
		<div class="hidden flex-wrap gap-2 sm:flex">
			{#each data.participants as p (p.id)}
				<a href="/u/{p.nanoId}" class="flex items-center gap-2 rounded-full bg-zinc-50 py-1 pr-3 pl-1 text-sm hover:bg-zinc-100">
					<Avatar user={p} size={28} />{p.firstName} {p.lastName}
				</a>
			{/each}
		</div>

		<PeopleModal bind:open={attendeesOpen} title="Attendees" people={data.participants} />
	{/if}
</article>

{#if data.canEdit}
	<div class="mt-8 flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
		<a href="/events/{e.nanoId}/edit" class="btn-secondary"><Pencil size={16} />Edit</a>
		{#if data.isAdmin && e.status === 'pending'}
			<form method="POST" action="?/publish" use:enhance={submitThen()}><button class="btn-primary">Publish</button></form>
		{/if}
		<form method="POST" action="?/delete" use:enhance>
			<button class="btn-danger" onclick={(ev) => !confirm('Delete this event?') && ev.preventDefault()}><Trash size={16} />Delete</button>
		</form>
	</div>
{/if}
