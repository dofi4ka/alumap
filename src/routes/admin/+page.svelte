<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	import BadgeForm from '#lib/components/BadgeForm.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PeopleModal from '#lib/components/PeopleModal.svelte';
	import { Plus } from '@lucide/svelte';
	import { submitThen } from '#lib/enhance.ts';
	import { formatEventDate } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const groups = $derived([
		{
			id: 'review',
			label: 'Needs review',
			pending: data.pendingUsers.length + data.pendingEvents.length + data.pendingProjects.length,
			tabs: [
				{ id: 'users', label: 'New users', count: data.pendingUsers.length, review: true },
				{ id: 'events', label: 'Events', count: data.pendingEvents.length, review: true },
				{ id: 'projects', label: 'Projects', count: data.pendingProjects.length, review: true }
			]
		},
		{
			id: 'manage',
			label: 'Manage',
			pending: 0,
			tabs: [
				{ id: 'all-users', label: 'All users', count: data.users.length, review: false },
				{ id: 'badges', label: 'Badges', count: data.badges.length, review: false },
				{ id: 'about', label: 'About page', count: undefined, review: false }
			]
		}
	]);
	const allTabs = $derived(groups.flatMap((g) => g.tabs));
	const rawTab = $derived(page.url.searchParams.get('tab') ?? 'users');
	const tab = $derived(allTabs.some((t) => t.id === rawTab) ? rawTab : 'users');
	let filter = $state('');
	/** badge form popup: 'new', a badge id, or closed */
	let editingBadge = $state<'new' | number | null>(null);
	let holdersOf = $state<number | null>(null);
	let savedAbout = $state(false);
	const editedBadge = $derived(data.badges.find((b) => b.id === editingBadge) ?? null);
	const holdersBadge = $derived(data.badges.find((b) => b.id === holdersOf));

	const visibleUsers = $derived(
		data.users.filter((u) =>
			`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(filter.toLowerCase())
		)
	);
	const kind = (u: { ssoEmail: string | null; graduationYear: number | null }) =>
		u.ssoEmail
			? `IU alumni${u.graduationYear ? ` ’${String(u.graduationYear).slice(2)}` : ''}`
			: 'IU Friend';
</script>

<svelte:head><title>Alumap - Admin</title></svelte:head>

<h1 class="mb-5 text-2xl font-bold tracking-tight">Admin</h1>

<div class="md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-6">
	<aside class="mb-5 md:sticky md:top-20 md:mb-0">
		<nav class="space-y-4">
			{#each groups as group (group.id)}
				<div>
					<div class="mb-1.5 flex items-center justify-between gap-2 px-2">
						<p class="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{group.label}</p>
						{#if group.id === 'review' && group.pending > 0}
							<span class="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
								{group.pending}
							</span>
						{/if}
					</div>
					<div class="flex flex-wrap gap-1 md:flex-col md:gap-0.5">
						{#each group.tabs as t (t.id)}
							<a
								href="?tab={t.id}"
								data-sveltekit-noscroll
								data-sveltekit-replacestate
								aria-current={tab === t.id ? 'page' : undefined}
								class="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium {tab === t.id
									? 'bg-brand-50 text-brand-700'
									: 'text-zinc-600 hover:bg-zinc-100'}"
							>
								<span class="flex-1">{t.label}</span>
								{#if t.count !== undefined}
									<span
										class="rounded-full px-1.5 text-xs {t.count && t.review
											? 'bg-brand-500 text-white'
											: 'bg-zinc-100 text-zinc-500'}">{t.count}</span
									>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</nav>
	</aside>

	<div class="min-w-0">

{#if tab === 'users'}
<section class="mb-8">
	{#if data.pendingUsers.length === 0}
		<p class="card text-sm text-zinc-500">Nobody is waiting 🎉</p>
	{/if}
	<div class="space-y-2">
		{#each data.pendingUsers as u (u.id)}
			<div class="card flex flex-wrap items-center gap-3 p-3 sm:p-3">
				<a href="/u/{u.nanoId}" class="flex min-w-0 flex-1 items-center gap-3">
					<Avatar user={u} size={40} />
					<span class="min-w-0">
						<span class="block truncate font-medium">{u.firstName} {u.lastName}</span>
						<span class="block truncate text-xs text-zinc-500">{u.email} - {kind(u)}</span>
					</span>
				</a>
				<div class="flex gap-2">
					<form method="POST" action="?/approveUser" use:enhance={submitThen()}>
						<input type="hidden" name="id" value={u.id} /><button class="btn-primary py-2">Approve</button>
					</form>
					<form method="POST" action="?/ban" use:enhance={submitThen()}>
						<input type="hidden" name="id" value={u.id} /><button class="btn-danger py-2">Ban</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
</section>
{/if}

{#if tab === 'events'}
<section class="mb-8">
	{#if data.pendingEvents.length === 0}
		<p class="card text-sm text-zinc-500">No events to review</p>
	{/if}
	<div class="space-y-2">
		{#each data.pendingEvents as e (e.id)}
			<div class="card flex flex-wrap items-center gap-3 p-3 sm:p-3">
				<a href="/events/{e.nanoId}" class="min-w-0 flex-1">
					<span class="block truncate font-medium">{e.title}</span>
					<span class="block truncate text-xs text-zinc-500">
						{formatEventDate(e.startsAt)} - {e.locationName} - by {e.ownerFirstName} {e.ownerLastName}
					</span>
				</a>
				<div class="flex gap-2">
					<form method="POST" action="?/publishEvent" use:enhance={submitThen()}>
						<input type="hidden" name="id" value={e.id} /><button class="btn-primary py-2">Publish</button>
					</form>
					<form method="POST" action="?/rejectEvent" use:enhance={submitThen()}>
						<input type="hidden" name="id" value={e.id} />
						<button class="btn-secondary py-2" onclick={(ev) => !confirm('Reject and delete this event?') && ev.preventDefault()}>Reject</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
</section>
{/if}

{#if tab === 'projects'}
<section class="mb-8">
	{#if data.pendingProjects.length === 0}
		<p class="card text-sm text-zinc-500">No projects to review</p>
	{/if}
	<div class="space-y-2">
		{#each data.pendingProjects as p (p.id)}
			<div class="card flex flex-wrap items-center gap-3 p-3 sm:p-3">
				<a href="/projects/{p.nanoId}" class="min-w-0 flex-1">
					<span class="block truncate font-medium">{p.title}</span>
					<span class="block truncate text-xs text-zinc-500">by {p.ownerFirstName} {p.ownerLastName}</span>
				</a>
				<div class="flex gap-2">
					<form method="POST" action="?/publishProject" use:enhance={submitThen()}>
						<input type="hidden" name="id" value={p.id} /><button class="btn-primary py-2">Publish</button>
					</form>
					<form method="POST" action="?/rejectProject" use:enhance={submitThen()}>
						<input type="hidden" name="id" value={p.id} />
						<button class="btn-secondary py-2" onclick={(ev) => !confirm('Reject and delete this project?') && ev.preventDefault()}>Reject</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
</section>
{/if}

{#if tab === 'badges'}
<section class="mb-8">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="font-semibold">Badges <span class="text-zinc-400">{data.badges.length}</span></h2>
		<button class="btn-secondary py-1.5" onclick={() => (editingBadge = 'new')}><Plus size={16} />New badge</button>
	</div>
	<div class="card divide-y divide-zinc-100 p-0 sm:p-0">
		{#each data.badges as b (b.id)}
			<div class="flex items-center gap-1 pr-2">
				<button class="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50" onclick={() => (editingBadge = b.id)}>
					<BadgeIcon svg={b.svg} rarity={b.rarity} size={36} />
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-medium">{b.name}</span>
						<span class="block truncate text-xs text-zinc-500">{b.description}</span>
					</span>
				</button>
				<button class="btn-ghost shrink-0 text-xs" onclick={() => (holdersOf = b.id)} disabled={!b.holders.length}>
					{b.holders.length} {b.holders.length === 1 ? 'holder' : 'holders'}
				</button>
			</div>
		{/each}
	</div>
	<p class="mt-2 text-xs text-zinc-400">Click a badge to edit it. Give or take away badges on a user's profile.</p>
</section>
{/if}

{#if tab === 'about'}
<section class="mb-8">
	<form
		method="POST"
		action="?/saveAbout"
		use:enhance={submitThen(() => (savedAbout = true))}
		class="card space-y-4"
	>
		<div>
			<label class="label" for="about-title">Title</label>
			<input
				id="about-title"
				class="input"
				name="title"
				value={data.about.title}
				maxlength="120"
				required
				oninput={() => (savedAbout = false)}
			/>
		</div>
		<div>
			<label class="label" for="about-content">Content</label>
			<textarea
				id="about-content"
				class="input min-h-72"
				name="content"
				maxlength="20000"
				required
				oninput={() => (savedAbout = false)}>{data.about.content}</textarea
			>
			<p class="mt-1 text-xs text-zinc-400">
				Plain text: line breaks are preserved, blank lines separate paragraphs.
				<a href="/about" class="underline hover:text-zinc-600">View page</a>
			</p>
		</div>
		{#if form?.error}<p class="error-box">{form.error}</p>{/if}
		<div class="flex items-center gap-3">
			<button class="btn-primary">Save</button>
			<span class="text-sm text-brand-700" aria-live="polite">{savedAbout ? 'Saved' : ''}</span>
		</div>
	</form>
</section>
{/if}

<Modal
	bind:open={() => editingBadge !== null, (v) => !v && (editingBadge = null)}
	title={editedBadge ? 'Edit badge' : 'New badge'}
>
	<BadgeForm badge={editedBadge} close={() => (editingBadge = null)} />
</Modal>

{#if holdersBadge}
	<PeopleModal
		bind:open={() => true, (v) => !v && (holdersOf = null)}
		title="{holdersBadge.name} holders"
		people={holdersBadge.holders}
	/>
{/if}

{#if tab === 'all-users'}
<section>
	<div class="mb-3 flex items-center justify-between gap-3">
		<h2 class="font-semibold">Users <span class="text-zinc-400">{data.users.length}</span></h2>
		<input class="input max-w-56 py-1.5" placeholder="Filter…" bind:value={filter} />
	</div>
	<div class="card divide-y divide-zinc-100 p-0 sm:p-0">
		{#each visibleUsers as u (u.id)}
			<div class="flex items-center gap-3 px-3 py-2.5">
				<a href="/u/{u.nanoId}" class="flex min-w-0 flex-1 items-center gap-3">
					<Avatar user={u} size={36} />
					<span class="min-w-0">
						<span class="block truncate text-sm font-medium">
							{u.firstName} {u.lastName}
							{#if u.isAdmin}<span class="chip ml-1 px-2 py-0 text-xs">admin</span>{/if}
							{#if u.isBanned}<span class="ml-1 rounded-full bg-red-50 px-2 text-xs text-red-700">banned</span>{/if}
						</span>
						<span class="block truncate text-xs text-zinc-500">{u.email} - {kind(u)}</span>
					</span>
				</a>
				{#if !u.isAdmin}
					<form method="POST" action={u.isBanned ? '?/unban' : '?/ban'} use:enhance={submitThen()}>
						<input type="hidden" name="id" value={u.id} />
						<button class={u.isBanned ? 'btn-secondary py-1.5' : 'btn-ghost text-red-600'}>{u.isBanned ? 'Unban' : 'Ban'}</button>
					</form>
				{/if}
			</div>
		{/each}
	</div>
</section>
{/if}
	</div>
</div>
