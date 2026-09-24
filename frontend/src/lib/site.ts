/** Public site URL (VITE_SITE_URL) without a trailing slash; falls back to the current origin. */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  (typeof window === "undefined" ? "" : window.location.origin);

/**
 * Site identity declared once in index.html (`<meta property="og:site_name">`).
 * Used only as a fallback while the profile has not been loaded from the API.
 */
export const SITE_NAME: string =
  typeof document === "undefined"
    ? ""
    : (document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content ?? "");

/** Section ids of the home page, in document order (also used as URL hashes). */
export const SECTION = {
  home: "home",
  snapshot: "snapshot",
  about: "about",
  experience: "experience",
  education: "education",
  skills: "skills",
  capabilities: "capabilities",
  projects: "projects",
  architecture: "architecture",
  contact: "contact",
} as const;

export type SectionId = (typeof SECTION)[keyof typeof SECTION];

/** Link to a home-page section that works from any route ("/#projects"). */
export function sectionHref(id: SectionId): string {
  return `/#${id}`;
}

/** Id of the heading that labels a section (`aria-labelledby`). */
export function sectionTitleId(id: string): string {
  return `${id}-title`;
}
