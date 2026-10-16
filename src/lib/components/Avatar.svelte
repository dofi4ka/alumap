<script lang="ts">
	import { imageUrl } from '#lib/images.ts';

	let {
		user,
		size = 40,
		class: klass = ''
	}: {
		user: { firstName: string; lastName: string; avatarId: string | null };
		size?: number;
		class?: string;
	} = $props();

	const initials = $derived(`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase());
	const src = $derived(imageUrl(user.avatarId, size <= 64));
</script>

{#if src}
	<img
		{src}
		alt="{user.firstName} {user.lastName}"
		width={size}
		height={size}
		class="shrink-0 rounded-full bg-zinc-100 object-cover {klass}"
		style="width:{size}px;height:{size}px"
	/>
{:else}
	<div
		class="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 {klass}"
		style="width:{size}px;height:{size}px;font-size:{size * 0.38}px"
	>
		{initials}
	</div>
{/if}
