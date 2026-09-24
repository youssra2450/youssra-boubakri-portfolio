import { useCallback, useEffect, useSyncExternalStore } from "react";

import { apiFetch } from "@/services/api";

/**
 * Minimal cached data layer for public GET endpoints (stale-while-revalidate).
 * A module-level store keeps one entry per path; components subscribe through
 * useSyncExternalStore so concurrent requests are de-duplicated and navigating
 * back renders instantly from cache.
 */
type Status = "idle" | "loading" | "success" | "error";

interface CacheEntry {
  data?: unknown;
  error: Error | null;
  promise?: Promise<unknown>;
  timestamp: number;
  status: Status;
}

const STALE_AFTER_MS = 60_000;
const EMPTY: CacheEntry = Object.freeze({ error: null, timestamp: 0, status: "idle" }) as CacheEntry;

const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

function setEntry(path: string, entry: CacheEntry): void {
  cache.set(path, entry);
  listeners.get(path)?.forEach((listener) => listener());
}

/** Fetch through the shared cache, de-duplicating concurrent requests for the same path. */
export function fetchCached<T>(path: string, { force = false } = {}): Promise<T> {
  const entry = cache.get(path);
  const fresh = entry?.status === "success" && Date.now() - entry.timestamp < STALE_AFTER_MS;
  if (!force && fresh) return Promise.resolve(entry.data as T);
  if (entry?.promise) return entry.promise as Promise<T>;

  const promise: Promise<T> = apiFetch<T>(path).then(
    (data) => {
      setEntry(path, { data, error: null, timestamp: Date.now(), status: "success" });
      return data;
    },
    (err: unknown) => {
      const current = cache.get(path);
      const error = err instanceof Error ? err : new Error(String(err));
      setEntry(path, { data: current?.data, error, timestamp: current?.timestamp ?? 0, status: "error" });
      throw error;
    },
  );
  setEntry(path, { data: entry?.data, error: null, promise, timestamp: entry?.timestamp ?? 0, status: "loading" });
  return promise;
}

export interface UseApiResult<T> {
  data: T | undefined;
  error: Error | null;
  /** True while there is no data yet (first load). */
  loading: boolean;
  /** True while any request (including a background revalidation) is in flight. */
  validating: boolean;
  reload: () => void;
}

/** Subscribe to a cached GET endpoint. Pass `null` to skip fetching. */
export function useApi<T>(path: string | null): UseApiResult<T> {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!path) return () => undefined;
      let set = listeners.get(path);
      if (!set) {
        set = new Set();
        listeners.set(path, set);
      }
      set.add(onChange);
      return () => {
        set.delete(onChange);
      };
    },
    [path],
  );
  const getSnapshot = useCallback(() => (path ? (cache.get(path) ?? EMPTY) : EMPTY), [path]);
  const entry = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (path) void fetchCached(path).catch(() => undefined);
  }, [path]);

  const reload = useCallback(() => {
    if (path) void fetchCached(path, { force: true }).catch(() => undefined);
  }, [path]);

  return {
    data: entry.data as T | undefined,
    error: entry.status === "error" ? entry.error : null,
    loading: path !== null && entry.data === undefined && entry.status !== "error",
    validating: entry.status === "loading",
    reload,
  };
}
