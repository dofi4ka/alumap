<script lang="ts">
	import { onMount } from 'svelte';

	let {
		name = 'code',
		autofocus = false
	}: { name?: string; autofocus?: boolean } = $props();

	const LENGTH = 6;
	let digits = $state<string[]>(Array(LENGTH).fill(''));
	let inputs: HTMLInputElement[] = [];
	const code = $derived(digits.join(''));

	onMount(() => {
		if (autofocus) inputs[0]?.focus();
	});

	/** Writes a whole code (typed into one box, pasted or autofilled) starting at `start`. */
	function fill(value: string, start = 0) {
		const chars = value.replace(/\D/g, '').slice(0, LENGTH - start).split('');
		if (!chars.length) return;
		const next = [...digits];
		for (let i = 0; i < chars.length; i++) next[start + i] = chars[i];
		digits = next;
		inputs[Math.min(start + chars.length, LENGTH - 1)]?.focus();
	}

	function onInput(event: Event, index: number) {
		const input = event.currentTarget as HTMLInputElement;
		const value = input.value.replace(/\D/g, '');
		if (value.length > 1) {
			fill(value, index);
			return;
		}
		const next = [...digits];
		next[index] = value.slice(-1);
		digits = next;
		if (value && index < LENGTH - 1) inputs[index + 1]?.focus();
	}

	function onKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Backspace') {
			const next = [...digits];
			if (next[index]) next[index] = '';
			else if (index > 0) {
				next[index - 1] = '';
				inputs[index - 1]?.focus();
			} else return;
			digits = next;
			event.preventDefault();
		} else if (event.key === 'ArrowLeft' && index > 0) {
			inputs[index - 1]?.focus();
			event.preventDefault();
		} else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
			inputs[index + 1]?.focus();
			event.preventDefault();
		} else if (event.key === 'Enter') {
			// let the form handle the Enter press
		}
	}

	function onPaste(event: ClipboardEvent, index: number) {
		const text = event.clipboardData?.getData('text') ?? '';
		if (!text.replace(/\D/g, '')) return;
		event.preventDefault();
		fill(text, index);
	}
</script>

<div class="grid grid-cols-6 gap-2">
	{#each Array(LENGTH) as _, i (i)}
		<input
			bind:this={inputs[i]}
			value={digits[i]}
			oninput={(event) => onInput(event, i)}
			onkeydown={(event) => onKeydown(event, i)}
			onpaste={(event) => onPaste(event, i)}
			onfocus={(event) => event.currentTarget.select()}
			class="h-12 w-full min-w-0 rounded-xl border border-zinc-200 bg-white text-center text-xl font-semibold text-zinc-900 tabular-nums outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			aria-label="Digit {i + 1} of {LENGTH}"
			autocomplete={i === 0 ? 'one-time-code' : 'off'}
			enterkeyhint={i === LENGTH - 1 ? 'done' : 'next'}
		/>
	{/each}
</div>
<input type="hidden" {name} value={code} />
