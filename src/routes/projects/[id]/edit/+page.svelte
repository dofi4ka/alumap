<script lang="ts">
	import ProjectForm from '#lib/components/ProjectForm.svelte';
	import type { PageProps } from './$types';

	let { form, data }: PageProps = $props();
</script>

<svelte:head><title>Alumap - Edit project</title></svelte:head>

<a href="/projects/{data.project.nanoId}" class="text-sm text-zinc-500 hover:text-zinc-800">← Back to project</a>
<h1 class="mt-2 mb-1 text-2xl font-bold tracking-tight">Edit project</h1>
{#if !data.me?.isAdmin}
	<p class="mb-4 text-sm text-zinc-500">After saving, the project will be reviewed by admins again.</p>
{/if}
<div class="mt-4"><ProjectForm project={data.project} error={form?.error} /></div>
