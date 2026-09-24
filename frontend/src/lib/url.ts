/**
 * Only render links whose scheme is safe: absolute http(s) URLs or site-relative paths.
 * The backend validates URLs too; this is defence in depth against `javascript:` & co.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return null;
}

/** "https://www.linkedin.com/in/jane/" → "linkedin.com/in/jane" (for display next to a link). */
export function displayUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

/** mailto: link with an optional pre-filled subject. */
export function mailtoHref(email: string, subject?: string): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
