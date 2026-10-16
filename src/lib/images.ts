export const imageUrl = (id: string | null | undefined, thumb = false) =>
	id ? `/uploads/${id}${thumb ? '-thumb' : ''}.webp` : null;
