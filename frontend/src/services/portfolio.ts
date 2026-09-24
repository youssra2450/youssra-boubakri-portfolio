import { apiUrl } from "@/services/api";

/**
 * Typed paths of the public API (docs/SPEC.md §2.3). Paths are relative to
 * VITE_API_BASE_URL and are resolved by `apiFetch` / `useApi`.
 */
export const PORTFOLIO_PATH = "/portfolio";
export const HEALTH_PATH = "/health";
export const CONTACT_PATH = "/contact";

export function projectPath(slug: string): string {
  return `/projects/${encodeURIComponent(slug)}`;
}

/** Absolute links opened by the browser directly (not fetched as JSON). */
export const API_DOCS_URL = apiUrl("/docs");
export const OPENAPI_URL = apiUrl("/openapi.json");

/** Client route of a project case study. */
export function projectRoute(slug: string): string {
  return `/projects/${encodeURIComponent(slug)}`;
}
