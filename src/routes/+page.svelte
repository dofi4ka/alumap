<script lang="ts">
	import { page } from '$app/state';
	import GlobeMap from '#lib/components/GlobeMap.svelte';

	const params = page.url.searchParams;
	const num = (key: string, fallback: number) => {
		const v = parseFloat(params.get(key) ?? '');
		return Number.isFinite(v) ? v : fallback;
	};
	const center: [number, number] = [num('lng', 48.74), num('lat', 55.75)];
	const zoom = num('zoom', window.innerWidth < 640 ? 1.1 : 1.8);
</script>

<svelte:head><title>Alumap</title></svelte:head>

<div class="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:top-14 md:bottom-0">
	<GlobeMap {center} {zoom} />
</div>
