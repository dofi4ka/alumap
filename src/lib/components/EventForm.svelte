<script lang="ts">
	import { enhance } from '$app/forms';
	import { ImagePlus } from '@lucide/svelte';
	import CityPicker from './CityPicker.svelte';
	import UserPicker from './UserPicker.svelte';
	import { imageUrl } from '#lib/images.ts';

	type EventValues = {
		title: string;
		description: string;
		imageId: string | null;
		cost: number | null;
		startsAt: string;
		locationName: string;
		address: string | null;
		locationLat: number;
		locationLng: number;
	};

	let {
		event = null,
		error,
		isAdmin = false,
		ownerId,
		coOrganizers = []
	}: {
		event?: EventValues | null;
		error?: string;
		isAdmin?: boolean;
		/** main organizer, can't be a co-organizer */
		ownerId?: number;
		coOrganizers?: { id: number; firstName: string; lastName: string; avatarId: string | null }[];
	} = $props();

	// svelte-ignore state_referenced_locally
	let preview = $state(imageUrl(event?.imageId));
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

<!-- One column on phones in DOM order; from `sm` the fields fill the left column
     and the picture takes the right one, as tall as the five fields. -->
<form
	method="POST"
	enctype="multipart/form-data"
	class="grid gap-4 sm:grid-cols-2 sm:gap-x-6"
	use:enhance={() => {
		pending = true;
		return async ({ update }) => {
			await update({ reset: false });
			pending = false;
		};
	}}
>
	<div class="sm:col-start-1">
		<label class="label" for="ev-title">Title *</label>
		<input id="ev-title" class="input" name="title" value={event?.title ?? ''} maxlength="120" placeholder="Alumni meetup in Kazan" required />
	</div>
	<div class="sm:col-start-1">
		<label class="label" for="ev-start">Date and time *</label>
		<input id="ev-start" class="input" type="datetime-local" name="startsAt" value={event?.startsAt ?? ''} required />
	</div>
	<div class="sm:col-start-1">
		<span class="label">City *</span>
		<CityPicker
			value={event ? { name: event.locationName, lat: event.locationLat, lng: event.locationLng } : null}
			required
		/>
	</div>
	<div class="sm:col-start-1">
		<label class="label" for="ev-addr">Address or venue</label>
		<input id="ev-addr" class="input" name="address" value={event?.address ?? ''} placeholder="Universitetskaya 1, IU main building" />
	</div>
	<div class="sm:col-start-1">
		<label class="label" for="ev-cost">Price, ₽</label>
		<input id="ev-cost" class="input" type="number" min="0" name="cost" value={event?.cost ?? ''} placeholder="Free" />
	</div>

	<div class="flex flex-col gap-2 sm:col-start-2 sm:row-span-5 sm:row-start-1">
		<span class="label mb-0 hidden sm:block">Picture</span>
		<label
			class="relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:border-brand-400 sm:aspect-auto sm:flex-1"
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
		{#if preview && event?.imageId}
			<label class="flex items-center gap-2 text-sm text-zinc-600">
				<input type="checkbox" name="removeImage" bind:checked={removeImage} class="size-4 accent-brand-500" /> Remove picture
			</label>
		{/if}
	</div>

	<div class="sm:col-span-2">
		<label class="label" for="ev-desc">Description</label>
		<textarea id="ev-desc" class="input min-h-40" name="description" maxlength="5000" placeholder="What will happen, who is it for, how to get there…">{event?.description ?? ''}</textarea>
	</div>
	<div class="sm:col-span-2">
		<span class="label">Co-organizers</span>
		<UserPicker name="coOrganizers" value={coOrganizers} exclude={ownerId ? [ownerId] : []} placeholder="Add people who organize it with you" />
	</div>

	{#if error}<p class="error-box sm:col-span-2">{error}</p>{/if}
	<div class="sm:col-span-2">
		<button class="btn-primary w-full sm:w-auto" disabled={pending}>
			{pending ? 'Saving…' : event ? 'Save changes' : isAdmin ? 'Publish' : 'Submit for review'}
		</button>
	</div>
</form>
