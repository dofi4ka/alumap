<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Briefcase,
		Cake,
		Camera,
		Globe,
		KeyRound,
		LogOut,
		Mail,
		MapPin,
		Pencil,
		Phone,
		Send,
		Trash,
		X
	} from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	import BadgeStrip from '#lib/components/BadgeStrip.svelte';
	import CityPicker from '#lib/components/CityPicker.svelte';
	import ExperienceForm from '#lib/components/ExperienceForm.svelte';
	import FormActions from '#lib/components/FormActions.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import Section from '#lib/components/Section.svelte';
	import { submitThen } from '#lib/enhance.ts';
	import { employmentTypes, formatDuration, formatMonth, locationTypes } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.profile);

	let editingHeader = $state(false);
	let editingExp = $state<number | null>(null);
	let expModalOpen = $state(false);
	let avatarForm = $state<HTMLFormElement>();
	let skillInput = $state('');
	let changingPassword = $state(false);
	let openBadgeId = $state<number | null>(null);
	const openBadge = $derived(data.badges.find((b) => b.id === openBadgeId));

	const birthday = $derived(
		p.birthday &&
			new Date(`${p.birthday}T00:00:00Z`).toLocaleDateString('en', {
				day: 'numeric',
				month: 'long',
				timeZone: 'UTC'
			})
	);
</script>

<svelte:head><title>Alumap - {p.firstName} {p.lastName}</title></svelte:head>

