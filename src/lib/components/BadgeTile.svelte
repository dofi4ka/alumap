<script lang="ts">
	import BadgeIcon from './BadgeIcon.svelte';

	/** A badge as shown in the profile strip: icon, name and progress for locked ones. */
	let {
		name,
		rarity,
		svg,
		locked = false,
		progress = null
	}: {
		name: string;
		rarity: 'bronze' | 'silver' | 'gold';
		svg: string;
		locked?: boolean;
		progress?: { current: number; target: number } | null;
	} = $props();
</script>

<span class="flex w-full flex-col items-center gap-1.5">
	<BadgeIcon {svg} {rarity} size={58} {locked} />
	<span class="line-clamp-2 text-center text-xs font-medium {locked ? 'text-zinc-400' : ''}">{name}</span>
	{#if locked && progress}
		<span class="h-1 w-12 overflow-hidden rounded-full bg-zinc-100">
			<span class="block h-full rounded-full bg-brand-500" style="width:{(100 * progress.current) / progress.target}%"></span>
		</span>
	{/if}
</span>
