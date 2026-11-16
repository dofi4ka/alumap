<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import {
		Bell,
		BellOff,
		Briefcase,
		Cake,
		Camera,
		Check,
		Copy,
		KeyRound,
		Link2,
		LogOut,
		MapPin,
		Pencil,
		Plus,
		Send,
		Trash,
		X
	} from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	import BadgeStrip from '#lib/components/BadgeStrip.svelte';
	import ChangeEmail from '#lib/components/ChangeEmail.svelte';
	import CityPicker from '#lib/components/CityPicker.svelte';
	import ExperienceForm from '#lib/components/ExperienceForm.svelte';
	import FormActions from '#lib/components/FormActions.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import ReferralForm from '#lib/components/ReferralForm.svelte';
	import Section from '#lib/components/Section.svelte';
	import SocialIcon from '#lib/components/SocialIcon.svelte';
	import TemporaryLocationForm from '#lib/components/TemporaryLocationForm.svelte';
	import { submitThen } from '#lib/enhance.ts';
	import {
		employmentTypes,
		formatDay,
		formatDuration,
		formatMonth,
		locationTypes
	} from '#lib/format.ts';
	import { iuStatusLabel } from '#lib/iu-status.ts';
	import { socialLabel } from '#lib/socials.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.profile);
	const sourceLabel = { location: 'Your location', temporary: 'Temporary location', manual: 'Added by you' };

	let editingHeader = $state(false);
	let editingExp = $state<number | null>(null);
	let expModalOpen = $state(false);
	let avatarForm = $state<HTMLFormElement>();
	let skillInput = $state('');
	let changingPassword = $state(false);
	let changingEmail = $state(false);
	let tempModalOpen = $state(false);
	let editingReferral = $state<'new' | number | null>(null);
	let openBadgeId = $state<number | null>(null);
	let copiedId = $state<number | null>(null);
	let socials = $state<string[]>([]);

	const openBadge = $derived(data.badges.find((b) => b.id === openBadgeId));
	const editedReferral = $derived(
		typeof editingReferral === 'number'
			? (p.referrals.find((r) => r.id === editingReferral) ?? null)
			: null
	);

	const birthday = $derived(
		p.birthday &&
			new Date(`${p.birthday}T00:00:00Z`).toLocaleDateString('en', {
				day: 'numeric',
				month: 'long',
				timeZone: 'UTC'
			})
	);

	function openHeaderEditor() {
		socials = [...p.socialLinks];
		editingHeader = true;
	}

	async function copyText(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			const area = document.createElement('textarea');
			area.value = text;
			area.style.position = 'fixed';
			area.style.opacity = '0';
			document.body.appendChild(area);
			area.select();
			const ok = document.execCommand('copy');
			area.remove();
			return ok;
		}
	}

	const copyReferral =
		(id: number): SubmitFunction =>
		() =>
		async ({ result, update }) => {
			if (result.type === 'success') {
				const url = (result.data as { url?: string } | undefined)?.url;
				if (url && (await copyText(url))) {
					copiedId = id;
					setTimeout(() => {
						if (copiedId === id) copiedId = null;
					}, 2200);
				}
			}
			await update({ reset: false });
		};
</script>

<svelte:head><title>Alumap - {p.firstName} {p.lastName}</title></svelte:head>

