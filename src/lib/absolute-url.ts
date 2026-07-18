const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://d76riders.com").replace(/\/+$/, "");

/** Build an absolute https URL for the site — used in emails, where relative
 *  links don't resolve. `path` may start with or without a leading slash. */
export function absoluteUrl(path = ""): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}/${path.replace(/^\/+/, "")}`;
}

export { SITE_URL };
