/** Small client-safe helpers shared by the rich text editor and the server sanitizer. */

const escapeHtml = (value: string) =>
	value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The tags our editor produces; plain text with any of them is treated as formatted content. */
const HTML_LIKE =
	/<\/?(?:p|br|strong|b|em|i|u|s|strike|h[1-6]|blockquote|ul|ol|li|a|code|pre|hr|div|span)\b/i;

export const looksLikeHtml = (value: string) => HTML_LIKE.test(value);

/** Escapes plain text and keeps paragraphs/line breaks. Used for old plain-text content. */
export function plainTextToHtml(value: string) {
	return value
		.split(/\n{2,}/)
		.map((paragraph) =>
			paragraph
				.split('\n')
				.map((line) => escapeHtml(line))
				.join('<br />')
		)
		.filter((paragraph) => paragraph.length > 0)
		.map((paragraph) => `<p>${paragraph}</p>`)
		.join('');
}

export const normalizeRichText = (value: string | null | undefined) => {
	const text = value?.trim() ?? '';
	if (!text) return '';
	return looksLikeHtml(text) ? text : plainTextToHtml(text);
};

const entities: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&nbsp;': ' '
};

export const decodeEntities = (value: string) =>
	value.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => entities[entity] ?? entity);

export const stripTags = (value: string) =>
	decodeEntities(
		value
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(?:p|li|h[1-6]|blockquote)>/gi, '\n')
			.replace(/<[^>]*>/g, '')
	)
		.replace(/\n{3,}/g, '\n\n')
		.trim();