<div class="space-y-4">
	{#if data.isSelf && !p.isApproved}
		<div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
			<b>Your account is waiting for approval.</b> Meanwhile, fill in your profile — it helps admins to
			recognize you. The map and events will open once you are approved.
		</div>
	{/if}

	{#if form?.error && !editingHeader && !expModalOpen && !changingPassword && !changingEmail && !tempModalOpen && editingReferral === null}
		<p class="error-box fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md shadow-lg md:bottom-6">{form.error}</p>
	{/if}

	<!-- Header -->
	<section class="card overflow-hidden p-0 sm:p-0">
		<div class="h-24 bg-linear-to-br from-brand-400 via-brand-500 to-emerald-600 sm:h-32"></div>
		<div class="px-4 pb-5 sm:px-6">
			<div class="-mt-12 flex items-end justify-between sm:-mt-16">
				<div class="relative">
					<Avatar user={p} size={112} class="border-4 border-white" />
					{#if data.canEdit}
						<form
							method="POST"
							action="?/avatar"
							enctype="multipart/form-data"
							bind:this={avatarForm}
							use:enhance={submitThen()}
						>
							<label
								class="absolute right-0 bottom-1 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-zinc-900 text-white hover:bg-zinc-700"
								title="Change photo"
							>
								<Camera size={16} />
								<input
									type="file"
									name="avatar"
									accept="image/*"
									class="hidden"
									onchange={() => avatarForm?.requestSubmit()}
								/>
							</label>
						</form>
					{/if}
				</div>
				{#if data.canEdit}
					<div class="flex gap-1">
						<button class="btn-ghost" onclick={openHeaderEditor} aria-label="Edit profile">
							<Pencil size={16} />
						</button>
					</div>
				{/if}
			</div>

			<h1 class="mt-3 text-2xl font-bold tracking-tight">{p.firstName} {p.lastName}</h1>
			{#if p.headline}<p class="mt-0.5 text-zinc-700">{p.headline}</p>{/if}
			<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
				<span class="chip">{iuStatusLabel(p.status, p.graduationYear)}</span>
				{#if p.location}
					<a
						href="/?lat={p.location.lat}&lng={p.location.lng}&zoom=9"
						class="flex items-center gap-1 hover:text-brand-600"
					>
						<MapPin size={15} />{p.location.name}
						{#if p.location.temporary}
							<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
								temporarily until {formatDay(p.location.expiresAt!)}
							</span>
						{/if}
					</a>
				{/if}
				{#if birthday}<span class="flex items-center gap-1"><Cake size={15} />{birthday}</span>{/if}
			</div>

			{#if p.telegramUsername || p.socialLinks.length}
				<div class="mt-4 flex flex-wrap items-center gap-2">
					{#if p.telegramUsername}
						<a class="btn-primary py-2" href="https://t.me/{p.telegramUsername}" target="_blank" rel="noopener">
							<Send size={16} />Telegram
						</a>
					{/if}
					{#each p.socialLinks as url (url)}
						<a
							class="btn-secondary size-10 p-0"
							href={url}
							target="_blank"
							rel="noopener nofollow"
							title={socialLabel(url)}
							aria-label={socialLabel(url)}
						>
							<SocialIcon {url} size={18} />
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</section>

	<!-- About -->
	{#if p.bio || data.canEdit}
		<Section title="About" canEdit={data.canEdit}>
			{#snippet edit(close)}
				<form method="POST" action="?/about" use:enhance={submitThen(close)}>
					<textarea
						class="input min-h-36"
						name="bio"
						maxlength="3000"
						placeholder="Tell about yourself: what you do, what you are interested in, how you can help others…"
					>{p.bio ?? ''}</textarea>
					<FormActions onCancel={close} />
				</form>
			{/snippet}
			{#if p.bio}
				<p class="whitespace-pre-line text-zinc-700">{p.bio}</p>
			{:else}
				<p class="text-sm text-zinc-400">Nothing here yet</p>
			{/if}
		</Section>
	{/if}

	<!-- Referrals -->
	{#if p.referrals.length || data.canEdit}
		<Section title="Referrals" canEdit={data.canEdit} addMode>
			{#snippet edit(close)}
				<ReferralForm close={close} />
			{/snippet}
			{#if p.referrals.length === 0}
				<p class="text-sm text-zinc-400">Add companies you can refer alumni to</p>
			{/if}
			<ul class="divide-y divide-zinc-100">
				{#each p.referrals as r (r.id)}
					<li class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
						<div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-500">
							{r.company.slice(0, 2).toUpperCase()}
						</div>
						<div class="min-w-0 flex-1">
							<div class="truncate font-semibold">{r.company}</div>
							{#if data.canEdit}
								<div class="text-xs text-zinc-500">
									{r.copies} {r.copies === 1 ? 'person copied' : 'people copied'}
								</div>
							{/if}
						</div>
						<form method="POST" action="?/copyReferral" use:enhance={copyReferral(r.id)}>
							<input type="hidden" name="id" value={r.id} />
							<button class="btn-secondary py-2" title="Copy the referral link">
								{#if copiedId === r.id}
									<Check size={16} />Copied
								{:else}
									<Copy size={16} />Copy
								{/if}
							</button>
						</form>
						{#if data.canEdit}
							<div class="flex shrink-0 flex-col">
								<button
									class="btn-ghost"
									onclick={() => (editingReferral = r.id)}
									aria-label="Edit referral"><Pencil size={15} /></button
								>
								<form method="POST" action="?/deleteReferral" use:enhance={submitThen()}>
									<input type="hidden" name="id" value={r.id} />
									<button
										class="btn-ghost"
										aria-label="Delete referral"
										onclick={(e) => !confirm('Delete this referral?') && e.preventDefault()}
									>
										<Trash size={15} />
									</button>
								</form>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</Section>

		<Modal
			bind:open={() => editingReferral !== null && editedReferral !== null, (v) => !v && (editingReferral = null)}
			title="Edit referral"
		>
			{#if editedReferral}
				<ReferralForm referral={editedReferral} close={() => (editingReferral = null)} />
			{/if}
		</Modal>
	{/if}

	<!-- Badges -->
	<BadgeStrip badges={data.badges} onselect={(id) => (openBadgeId = id)} />

	{#if openBadge}
		{@const locked = !openBadge.earnedAt}
		<Modal bind:open={() => true, (v) => !v && (openBadgeId = null)} title={openBadge.name}>
			<div class="flex flex-col items-center gap-3 px-1 pt-1.5 pb-1 text-center">
				<BadgeIcon svg={openBadge.svg} rarity={openBadge.rarity} size={96} {locked} />
				<span class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{openBadge.rarity}</span>
				<p class="text-zinc-700">{openBadge.description}</p>
				{#if openBadge.earnedAt}
					<p class="text-sm text-brand-700">
						Unlocked {new Date(openBadge.earnedAt).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
					</p>
				{:else if openBadge.progress}
					<div class="w-full max-w-xs">
						<div class="h-2 overflow-hidden rounded-full bg-zinc-100">
							<div
								class="h-full rounded-full bg-brand-500"
								style="width:{(100 * openBadge.progress.current) / openBadge.progress.target}%"
							></div>
						</div>
						<p class="mt-1 text-sm text-zinc-500">{openBadge.progress.current} of {openBadge.progress.target}</p>
					</div>
				{:else}
					<p class="text-sm text-zinc-400">Not unlocked yet</p>
				{/if}
				{#if data.viewerIsAdmin}
					<form
						method="POST"
						action={locked ? '?/giveBadge' : '?/removeBadge'}
						use:enhance={submitThen(() => (openBadgeId = null))}
						class="pt-2"
					>
						<input type="hidden" name="badgeId" value={openBadge.id} />
						{#if locked}
							<button class="btn-primary">Grant badge</button>
						{:else}
							<button class="btn-danger">Remove badge</button>
						{/if}
					</form>
				{/if}
			</div>
		</Modal>
	{/if}

	<!-- Temporary location -->
	{#if p.homeLocation && (data.canEdit || p.temporaryLocation)}
		<section class="card">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h2 class="text-lg font-semibold">Temporary location</h2>
					{#if p.temporaryLocation}
						<p class="mt-1 text-sm text-zinc-600">
							<b>{p.temporaryLocation.name}</b> until {formatDay(p.temporaryLocation.expiresAt)}
							<span class="text-zinc-400">· home is {p.homeLocation.name}</span>
						</p>
						<p class="mt-1 text-xs text-zinc-400">
							You are shown on the map here. Your home city comes back automatically when it ends.
						</p>
					{:else}
						<p class="mt-1 text-sm text-zinc-500">
							Travelling or staying elsewhere for a while? Set a temporary city without changing your home
							location.
						</p>
					{/if}
				</div>
				{#if data.canEdit}
					<div class="flex shrink-0 gap-1">
						<button class="btn-secondary py-2" onclick={() => (tempModalOpen = true)}>
							{p.temporaryLocation ? 'Change' : 'Set city'}
						</button>
						{#if p.temporaryLocation}
							<form method="POST" action="?/clearTemporaryLocation" use:enhance={submitThen()}>
								<button class="btn-ghost text-zinc-500" title="Clear temporary location" aria-label="Clear temporary location">
									<X size={18} />
								</button>
							</form>
						{/if}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<Modal bind:open={tempModalOpen} title="Temporary location">
		<TemporaryLocationForm close={() => (tempModalOpen = false)} />
	</Modal>

	<!-- Experience -->
	{#if data.experiences.length || data.canEdit}
		<Section title="Experience" canEdit={data.canEdit} addMode>
			{#snippet edit(close)}
				<ExperienceForm {close} />
			{/snippet}
			{#if data.experiences.length === 0}
				<p class="text-sm text-zinc-400">Add your jobs, internships and projects</p>
			{/if}
			<ul class="divide-y divide-zinc-100">
				{#each data.experiences as exp (exp.id)}
					<li class="py-3 first:pt-0 last:pb-0">
						<div class="flex gap-3">
							<div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
								<Briefcase size={20} />
							</div>
							<div class="min-w-0 flex-1">
								<div class="font-semibold">{exp.title}</div>
								<div class="text-sm text-zinc-700">
									{[exp.organization, exp.employmentType && employmentTypes[exp.employmentType]].filter(Boolean).join(' - ')}
								</div>
								<div class="text-sm text-zinc-500">
									{formatMonth(exp.startDate)} – {exp.endDate ? formatMonth(exp.endDate) : 'Present'} - {formatDuration(
										exp.startDate,
										exp.endDate
									)}
								</div>
								{#if exp.location || exp.locationType}
									<div class="text-sm text-zinc-500">
										{[exp.location, exp.locationType && locationTypes[exp.locationType]].filter(Boolean).join(' - ')}
									</div>
								{/if}
								{#if exp.description}
									<p class="mt-2 text-sm whitespace-pre-line text-zinc-700">{exp.description}</p>
								{/if}
							</div>
							{#if data.canEdit}
								<div class="flex shrink-0 flex-col">
									<button
										class="btn-ghost"
										onclick={() => ((editingExp = exp.id), (expModalOpen = true))}
										aria-label="Edit"><Pencil size={15} /></button
									>
									<form method="POST" action="?/deleteExperience" use:enhance={submitThen()}>
										<input type="hidden" name="id" value={exp.id} />
										<button
											class="btn-ghost"
											aria-label="Delete"
											onclick={(e) => !confirm('Delete this experience?') && e.preventDefault()}
										>
											<Trash size={15} />
										</button>
									</form>
								</div>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</Section>

		<Modal bind:open={expModalOpen} title="Edit experience">
			{@const exp = data.experiences.find((e) => e.id === editingExp)}
			{#if exp}<ExperienceForm {exp} close={() => (expModalOpen = false)} />{/if}
		</Modal>
	{/if}

	<!-- Skills -->
	{#if data.skills.length || data.canEdit}
		<Section title="Skills">
			<div class="flex flex-wrap gap-2">
				{#each data.skills as skill (skill)}
					<span class="chip">
						{skill}
						{#if data.canEdit}
							<form method="POST" action="?/removeSkill" use:enhance={submitThen()} class="contents">
								<input type="hidden" name="name" value={skill} />
								<button class="-mr-1 rounded-full p-0.5 hover:bg-brand-100" aria-label="Remove {skill}"><X size={13} /></button>
							</form>
						{/if}
					</span>
				{/each}
				{#if data.skills.length === 0 && !data.canEdit}<p class="text-sm text-zinc-400">No skills yet</p>{/if}
			</div>
			{#if data.canEdit}
				<form method="POST" action="?/addSkill" class="mt-3 flex gap-2" use:enhance={submitThen(() => (skillInput = ''))}>
					<input class="input" name="name" bind:value={skillInput} placeholder="Add a skill, e.g. Kubernetes" maxlength="40" />
					<button class="btn-secondary" disabled={!skillInput.trim()}>Add</button>
				</form>
			{/if}
		</Section>
	{/if}


	{#if data.isSelf}
		<Section title="Cities you follow">
			<p class="text-sm text-zinc-500">
				Get notified when an alum appears in one of these cities or within 150 km of them.
			</p>
			<ul class="mt-4 space-y-2">
				{#each data.follows as city (city.id)}
					<li class="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 {city.enabled ? '' : 'opacity-60'}">
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{city.name}</p>
							<p class="text-xs text-zinc-500">{sourceLabel[city.source]}</p>
						</div>
						<form method="POST" action="?/toggleFollowCity" use:enhance={submitThen()} class="contents">
							<input type="hidden" name="id" value={city.id} />
							<button
								class="btn-ghost shrink-0"
								title={city.enabled ? 'Mute notifications for this city' : 'Unmute notifications for this city'}
								aria-label={city.enabled ? 'Mute {city.name}' : 'Unmute {city.name}'}
							>
								{#if city.enabled}<Bell size={17} />{:else}<BellOff size={17} />{/if}
							</button>
						</form>
						<form method="POST" action="?/removeFollowCity" use:enhance={submitThen()} class="contents">
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
			<form method="POST" action="?/addFollowCity" use:enhance={submitThen()} class="mt-4 space-y-2">
				<CityPicker placeholder="Add a city, e.g. Kazan" />
				<button class="btn-secondary w-full"><Plus size={16} />Follow city</button>
			</form>
			{#if !p.isApproved}
				<p class="mt-3 text-xs text-zinc-400">Notifications start after your account is approved.</p>
			{/if}
		</Section>
	{/if}

	{#if data.canEdit}
		<!-- Account -->
		<Section title="Account">
			<div class="space-y-6">
				<div>
					<h3 class="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Email & status</h3>
					<div class="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
						{#if p.email}
							<div class="flex items-center justify-between gap-4 px-3 py-3">
								<div class="min-w-0">
									<p class="text-sm font-medium">Main email</p>
									<p class="truncate text-sm text-zinc-500">{p.email}</p>
								</div>
								{#if data.isSelf}
									<button class="btn-secondary shrink-0 py-1.5" onclick={() => (changingEmail = true)}>
										Change
									</button>
								{/if}
							</div>
						{/if}
						<div class="flex items-center justify-between gap-4 px-3 py-3">
							<div class="min-w-0">
								<p class="text-sm font-medium">IU status</p>
								{#if p.status === 'friend'}
									<p class="text-sm text-zinc-500">Not verified — you are an IU Friend</p>
								{:else}
									<p class="truncate text-sm text-brand-700">
										{iuStatusLabel(p.status, p.graduationYear)} · Verified{p.ssoEmail ? ` · ${p.ssoEmail}` : ''}
									</p>
								{/if}
							</div>
							{#if p.status === 'friend' && data.isSelf}
								<a class="btn-secondary shrink-0 py-1.5" href="/register/alumni">IU Alumni Verification</a>
							{/if}
						</div>
						{#if p.status !== 'friend' && p.graduationYear}
							<div class="flex items-center justify-between gap-4 px-3 py-3">
								<p class="text-sm font-medium">Graduation year</p>
								<p class="text-sm text-zinc-500">{p.graduationYear}</p>
							</div>
						{/if}
					</div>
				</div>

				{#if data.isSelf}
					{#if form && 'passwordChanged' in form}
						<p class="text-sm text-brand-700">Password changed</p>
					{/if}
					<div>
						<h3 class="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Security</h3>
						<div class="grid gap-2 sm:grid-cols-2">
							<button
								class="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-left hover:bg-zinc-50"
								onclick={() => (changingPassword = true)}
							>
								<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
									<KeyRound size={17} />
								</span>
								<span>
									<span class="block text-sm font-medium">Change password</span>
									<span class="block text-xs text-zinc-500">Use at least 8 characters</span>
								</span>
							</button>
							<form method="POST" action="/logout" class="contents">
								<button class="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/40 p-3 text-left hover:bg-red-50">
									<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
										<LogOut size={17} />
									</span>
									<span>
										<span class="block text-sm font-medium text-red-700">Sign out</span>
										<span class="block text-xs text-zinc-500">End this session</span>
									</span>
								</button>
							</form>
						</div>
					</div>

					<div>
						<h3 class="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Telegram</h3>
						<div class="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-3 py-3">
							<div class="min-w-0">
								<p class="text-sm font-medium">Telegram account</p>
								<p class="truncate text-sm text-zinc-500">
									{#if p.telegramConnected}
										{p.telegramUsername ? `@${p.telegramUsername}` : 'Connected'}
									{:else}
										Not connected
									{/if}
								</p>
							</div>
							{#if p.telegramConnected}
								<form method="POST" action="?/disconnectTelegram" use:enhance={submitThen()}>
									<button class="btn-secondary shrink-0 py-1.5">Disconnect</button>
								</form>
							{:else}
								<!-- no enhance: this action redirects to t.me -->
								<form method="POST" action="?/connectTelegram">
									<button class="btn-primary shrink-0 py-1.5" disabled={!data.botEnabled}>
										<Send size={15} />Connect
									</button>
								</form>
							{/if}
						</div>
						{#if !data.botEnabled}
							<p class="mt-1 text-xs text-zinc-400">Telegram login is not configured on this server.</p>
						{/if}
					</div>
				{/if}

				{#if data.viewerIsAdmin && !data.isSelf}
					<div>
						<h3 class="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Admin</h3>
						<div class="rounded-xl border border-zinc-200 px-3 py-3">
							<p class="text-sm text-zinc-500">
								Status:
								<span class="font-medium text-zinc-800">
									{p.isAdmin
										? 'Admin'
										: p.isBanned
											? 'Banned'
											: p.isApproved
												? 'Approved'
												: 'Waiting for approval'}
								</span>
							</p>
							<div class="mt-3 flex flex-wrap gap-2">
								{#if !p.isApproved && !p.isBanned}
									<form method="POST" action="?/approve" use:enhance={submitThen()}>
										<button class="btn-primary py-2">Approve</button>
									</form>
								{/if}
								{#if !p.isAdmin}
									{#if p.isBanned}
										<form method="POST" action="?/unban" use:enhance={submitThen()}>
											<button class="btn-secondary py-2">Unban</button>
										</form>
									{:else}
										<form method="POST" action="?/ban" use:enhance={submitThen()}>
											<button class="btn-danger py-2">Ban</button>
										</form>
									{/if}
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</Section>

		<!-- Edit profile -->
		<Modal bind:open={editingHeader} title="Edit profile">
			<form method="POST" action="?/basic" use:enhance={submitThen(() => (editingHeader = false))} class="space-y-3">
				<input type="hidden" name="socialsEdited" value="1" />
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="fn">First name</label>
						<input id="fn" class="input" name="firstName" value={p.firstName} required />
					</div>
					<div>
						<label class="label" for="ln">Last name</label>
						<input id="ln" class="input" name="lastName" value={p.lastName} required />
					</div>
				</div>
				<div>
					<label class="label" for="hl">Headline</label>
					<input
						id="hl"
						class="input"
						name="headline"
						value={p.headline ?? ''}
						placeholder="ML engineer at Sber - IU BS'21"
						maxlength="120"
					/>
				</div>
				{#if p.status !== 'friend' || data.viewerIsAdmin}
					<div>
						<label class="label" for="gy">Graduation year</label>
						<input
							id="gy"
							class="input"
							type="number"
							name="graduationYear"
							min="2014"
							max={new Date().getFullYear() + 4}
							value={p.graduationYear ?? ''}
						/>
					</div>
				{/if}
				<div>
					<label class="label" for="bd">Birthday</label>
					<input id="bd" class="input" type="date" name="birthday" value={p.birthday ?? ''} />
				</div>

				<h3 class="pt-3 font-semibold">Location</h3>
				<CityPicker
					value={p.homeLocation
						? { name: p.homeLocation.name, lat: p.homeLocation.lat, lng: p.homeLocation.lng }
						: null}
					placeholder="Where do you live?"
				/>
				<p class="text-xs text-zinc-500">
					Everyone who adds a city is shown on the map. Only the city is shared, never your exact location.
					Use the temporary location above when travelling.
				</p>

				<h3 class="pt-3 font-semibold">Social links</h3>
				<div class="space-y-2">
					{#each socials as _, i (i)}
						<div class="flex items-center gap-2">
							<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
								{#if socials[i]}<SocialIcon url={socials[i]} size={18} />{:else}<Link2 size={16} />{/if}
							</span>
							<input
								class="input"
								name="social"
								bind:value={socials[i]}
								placeholder="https://github.com/me"
								autocomplete="off"
								spellcheck="false"
							/>
							<button
								type="button"
								class="btn-ghost shrink-0"
								onclick={() => socials.splice(i, 1)}
								aria-label="Remove link"
							>
								<X size={17} />
							</button>
						</div>
					{/each}
					{#if socials.length < 10}
						<button type="button" class="btn-secondary py-1.5" onclick={() => socials.push('')}>
							<Plus size={15} />Add link
						</button>
					{/if}
				</div>
				<FormActions onCancel={() => (editingHeader = false)} />
			</form>
		</Modal>

		<Modal bind:open={changingPassword} title="Change password">
			<form
				method="POST"
				action="?/changePassword"
				use:enhance={submitThen(() => (changingPassword = false))}
				class="space-y-3"
			>
				<input class="input" type="password" name="currentPassword" placeholder="Current password" autocomplete="current-password" required />
				<input
					class="input"
					type="password"
					name="newPassword"
					placeholder="New password (8+ characters)"
					autocomplete="new-password"
					minlength="8"
					required
				/>
				<input
					class="input"
					type="password"
					name="newPasswordRepeat"
					placeholder="Repeat new password"
					autocomplete="new-password"
					minlength="8"
					required
				/>
				<FormActions onCancel={() => (changingPassword = false)} label="Change password" />
			</form>
		</Modal>

		<Modal bind:open={changingEmail} title="Change main email">
			<ChangeEmail
				currentEmail={p.email ?? ''}
				close={() => (changingEmail = false)}
				onChanged={() => (changingEmail = false)}
			/>
		</Modal>
	{/if}
</div>
