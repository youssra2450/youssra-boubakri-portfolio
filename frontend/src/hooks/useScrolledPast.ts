import { useCallback, useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/** True once the page has been scrolled further than `offset` pixels. */
export function useScrolledPast(offset: number): boolean {
  const getSnapshot = useCallback(() => window.scrollY > offset, [offset]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
