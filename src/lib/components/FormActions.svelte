<script lang="ts">
	let { onCancel, label = 'Save' }: { onCancel: () => void; label?: string } = $props();
</script>

<div class="mt-4 flex justify-end gap-2">
	<button type="button" class="btn-secondary" onclick={onCancel}>Cancel</button>
	<button class="btn-primary">{label}</button>
</div>
