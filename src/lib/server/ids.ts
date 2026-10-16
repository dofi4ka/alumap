import { customAlphabet } from 'nanoid';

/** Short url-friendly public ids for users and events */
export const publicId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);
