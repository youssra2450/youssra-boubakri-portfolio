import type { ApiErrorBody, ApiFieldError } from "@/types/api";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "/api";

/** Error thrown for any non-2xx API response or network failure. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ApiFieldError[];
  readonly retryAfter: number | null;

  constructor(status: number, body: Partial<ApiErrorBody>, retryAfter: number | null = null) {
    super(body.detail || "Unexpected error");
    this.name = "ApiError";
    this.status = status;
    this.code = body.code || "unknown_error";
    this.errors = body.errors ?? [];
    this.retryAfter = retryAfter;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST";
  /** Serialised as JSON. */
  body?: unknown;
  signal?: AbortSignal;
}

/** Resolve an API path ("/projects") to a full URL using the configured base. */
export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith(API_BASE_URL + "/") || path === API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Typed fetch wrapper for the public API. JSON request bodies are serialised automatically.
 * Resolves to `undefined` for 204 responses; throws `ApiError` otherwise.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  const init: RequestInit = { method, signal, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, { detail: "Network error — please check your connection.", code: "network_error" });
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload: unknown = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) || null : null;
    throw new ApiError(response.status, payload as Partial<ApiErrorBody>, retryAfter);
  }
  return payload as T;
}
