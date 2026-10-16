<script lang="ts">
	import { onMount } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import type { GeoJSONSource, MapGeoJSONFeature } from 'maplibre-gl';
	// maplibre finds its worker next to its own file, which breaks after bundling:
	// `?url` makes vite emit the worker and gives its real address
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

	maplibregl.setWorkerUrl(workerUrl);
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { MapFeatureProps } from '../../routes/api/map.geojson/+server.ts';
	import { createSpaceLayer } from '#lib/map/space-layer.ts';

	let { center, zoom }: { center: [number, number]; zoom: number } = $props();

	let container: HTMLDivElement;

	const BRAND = '#40ba21';
	const ICON_PX = 48; // css pixels
	const RATIO = 2;
	const CLUSTER_MAX_ZOOM = 18;

	// ---------- icons ----------

	function loadImage(url: string) {
		return new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = url;
		});
	}

	/** Draws avatar (circle) or event (rounded square) marker. */
	async function makeIcon(key: string): Promise<ImageData> {
		const [kind, icon] = key.split('|');
		const size = ICON_PX * RATIO;
		const border = 3 * RATIO;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		const ctx = canvas.getContext('2d')!;

		const shape = (inset: number) => {
			ctx.beginPath();
			if (kind === 'user') ctx.arc(size / 2, size / 2, size / 2 - inset, 0, Math.PI * 2);
			else ctx.roundRect(inset, inset, size - 2 * inset, size - 2 * inset, 12 * RATIO - inset);
		};

		shape(0);
		ctx.fillStyle = kind === 'user' ? '#ffffff' : BRAND;
		ctx.fill();

		ctx.save();
		shape(border);
		ctx.clip();
		if (icon.startsWith('img:')) {
			try {
				const img = await loadImage(icon.slice(4));
				ctx.drawImage(img, 0, 0, size, size);
			} catch {
				ctx.fillStyle = '#e4e4e7';
				ctx.fill();
			}
		} else {
			ctx.fillStyle = kind === 'user' ? '#dff5d4' : '#f1fbec';
			ctx.fill();
			ctx.fillStyle = '#287616';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const text = icon.startsWith('initials:') ? icon.slice(9) : '★';
			ctx.font = `600 ${17 * RATIO}px Inter, system-ui, sans-serif`;
			ctx.fillText(text, size / 2, size / 2 + RATIO);
		}
		ctx.restore();
		return ctx.getImageData(0, 0, size, size);
	}

	// ---------- popups ----------

	const esc = (s: string) =>
		s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

	function popupItem(p: MapFeatureProps) {
		const href = p.kind === 'user' ? `/u/${p.id}` : `/events/${p.id}`;
		const img = p.icon.startsWith('img:')
			? `<img src="${esc(p.icon.slice(4))}" class="size-10 shrink-0 object-cover ${p.kind === 'user' ? 'rounded-full' : 'rounded-lg'}" alt="">`
			: `<div class="flex size-10 shrink-0 items-center justify-center bg-brand-100 font-semibold text-brand-700 ${p.kind === 'user' ? 'rounded-full' : 'rounded-lg'}">${esc(p.icon.startsWith('initials:') ? p.icon.slice(9) : '★')}</div>`;
		return `<a href="${href}" class="flex items-center gap-3 rounded-lg p-1.5 hover:bg-zinc-50">${img}
			<span class="min-w-0"><span class="block truncate font-semibold text-zinc-900">${esc(p.title)}</span>
			<span class="block truncate text-xs text-zinc-500">${esc(p.subtitle)}</span></span></a>`;
	}

	onMount(() => {
		const map = new maplibregl.Map({
			container,
			style: '/map-style.json',
			center,
			zoom,
			attributionControl: { compact: true }
		});
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
		map.addControl(new maplibregl.GeolocateControl({}), 'top-right');

		const popup = new maplibregl.Popup({ closeButton: false, maxWidth: '280px', offset: 26 });

		map.on('load', async () => {
			const styleLayers = map.getStyle().layers;
			map.addLayer(createSpaceLayer('space', 'space'), styleLayers[0].id);
			map.addLayer(
				createSpaceLayer('atmosphere', 'atmosphere'),
				styleLayers.find((l) => l.type === 'symbol')?.id
			);

			const data = await fetch('/api/map.geojson').then((r) => r.json());
			const features = data.features as { properties: MapFeatureProps }[];

			// images must exist before the layer asks for them, so preload them all
			const keys = new Set(features.map((f) => `${f.properties.kind}|${f.properties.icon}`));
			await Promise.all(
				[...keys].map(async (key) => map.addImage(key, await makeIcon(key), { pixelRatio: RATIO }))
			);

			map.addSource('points', {
				type: 'geojson',
				data,
				cluster: true,
				clusterRadius: 44,
				clusterMaxZoom: CLUSTER_MAX_ZOOM
			});

			map.addLayer({
				id: 'clusters',
				type: 'circle',
				source: 'points',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': BRAND,
					'circle-radius': ['step', ['get', 'point_count'], 20, 10, 24, 50, 30],
					'circle-stroke-width': 3,
					'circle-stroke-color': '#ffffff'
				}
			});
			map.addLayer({
				id: 'cluster-count',
				type: 'symbol',
				source: 'points',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': ['get', 'point_count_abbreviated'],
					'text-font': ['Noto Sans Bold'],
					'text-size': 14
				},
				paint: { 'text-color': '#ffffff' }
			});
			map.addLayer({
				id: 'points',
				type: 'symbol',
				source: 'points',
				filter: ['!', ['has', 'point_count']],
				layout: {
					'icon-image': ['concat', ['get', 'kind'], '|', ['get', 'icon']],
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
					'symbol-sort-key': ['match', ['get', 'kind'], 'event', 1, 0]
				}
			});

			map.on('click', 'clusters', async (e) => {
				const feature = e.features![0];
				const source = map.getSource('points') as GeoJSONSource;
				const clusterId = feature.properties.cluster_id;
				const coords = (feature.geometry as { coordinates: number[] }).coordinates as [number, number];
				map.easeTo({ center: coords, zoom: await source.getClusterExpansionZoom(clusterId) });
			});

			map.on('click', 'points', (e) => {
				const f = e.features![0] as MapGeoJSONFeature;
				popup
					.setLngLat((f.geometry as { coordinates: number[] }).coordinates as [number, number])
					.setHTML(popupItem(f.properties as MapFeatureProps))
					.addTo(map);
			});

			for (const layer of ['clusters', 'points']) {
				map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
				map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
			}
		});

		return () => {
			map.remove();
		};
	});
</script>

<div class="absolute inset-0 overflow-hidden bg-[#03050b]">
	<div class="absolute inset-0"><div bind:this={container} class="size-full"></div></div>
</div>

<style>
	:global(.maplibregl-popup-content) {
		border-radius: 14px;
		padding: 6px;
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.18);
	}
</style>
