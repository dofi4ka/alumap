<script lang="ts">
	import { enhance } from '$app/forms';
	import { Bell, MapPin, Plus, X } from '@lucide/svelte';
	import CityPicker from '#lib/components/CityPicker.svelte';
	import { submitThen } from '#lib/enhance.ts';
	import { formatDay } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const sourceLabel = { location: 'Your location', temporary: 'Temporary location', manual: 'Added by you' };

	const timeAgo = (date: Date) => {
		const diff = Date.now() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} h ago`;
		return formatDay(date);
	};
</script>

<svelte:head><title>Alumap - Notifications</title></svelte:head>

<div class="space-y-5">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Notifications</h1>
		<p class="mt-1 text-sm text-zinc-500">
			Alumni appearing in the cities you follow, or within 150 km of them.
		</p>
	</div>

	{#if form?.error}
		<p class="error-box">{form.error}</p>
	{/if}

	<section class="card p-0 sm:p-0">
		{#if data.notifications.length === 0}
			<div class="flex flex-col items-center gap-2 px-6 py-12 text-center">
				<span class="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
					<Bell size={22} />
				</span>
				<p class="font-medium">Nothing here yet</p>
				<p class="max-w-xs text-sm text-zinc-500">
					Follow a city below and we will tell you when an alum shows up there.
				</p>
			</div>
		{:else}
			<ul class="divide-y divide-zinc-100">
				{#each data.notifications as n (n.id)}
					<li class="flex gap-3 px-4 py-3 {n.wasUnread ? 'bg-brand-50/40' : ''}">
						<span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
							<MapPin size={17} />
						</span>
						<div class="min-w-0 flex-1">
							<p class="text-sm leading-snug text-zinc-800">{n.message}</p>
							<p class="mt-0.5 text-xs text-zinc-400">
								{timeAgo(n.createdAt)}
								{#if n.nearCityName}· near {n.nearCityName}{/if}
							</p>
						</div>
						{#if n.actorNanoId}
							<a class="shrink-0 self-center text-sm font-medium text-brand-700 hover:underline" href="/u/{n.actorNanoId}">
								View
							</a>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card">
		<h2 class="text-lg font-semibold">Cities you follow</h2>
		<p class="mt-1 text-sm text-zinc-500">
			Your profile city and temporary city are followed automatically. You can mute a city without
			removing it, or remove it completely.
		</p>

		<ul class="mt-4 space-y-2">
			{#each data.follows as city (city.id)}
				<li class="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 {city.enabled ? '' : 'opacity-60'}">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{city.name}</p>
						<p class="text-xs text-zinc-500">{sourceLabel[city.source]}</p>
					</div>
					<form method="POST" action="?/toggleCity" use:enhance={submitThen()} class="contents">
						<input type="hidden" name="id" value={city.id} />
						<button
							class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold {city.enabled
								? 'bg-brand-100 text-brand-800'
								: 'bg-zinc-100 text-zinc-500'}"
							title={city.enabled ? 'Mute this city' : 'Unmute this city'}
						>
							{city.enabled ? 'On' : 'Muted'}
						</button>
					</form>
					<form method="POST" action="?/removeCity" use:enhance={submitThen()} class="contents">
						<input type="hidden" name="id" value={city.id} />
						<button class="btn-ghost shrink-0 text-zinc-400" aria-label="Remove {city.name}">
							<X size={16} />
						</button>
					</form>
				</li>
			{:else}
				<li class="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-400">
					No cities yet — add your current city or any city you care about.
				</li>
			{/each}
		</ul>

		<form method="POST" action="?/addCity" use:enhance={submitThen()} class="mt-4 space-y-2">
			<CityPicker placeholder="Add a city, e.g. Kazan" />
			<button class="btn-secondary w-full"><Plus size={16} />Follow city</button>
		</form>

		{#if !data.isApproved}
			<p class="mt-3 text-xs text-zinc-400">
				Notifications start after your account is approved.
			</p>
		{/if}
	</section>

	<p class="px-1 text-xs text-zinc-400">
		Notifications are sent to your main email and to Telegram when it is connected.
	</p>
</div>
