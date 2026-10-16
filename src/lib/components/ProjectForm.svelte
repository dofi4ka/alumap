<script lang="ts">
	import { enhance } from '$app/forms';
	import { ImagePlus } from '@lucide/svelte';
	import { imageUrl } from '#lib/images.ts';

	type ProjectValues = {
		title: string;
		description: string;
		imageId: string | null;
		donationUrl: string | null;
		fundraisingGoal: number | null;
	};

	let {
		project = null,
		error,
		isAdmin = false
	}: { project?: ProjectValues | null; error?: string; isAdmin?: boolean } = $props();

	// svelte-ignore state_referenced_locally
	let preview = $state(imageUrl(project?.imageId));
	let removeImage = $state(false);
	let pending = $state(false);

	function onFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) {
			preview = URL.createObjectURL(file);
			removeImage = false;
		}
	}
</script>

<!-- One column on phones in DOM order; from `sm` the square cover sits right of the three fields. -->
<form
	method="POST"
	enctype="multipart/form-data"
	class="grid gap-4 sm:grid-cols-[1fr_14rem] sm:gap-x-6"
	use:enhance={() => {
		pending = true;
		return async ({ update }) => {
			await update({ reset: false });
			pending = false;
		};
	}}
>
	<div class="sm:col-start-1">
		<label class="label" for="pr-title">Title *</label>
		<input id="pr-title" class="input" name="title" value={project?.title ?? ''} maxlength="120" placeholder="Scholarship for IU students" required />
	</div>
	<div class="sm:col-start-1">
		<label class="label" for="pr-url">Donation link</label>
		<input id="pr-url" class="input" name="donationUrl" value={project?.donationUrl ?? ''} placeholder="https://boosty.to/…" />
	</div>
	<div class="sm:col-start-1">
		<label class="label" for="pr-goal">Fundraising goal, ₽</label>
		<input id="pr-goal" class="input" type="number" min="0" name="fundraisingGoal" value={project?.fundraisingGoal ?? ''} placeholder="No goal" />
	</div>

	<div class="flex flex-col gap-2 sm:col-start-2 sm:row-span-3 sm:row-start-1">
		<label
			class="relative block aspect-square w-full max-w-56 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:border-brand-400"
		>
			{#if preview && !removeImage}
				<img src={preview} alt="" class="absolute inset-0 size-full object-cover" />
			{:else}
				<span class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-zinc-500">
					<ImagePlus size={28} />Add a cover picture
				</span>
			{/if}
			<input type="file" name="image" accept="image/*" class="hidden" onchange={onFile} />
		</label>
		{#if preview && project?.imageId}
			<label class="flex items-center gap-2 text-sm text-zinc-600">
				<input type="checkbox" name="removeImage" bind:checked={removeImage} class="size-4 accent-brand-500" /> Remove picture
			</label>
		{/if}
	</div>

	<div class="sm:col-span-2">
		<label class="label" for="pr-desc">Description</label>
		<textarea id="pr-desc" class="input min-h-40" name="description" maxlength="5000" placeholder="What is the project about, what the money is for…">{project?.description ?? ''}</textarea>
	</div>

	{#if error}<p class="error-box sm:col-span-2">{error}</p>{/if}
	<div class="sm:col-span-2">
		<button class="btn-primary w-full sm:w-auto" disabled={pending}>
			{pending ? 'Saving…' : project ? 'Save changes' : isAdmin ? 'Publish' : 'Submit for review'}
		</button>
	</div>
</form>
