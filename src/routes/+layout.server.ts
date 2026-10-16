import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const u = locals.user;
	return {
		me: u && {
			id: u.id,
			nanoId: u.nanoId,
			firstName: u.firstName,
			lastName: u.lastName,
			avatarId: u.avatarId,
			isAdmin: u.isAdmin,
			isApproved: u.isApproved,
			isBanned: u.isBanned
		}
	};
};
