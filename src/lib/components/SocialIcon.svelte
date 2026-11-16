<script lang="ts">
	import { platformFor } from '#lib/socials.ts';

	let { url, size = 20 }: { url: string; size?: number } = $props();

	const platform = $derived(platformFor(url));
</script>

<!-- Brand marks come from simple-icons, the generic link icon is a globe. -->
<svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
	<path d={platform.path} />
</svg>
