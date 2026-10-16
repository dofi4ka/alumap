<script lang="ts">
	import { enhance } from '$app/forms';
	import { ExternalLink, HandCoins, Lightbulb, Pencil, Trash } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { submitThen } from '#lib/enhance.ts';
	import { formatCost } from '#lib/format.ts';
	import { imageUrl } from '#lib/images.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.project);
</script>

<svelte:head><title>Alumap - {p.title}</title></svelte:head>

<a href="/projects" class="text-sm text-zinc-500 hover:text-zinc-800">← All projects</a>

{#if p.status === 'pending'}
	<div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
		This project is waiting for review by admins and is visible only to you and admins.
	</div>
{/if}

<article class="mt-4">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
		<div class="aspect-square w-36 shrink-0 overflow-hidden rounded-2xl sm:w-52">
			{#if p.imageId}
				<img src={imageUrl(p.imageId)} alt="" class="size-full bg-zinc-100 object-cover" />
			{:else}
				<div class="flex size-full items-center justify-center bg-brand-50 text-brand-500"><Lightbulb size={36} /></div>
			{/if}
		</div>
		<div class="flex min-w-0 flex-1 flex-col sm:min-h-52">
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{p.title}</h1>
			{#if p.fundraisingGoal}
				<div class="mt-3 flex items-center gap-2.5 text-zinc-700">
					<HandCoins size={18} class="shrink-0 text-brand-600" />Fundraising goal {formatCost(p.fundraisingGoal)}
				</div>
			{/if}
			{#if p.donationUrl}
				<div class="mt-4 sm:mt-auto sm:pt-4">
					<a href={p.donationUrl} target="_blank" rel="noopener nofollow" class="btn-primary">
						Donate<ExternalLink size={16} />
					</a>
				</div>
			{/if}
		</div>
	</header>

	{#if p.description}
		<p class="mt-6 whitespace-pre-line text-zinc-800">{p.description}</p>
	{/if}

	<div class="mt-6 flex items-center gap-3 text-sm">
		<Avatar user={data.owner} size={36} />
		<span class="text-zinc-500">
			Started by
			<a href="/u/{data.owner.nanoId}" class="font-medium text-zinc-900 hover:underline">{data.owner.firstName} {data.owner.lastName}</a>
		</span>
	</div>
</article>

{#if data.canEdit}
	<div class="mt-8 flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
		<a href="/projects/{p.nanoId}/edit" class="btn-secondary"><Pencil size={16} />Edit</a>
		{#if data.isAdmin && p.status === 'pending'}
			<form method="POST" action="?/publish" use:enhance={submitThen()}><button class="btn-primary">Publish</button></form>
		{/if}
		<form method="POST" action="?/delete" use:enhance>
			<button class="btn-danger" onclick={(ev) => !confirm('Delete this project?') && ev.preventDefault()}><Trash size={16} />Delete</button>
		</form>
	</div>
{/if}
