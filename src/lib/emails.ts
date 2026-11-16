/** Innopolis University addresses used to verify IU alumni. */
export const isAlumniEmail = (email: string) =>
	/@innopolis\.(university|ru)$/i.test(email.trim());