<div class="space-y-4">
	{#if data.isSelf && !p.isApproved}
		<div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
			<b>Your account is waiting for approval.</b> Meanwhile, fill in your profile — it helps admins to
			recognize you. The map and events will open once you are approved.
		</div>
	{/if}

	{#if form?.error && !editingHeader && !expModalOpen && !changingPassword}
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
						<button class="btn-ghost" onclick={() => (editingHeader = true)} aria-label="Edit profile">
							<Pencil size={16} />
						</button>
					</div>
				{/if}
			</div>

        <h1 class="mt-3 text-2xl font-bold tracking-tight">{p.firstName} {p.lastName}</h1>
        {#if p.headline}<p class="mt-0.5 text-zinc-700">{p.headline}</p>{/if}
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span class="chip">
            {p.graduationYear ? `IU alumni ’${String(p.graduationYear).slice(2)}` : "Alumni's friend"}
          </span>
          {#if p.locationName && (p.showLocation || data.canEdit)}
            {#if p.showLocation && p.locationLat !== null}
              <a href="/?lat={p.locationLat}&lng={p.locationLng}&zoom=9" class="flex items-center gap-1 hover:text-brand-600">
                <MapPin size={15} />{p.locationName}
              </a>
            {:else}
              <span class="flex items-center gap-1"><MapPin size={15} />{p.locationName}</span>
            {/if}
          {/if}
          {#if birthday}<span class="flex items-center gap-1"><Cake size={15} />{birthday}</span>{/if}
        </div>
        {#if p.telegramUsername || p.contactEmail || p.contactPhone || p.website}
          <div class="mt-4 flex flex-wrap gap-2">
            {#if p.telegramUsername}
              <a class="btn-primary py-2" href="https://t.me/{p.telegramUsername}" target="_blank" rel="noopener">
                <Send size={16} />Telegram
              </a>
            {/if}
            {#if p.contactEmail}
              <a class="btn-secondary py-2" href="mailto:{p.contactEmail}"><Mail size={16} />Email</a>
            {/if}
            {#if p.contactPhone}
              <a class="btn-secondary py-2" href="tel:{p.contactPhone}"><Phone size={16} />{p.contactPhone}</a>
            {/if}
            {#if p.website}
              <a class="btn-secondary py-2" href={p.website} target="_blank" rel="noopener nofollow">
                <Globe size={16} />{p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            {/if}
          </div>
        {/if}
    </div>
  </section>

  <Modal bind:open={editingHeader} title="Edit profile">
        <form method="POST" action="?/basic" use:enhance={submitThen(() => (editingHeader = false))} class="space-y-3">
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
            <input id="hl" class="input" name="headline" value={p.headline ?? ''} placeholder="ML engineer at Sber - IU BS'21" maxlength="120" />
          </div>
          {#if p.graduationYear !== null || data.viewerIsAdmin}
            <div>
              <label class="label" for="gy">Graduation year</label>
              <input id="gy" class="input" type="number" name="graduationYear" min="2014" value={p.graduationYear ?? ''} />
            </div>
          {/if}
          <div>
            <label class="label" for="bd">Birthday</label>
            <input id="bd" class="input" type="date" name="birthday" value={p.birthday ?? ''} />
          </div>

          <h3 class="pt-3 font-semibold">Location</h3>
          <CityPicker
            value={p.locationName && p.locationLat !== null && p.locationLng !== null
              ? { name: p.locationName, lat: p.locationLat, lng: p.locationLng }
              : null}
            placeholder="Where do you live?"
          />
          <label class="flex items-start gap-3 rounded-xl bg-zinc-50 p-3 text-sm">
            <input type="checkbox" name="showLocation" checked={p.showLocation} class="mt-0.5 size-4 accent-brand-500" />
            <span>
              <b>Show me on the map</b><br />
              <span class="text-zinc-500">Everyone on Alumap will see you in this city. Only the city is shared, never your exact location.</span>
            </span>
          </label>

          <h3 class="pt-3 font-semibold">Contact info</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="label" for="tg">Telegram username</label>
              <input id="tg" class="input" name="telegramUsername" value={p.telegramUsername ?? ''} placeholder="@username" />
            </div>
            <div>
              <label class="label" for="ce">Public email</label>
              <input id="ce" class="input" type="email" name="contactEmail" value={p.contactEmail ?? ''} placeholder="me@example.com" />
            </div>
            <div>
              <label class="label" for="ph">Phone</label>
              <input id="ph" class="input" type="tel" name="contactPhone" value={p.contactPhone ?? ''} placeholder="+7 900 000-00-00" />
            </div>
            <div>
              <label class="label" for="ws">Website</label>
              <input id="ws" class="input" name="website" value={p.website ?? ''} placeholder="github.com/me" />
            </div>
          </div>
          <FormActions onCancel={() => (editingHeader = false)} />
        </form>
  </Modal>

	<!-- Badges -->
	<BadgeStrip badges={data.badges} onselect={(id) => (openBadgeId = id)} />

	{#if openBadge}
		{@const locked = !openBadge.earnedAt}
		<Modal bind:open={() => true, (v) => !v && (openBadgeId = null)} title={openBadge.name}>
			<div class="flex flex-col items-center gap-3 pb-1 text-center">
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
							<div class="h-full rounded-full bg-brand-500" style="width:{(100 * openBadge.progress.current) / openBadge.progress.target}%"></div>
						</div>
						<p class="mt-1 text-sm text-zinc-500">{openBadge.progress.current} of {openBadge.progress.target}</p>
					</div>
				{:else}
					<p class="text-sm text-zinc-400">Not unlocked yet</p>
				{/if}
				{#if data.viewerIsAdmin}
					<form method="POST" action={locked ? '?/giveBadge' : '?/removeBadge'} use:enhance={submitThen(() => (openBadgeId = null))} class="pt-2">
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

	<!-- About -->
	{#if p.bio || data.canEdit}
		<Section title="About" canEdit={data.canEdit}>
			{#snippet edit(close)}
				<form method="POST" action="?/about" use:enhance={submitThen(close)}>
					<textarea class="input min-h-36" name="bio" maxlength="3000" placeholder="Tell about yourself: what you do, what you are interested in, how you can help others…">{p.bio ?? ''}</textarea>
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
                    {formatMonth(exp.startDate)} – {exp.endDate ? formatMonth(exp.endDate) : 'Present'} - {formatDuration(exp.startDate, exp.endDate)}
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
                    <button class="btn-ghost" onclick={() => ((editingExp = exp.id), (expModalOpen = true))} aria-label="Edit"><Pencil size={15} /></button>
                    <form method="POST" action="?/deleteExperience" use:enhance={submitThen()}>
                      <input type="hidden" name="id" value={exp.id} />
                      <button class="btn-ghost" aria-label="Delete" onclick={(e) => !confirm('Delete this experience?') && e.preventDefault()}>
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
				<form
					method="POST"
					action="?/addSkill"
					class="mt-3 flex gap-2"
					use:enhance={submitThen(() => (skillInput = ''))}
				>
					<input class="input" name="name" bind:value={skillInput} placeholder="Add a skill, e.g. Kubernetes" maxlength="40" />
					<button class="btn-secondary" disabled={!skillInput.trim()}>Add</button>
				</form>
			{/if}
		</Section>
	{/if}

  {#if data.canEdit}
    <!-- Account -->
    <Section title="Account">
      <div class="space-y-3">
        {#if p.email}<p class="text-zinc-500">Login email: <span class="text-zinc-800">{p.email}</span></p>{/if}
        {#if data.isSelf}
          {#if form && 'passwordChanged' in form}
            <p class="text-brand-700">Password changed</p>
          {/if}
        {/if}
        {#if p.telegramConnected}
          <form method="POST" action="?/disconnectTelegram" use:enhance={submitThen()}>
            <button class="btn-secondary">Disconnect Telegram</button>
          </form>
        {:else if data.isSelf}
          <!-- no enhance: the action redirects to t.me -->
          <form method="POST" action="?/connectTelegram">
            <button class="btn-primary" disabled={!data.botEnabled}><Send size={16} />Connect Telegram</button>
          </form>
        {/if}
        {#if data.isSelf}
          <button class="btn-secondary" onclick={() => (changingPassword = true)}><KeyRound size={16} />Change password</button>
          <form method="POST" action="/logout">
            <button class="btn-danger"><LogOut size={16} />Sign out</button>
          </form>
        {/if}
        {#if data.viewerIsAdmin && !data.isSelf}
          {#if p.email}<p class="text-zinc-500">Status: <span class="text-zinc-800"> 
            {p.isAdmin ? 'Admin' : p.isBanned ? 'Banned' : p.isApproved ? 'Approved' : 'Waiting for approval'} 
          </span></p>{/if}
          {#if !p.isApproved && !p.isBanned}
            <form method="POST" action="?/approve" use:enhance={submitThen()}><button class="btn-primary">Approve</button></form>
          {/if}
          {#if !p.isAdmin}
            {#if p.isBanned}
              <form method="POST" action="?/unban" use:enhance={submitThen()}><button class="btn-secondary">Unban</button></form>
            {:else}
              <form method="POST" action="?/ban" use:enhance={submitThen()}><button class="btn-danger">Ban</button></form>
            {/if}
          {/if}
        {/if}
      </div>
    </Section>

    <Modal bind:open={changingPassword} title="Change password">
      <form
        method="POST"
        action="?/changePassword"
        use:enhance={submitThen(() => (changingPassword = false))}
        class="space-y-3"
      >
        <input class="input" type="password" name="currentPassword" placeholder="Current password" autocomplete="current-password" required />
        <input class="input" type="password" name="newPassword" placeholder="New password (8+ characters)" autocomplete="new-password" minlength="8" required />
        <input class="input" type="password" name="newPasswordRepeat" placeholder="Repeat new password" autocomplete="new-password" minlength="8" required />
        <FormActions onCancel={() => (changingPassword = false)} label="Change password" />
      </form>
    </Modal>
  {/if}
</div>
