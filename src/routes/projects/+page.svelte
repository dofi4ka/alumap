<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import ProjectCard from '#lib/components/ProjectCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Alumap - Projects</title></svelte:head>

<div class="mb-5 flex items-center justify-between">
	<h1 class="text-2xl font-bold tracking-tight">Projects</h1>
	<a href="/projects/new" class="btn-primary"><Plus size={18} />New project</a>
</div>

{#if data.mine.length}
	<h2 class="mb-2 text-sm font-semibold text-zinc-500">Your submissions</h2>
	<div class="mb-6 space-y-3">
		{#each data.mine as project (project.nanoId)}<ProjectCard {project} />{/each}
	</div>
{/if}

{#if data.published.length}
	<div class="space-y-3">
		{#each data.published as project (project.nanoId)}<ProjectCard {project} />{/each}
	</div>
{:else}
	<div class="card text-center text-sm text-zinc-500">No projects yet. Start the first one!</div>
{/if}
