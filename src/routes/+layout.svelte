<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Map, CalendarDays, Lightbulb, Shield, Info, Bell } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { hapticTap, setupMiniApp, syncBackButton } from '#lib/telegram/miniapp.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// Runs before child components mount, so the Telegram login page can read init data.
	setupMiniApp();

	const me = $derived(data.me);
	const fullAccess = $derived(me && me.isApproved && !me.isBanned);
	const isMap = $derived(page.url.pathname === '/');
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));

	const links = $derived([
		{ href: '/', label: 'Map', icon: Map, active: isMap },
		{ href: '/events', label: 'Events', icon: CalendarDays, active: page.url.pathname.startsWith('/events') },
		{ href: '/projects', label: 'Projects', icon: Lightbulb, active: page.url.pathname.startsWith('/projects') },
		{ href: '/about', label: 'About', icon: Info, active: page.url.pathname.startsWith('/about') },
		...(me?.isAdmin
			? [{ href: '/admin', label: 'Admin', icon: Shield, active: page.url.pathname.startsWith('/admin') }]
			: [])
	]);
	const profileActive = $derived(!!me && page.url.pathname.startsWith(`/u/${me.nanoId}`));
	const notificationsActive = $derived(page.url.pathname.startsWith('/notifications'));
	// Opening the notifications page marks everything as read, so the badge disappears right away.
	const unread = $derived(notificationsActive ? 0 : data.unreadNotifications);

	onMount(() => {
		void setupMiniApp()
			.then(() => syncBackButton(page.url.pathname))
			.catch((err) => console.warn('[miniapp] setup failed', err));
	});

	// Keep the native Telegram header button in sync with SvelteKit navigation.
	$effect(() => {
		syncBackButton(page.url.pathname);
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/favicon.png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<title>Alumap</title>
	<meta name="theme-color" content="#ffffff" />
</svelte:head>

{#if me}
	<!-- mobile-first header: brand, notifications and avatar; full navigation lives in the bottom bar -->
	<header
		class="fixed inset-x-0 top-0 z-30 h-14 border-b border-zinc-200/70 bg-white/85 backdrop-blur-md"
		style="height: var(--app-header-height); padding-top: var(--tg-inset-top);"
	>
		<div class="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
			<a href="/" class="mr-4 flex items-center gap-2 text-lg font-bold tracking-tight" onclick={hapticTap}>
				<img src="/favicon.png" alt="" class="size-6" /><span class="max-sm:hidden">Alumap</span>
			</a>
			{#if fullAccess}
				<nav class="hidden items-center gap-1 md:flex">
					{#each links as l (l.href)}
						<a
							href={l.href}
							onclick={hapticTap}
							class="rounded-lg px-3 py-1.5 text-sm font-medium {l.active
								? 'bg-brand-50 text-brand-700'
								: 'text-zinc-600 hover:text-zinc-900'}">{l.label}</a
						>
					{/each}
				</nav>
			{/if}
			<div class="ml-auto flex items-center gap-1">
				<a
					href="/notifications"
					onclick={hapticTap}
					class="relative rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 {notificationsActive
						? 'bg-brand-50 text-brand-700'
						: ''}"
					aria-label="Notifications"
				>
					<Bell size={20} />
					{#if unread > 0}
						<span
							class="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-brand-500 px-1 text-center text-[10px] leading-4 font-semibold text-white ring-2 ring-white"
						>
							{unread > 9 ? '9+' : unread}
						</span>
					{/if}
				</a>
				<a
					href="/profile"
					onclick={hapticTap}
					class="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-zinc-100"
				>
					<Avatar user={me} size={30} />
					<span class="text-sm font-medium max-sm:hidden">{me.firstName}</span>
				</a>
			</div>
		</div>
	</header>

	{#if fullAccess}
		<!-- bottom tab bar on mobile -->
		<nav
			class="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
			style="padding-bottom: var(--tg-inset-bottom);"
		>
			<div class="flex h-16">
				{#each links as l (l.href)}
					<a
						href={l.href}
						onclick={hapticTap}
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
					onclick={hapticTap}
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
		class="mx-auto px-4 pb-[calc(7rem+var(--tg-inset-bottom))] md:pb-12 {isAdmin
			? 'max-w-5xl'
			: 'max-w-3xl'} {me ? 'pt-20' : 'pt-10'}"
		style={me ? 'padding-top: calc(var(--app-header-height) + 1.25rem);' : 'padding-top: 2.5rem;'}
	>
		{@render children()}
	</main>
{/if}
