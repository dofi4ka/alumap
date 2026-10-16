import { redirect } from '@sveltejs/kit';
import { saveEvent } from '#lib/server/events.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const result = await saveEvent(await request.formData(), locals.user!, null);
		if ('nanoId' in result) redirect(303, `/events/${result.nanoId}`);
		return result;
	}
};
