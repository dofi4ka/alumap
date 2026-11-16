<script lang="ts">
	import { enhance } from '$app/forms';
	import CityPicker from './CityPicker.svelte';
	import FormActions from './FormActions.svelte';
	import { submitThen } from '#lib/enhance.ts';

	let { close }: { close: () => void } = $props();
</script>

<form method="POST" action="?/temporaryLocation" use:enhance={submitThen(close)} class="space-y-3">
	<div>
		<label class="label" for="temp-city">Where are you going?</label>
		<CityPicker id="temp-city" placeholder="City you are in right now" required />
	</div>
	<div>
		<label class="label" for="temp-duration">How long?</label>
		<input
			id="temp-duration"
			class="input"
			name="duration"
			placeholder="14d, 3w or 2m"
			required
			autocomplete="off"
			spellcheck="false"
		/>
		<p class="mt-1 text-xs text-zinc-500">
			Use <b>d</b> for days, <b>w</b> for weeks and <b>m</b> for months, up to one year. After that your
			home city comes back automatically.
		</p>
	</div>
	<FormActions onCancel={close} label="Set temporary city" />
</form>
