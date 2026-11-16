import sanitizeHtml from 'sanitize-html';
import { normalizeRichText, stripTags } from '../rich-text.ts';

const options: sanitizeHtml.IOptions = {
	allowedTags: [
		'p',
		'br',
		'strong',
		'b',
		'em',
		'i',
		'u',
		's',
		'strike',
		'h2',
		'h3',
		'blockquote',
		'ul',
		'ol',
		'li',
		'a',
		'code',
		'pre',
		'hr'
	],
	allowedAttributes: {
		a: ['href', 'title', 'target', 'rel']
	},
	allowedSchemes: ['http', 'https', 'mailto'],
	allowProtocolRelative: false,
	disallowedTagsMode: 'discard',
	transformTags: {
		a: (tagName, attribs) => ({
			tagName,
			attribs: {
				...attribs,
				target: '_blank',
				rel: 'noopener nofollow'
			}
		})
	}
};

/** Sanitizes editor output and upgrades old plain-text descriptions to paragraphs. */
export const sanitizeRichText = (value: string | null | undefined) =>
	sanitizeHtml(normalizeRichText(value), options);

export const richTextPreview = (value: string | null | undefined) =>
	stripTags(sanitizeRichText(value));

export function richTextFromForm(
	fd: FormData,
	key: string,
	maxLength: number
): { html: string } | { error: string } {
	const raw = fd.get(key);
	const html = sanitizeRichText(typeof raw === 'string' ? raw : '');
	const text = stripTags(html);
	if (!text) return { html: '' };
	if (text.length > maxLength)
		return { error: `Text is too long (maximum ${maxLength.toLocaleString('en')} characters)` };
	if (html.length > 200_000) return { error: 'Text is too long' };
	return { html };
}
