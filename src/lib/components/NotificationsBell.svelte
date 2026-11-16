<script lang="ts">
	import { Bell, MapPin } from '@lucide/svelte';
	import Modal from './Modal.svelte';
	import { formatDay } from '#lib/format.ts';

	type Item = {
		id: number;
		message: string;
		actorNanoId: string | null;
		eventNanoId: string | null;
		nearCityName: string | null;
		createdAt: number;
		wasUnread: boolean;
	};

	let { unread }: { unread: number } = $props();

	let open = $state(false);
	let loading = $state(false);
	let error = $state('');
	let items = $state<Item[]>([]);
	// svelte-ignore state_referenced_locally
	let shownUnread = $state(unread);

	$effect(() => {
		shownUnread = unread;
	});

	const timeAgo = (date: number) => {
		const minutes = Math.floor((Date.now() - date) / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} h ago`;
		return formatDay(new Date(date));
	};

	async function show() {
		open = true;
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/notifications');
			if (!response.ok) throw new Error('Could not load notifications');
			const data = (await response.json()) as { notifications: Item[] };
			items = data.notifications;
			shownUnread = 0;
			await fetch('/api/notifications', { method: 'POST' });
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}
</script>

<button
	class="relative rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
	onclick={show}
	aria-label="Notifications"
>
	<Bell size={20} />
	{#if shownUnread > 0}
		<span
			class="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-brand-500 px-1 text-center text-[10px] leading-4 font-semibold text-white ring-2 ring-white"
		>
			{shownUnread > 9 ? '9+' : shownUnread}
		</span>
	{/if}
</button>

<Modal bind:open={open} title="Notifications">
	{#if loading && items.length === 0}
		<p class="py-8 text-center text-sm text-zinc-500">Loading…</p>
	{:else if error}
		<p class="error-box">{error}</p>
	{:else if items.length === 0}
		<div class="flex flex-col items-center gap-2 py-8 text-center">
			<span class="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
				<Bell size={22} />
			</span>
			<p class="font-medium">Nothing here yet</p>
			<p class="max-w-xs text-sm text-zinc-500">
				Follow cities in your profile and we will tell you when an alum shows up there.
			</p>
		</div>
	{:else}
		<ul class="-mx-1 divide-y divide-zinc-100">
			{#each items as n (n.id)}
				<li class="flex gap-3 rounded-xl px-1 py-3 {n.wasUnread ? 'bg-brand-50/50' : ''}">
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
					{#if n.actorNanoId || n.eventNanoId}
						<a
							class="shrink-0 self-center text-sm font-medium text-brand-700 hover:underline"
							href={n.actorNanoId ? `/u/${n.actorNanoId}` : `/events/${n.eventNanoId}`}
							onclick={() => (open = false)}
						>
							View
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
