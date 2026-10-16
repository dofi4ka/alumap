<script lang="ts">
	import { enhance } from '$app/forms';
	import { submitThen } from '#lib/enhance.ts';
	import { employmentTypes, locationTypes, monthNames } from '#lib/format.ts';
	import FormActions from './FormActions.svelte';

	type Exp = {
		id: number;
		title: string;
		organization: string;
		location: string | null;
		locationType: string | null;
		employmentType: string | null;
		startDate: string;
		endDate: string | null;
		description: string | null;
	};
	let { exp = null, close }: { exp?: Exp | null; close: () => void } = $props();
	// svelte-ignore state_referenced_locally
	let current = $state(exp ? exp.endDate === null : false);

	const thisYear = new Date().getFullYear();
	const years = (to: number) => Array.from({ length: to - 1950 + 1 }, (_, i) => to - i);
	/** "2021-03" -> { year: "2021", month: "3" }, month is "" for year-only dates */
	const split = (d: string | null | undefined) => ({
		year: d?.slice(0, 4) ?? '',
		month: d && d.length > 4 ? String(Number(d.slice(5, 7))) : ''
	});
	const start = $derived(split(exp?.startDate));
	const end = $derived(split(exp?.endDate));
</script>

{#snippet dateSelects(prefix: string, label: string, value: { year: string; month: string }, maxYear: number)}
	<div>
		<label class="label" for="exp-{prefix}-month">{label} month</label>
		<select id="exp-{prefix}-month" class="input" name="{prefix}Month" value={value.month}>
			<option value="">Month</option>
			{#each monthNames as name, i (name)}<option value={String(i + 1)}>{name}</option>{/each}
		</select>
	</div>
	<div>
		<label class="label" for="exp-{prefix}-year">{label} year *</label>
		<select id="exp-{prefix}-year" class="input" name="{prefix}Year" value={value.year} required>
			<option value="">Year</option>
			{#each years(maxYear) as y (y)}<option value={String(y)}>{y}</option>{/each}
		</select>
	</div>
{/snippet}

<form method="POST" action="?/saveExperience" use:enhance={submitThen(close)} class="space-y-3">
	{#if exp}<input type="hidden" name="id" value={exp.id} />{/if}
	<div>
		<label class="label" for="exp-title">Title *</label>
		<input id="exp-title" class="input" name="title" value={exp?.title ?? ''} placeholder="Backend developer" required />
	</div>
	<div>
		<label class="label" for="exp-org">Company or organization *</label>
		<input id="exp-org" class="input" name="organization" value={exp?.organization ?? ''} placeholder="Yandex" required />
	</div>
	<div class="grid grid-cols-2 gap-3">
		<div>
			<label class="label" for="exp-emp">Employment type</label>
			<select id="exp-emp" class="input" name="employmentType" value={exp?.employmentType ?? ''}>
				<option value="">—</option>
				{#each Object.entries(employmentTypes) as [v, l] (v)}<option value={v}>{l}</option>{/each}
			</select>
		</div>
		<div>
			<label class="label" for="exp-lt">Location type</label>
			<select id="exp-lt" class="input" name="locationType" value={exp?.locationType ?? ''}>
				<option value="">—</option>
				{#each Object.entries(locationTypes) as [v, l] (v)}<option value={v}>{l}</option>{/each}
			</select>
		</div>
	</div>
	<div>
		<label class="label" for="exp-loc">Location</label>
		<input id="exp-loc" class="input" name="location" value={exp?.location ?? ''} placeholder="Kazan, Russia" />
	</div>
	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" name="current" bind:checked={current} class="size-4 accent-brand-500" />
		I am currently working in this role
	</label>
	<div class="grid grid-cols-2 gap-3">
		{@render dateSelects('start', 'Start', start, thisYear)}
		{#if !current}
			{@render dateSelects('end', 'End', end, thisYear + 10)}
		{/if}
	</div>
	<div>
		<label class="label" for="exp-desc">Description</label>
		<textarea id="exp-desc" class="input min-h-24" name="description" placeholder="What did you do, achievements, stack…">{exp?.description ?? ''}</textarea>
	</div>
	<FormActions onCancel={close} />
</form>
