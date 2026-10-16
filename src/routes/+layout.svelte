<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { Map, CalendarDays, Lightbulb, Shield } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const me = $derived(data.me);
	const fullAccess = $derived(me && me.isApproved && !me.isBanned);
	const isMap = $derived(page.url.pathname === '/');

	const links = $derived([
		{ href: '/', label: 'Map', icon: Map, active: isMap },
		{ href: '/events', label: 'Events', icon: CalendarDays, active: page.url.pathname.startsWith('/events') },
		{ href: '/projects', label: 'Projects', icon: Lightbulb, active: page.url.pathname.startsWith('/projects') },
		...(me?.isAdmin
			? [{ href: '/admin', label: 'Admin', icon: Shield, active: page.url.pathname.startsWith('/admin') }]
			: [])
	]);
	const profileActive = $derived(!!me && page.url.pathname.startsWith(`/u/${me.nanoId}`));
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/favicon.png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<title>Alumap</title>
	<meta name="theme-color" content="#ffffff" />
</svelte:head>

{#if me}
	<!-- top bar: desktop always, mobile only for limited accounts -->
	<header
		class="fixed inset-x-0 top-0 z-30 h-14 border-b border-zinc-200/70 bg-white/85 backdrop-blur-md {fullAccess
			? 'hidden md:block'
			: ''}"
	>
		<div class="mx-auto flex h-full max-w-5xl items-center gap-2 px-4">
			<a href="/" class="mr-4 flex items-center gap-2 text-lg font-bold tracking-tight">
				<img src="/favicon.png" alt="" class="size-6" />Alumap
			</a>
			{#if fullAccess}
				{#each links as l (l.href)}
					<a
						href={l.href}
						class="rounded-lg px-3 py-1.5 text-sm font-medium {l.active
							? 'bg-brand-50 text-brand-700'
							: 'text-zinc-600 hover:text-zinc-900'}">{l.label}</a
					>
				{/each}
			{/if}
			<div class="ml-auto flex items-center gap-1">
				<a href="/profile" class="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-zinc-100">
					<Avatar user={me} size={30} />
					<span class="text-sm font-medium">{me.firstName}</span>
				</a>
			</div>
		</div>
	</header>

	{#if fullAccess}
		<!-- bottom tab bar on mobile -->
		<nav
			class="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
		>
			<div class="flex h-16">
				{#each links as l (l.href)}
					<a
						href={l.href}
						class="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium {l.active
							? 'text-brand-600'
							: 'text-zinc-500'}"
					>
						<l.icon size={22} strokeWidth={l.active ? 2.4 : 2} />
						{l.label}
					</a>
				{/each}
				<a
					href="/profile"
					class="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium {profileActive
						? 'text-brand-600'
						: 'text-zinc-500'}"
				>
					<Avatar user={me} size={24} class={profileActive ? 'ring-2 ring-brand-500' : ''} />
					Profile
				</a>
			</div>
		</nav>
	{/if}
{/if}

{#if isMap}
	{@render children()}
{:else}
	<main
		class="mx-auto max-w-3xl px-4 pb-28 md:pb-12 {me
			? fullAccess
				? 'pt-5 md:pt-20'
				: 'pt-20'
			: 'pt-10'}"
	>
		{@render children()}
	</main>
{/if}
