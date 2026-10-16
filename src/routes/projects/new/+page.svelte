<script lang="ts">
	import ProjectForm from '#lib/components/ProjectForm.svelte';
	import type { PageProps } from './$types';

	let { form, data }: PageProps = $props();
</script>

<svelte:head><title>Alumap - New project</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold tracking-tight">New project</h1>
<ProjectForm error={form?.error} isAdmin={data.me?.isAdmin} />
