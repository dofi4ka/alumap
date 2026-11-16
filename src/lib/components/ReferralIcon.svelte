<script lang="ts">
	let { company, favicon }: { company: string; favicon: string | null } = $props();
	let failed = $state(false);
</script>

{#if favicon && !failed}
	<img
		src={favicon}
		alt=""
		width="44"
		height="44"
		loading="lazy"
		referrerpolicy="no-referrer"
		class="size-11 shrink-0 rounded-xl bg-zinc-100 object-contain p-1.5"
		onerror={() => (failed = true)}
	/>
{:else}
	<div
		class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-500"
	>
		{company.slice(0, 2).toUpperCase()}
	</div>
{/if}
