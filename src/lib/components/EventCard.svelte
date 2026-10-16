<script lang="ts">
	import { CalendarDays, MapPin, Users } from '@lucide/svelte';
	import { formatCost, formatEventDate } from '#lib/format.ts';
	import { imageUrl } from '#lib/images.ts';

	let {
		event,
		past = false
	}: {
		event: {
			nanoId: string;
			title: string;
			imageId: string | null;
			startsAt: string;
			locationName: string;
			cost: number | null;
			status: string;
			participants: number;
		};
		past?: boolean;
	} = $props();
</script>

<a
	href="/events/{event.nanoId}"
	class="flex gap-4 rounded-2xl border border-zinc-200/80 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm {past
		? 'grayscale'
		: ''}"
>
	{#if event.imageId}
		<img
			src={imageUrl(event.imageId, true)}
			alt=""
			loading="lazy"
			width="96"
			height="96"
			class="size-20 shrink-0 rounded-xl bg-zinc-100 object-cover sm:size-24"
		/>
	{:else}
		<div class="flex size-20 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 sm:size-24">
			<CalendarDays size={28} />
		</div>
	{/if}
	<div class="min-w-0 flex flex-col justify-between py-0.5">
    <div>
      <div class="text-xs font-semibold tracking-wide text-brand-600 uppercase">{formatEventDate(event.startsAt)}</div>
      <h3 class="mt-0.5 line-clamp-2 font-semibold">{event.title}</h3>
    </div>
		<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-zinc-500">
			<span class="flex items-center gap-1"><MapPin size={14} />{event.locationName}</span>
			{#if event.participants}<span class="flex items-center gap-1"><Users size={14} />{event.participants}</span>{/if}
			<span>{formatCost(event.cost)}</span>
		</div>
		{#if event.status === 'pending'}
			<span class="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
				Waiting for review
			</span>
		{/if}
	</div>
</a>
