import type { SubmitFunction } from '$app/forms';

/** use:enhance callback that keeps form values, and calls `onSuccess` after a successful submit. */
export const submitThen =
	(onSuccess?: () => void): SubmitFunction =>
	() =>
	async ({ result, update }) => {
		await update({ reset: false });
		if (result.type === 'success') onSuccess?.();
	};
