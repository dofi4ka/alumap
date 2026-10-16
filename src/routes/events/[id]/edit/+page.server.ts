import { error, redirect } from '@sveltejs/kit';
import { getCoOrganizers, getEvent, saveEvent } from '#lib/server/events.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const { event, canEdit } = getEvent(params.id, locals.user!);
	if (!canEdit) error(403, 'Forbidden');
	return { event, coOrganizers: getCoOrganizers(event.id) };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { event, canEdit } = getEvent(params.id, locals.user!);
		if (!canEdit) error(403, 'Forbidden');
		const result = await saveEvent(await request.formData(), locals.user!, event);
		if ('nanoId' in result) redirect(303, `/events/${result.nanoId}`);
		return result;
	}
};
