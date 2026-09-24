import { useEffect, useState } from "react";

/** Offset (px from the viewport top) of the band's bottom edge, from the rootMargin ("-40% 0px -55% 0px"). */
function bandBottom(rootMargin: string): number {
  const values = rootMargin.trim().split(/\s+/);
  const raw = values.length >= 3 ? values[2] : values[0] ?? "0";
  const inset = Number.parseFloat(raw);
  if (!Number.isFinite(inset)) return window.innerHeight;
  return window.innerHeight + (raw.endsWith("%") ? (inset / 100) * window.innerHeight : inset);
}

/**
 * Id of the section currently crossing a thin band in the upper-middle of the viewport:
 * the last section (in `ids` order) whose top has entered the band, or `null` above the
 * first one.
 *
 * The IntersectionObserver (plus a throttled scroll listener) is only a trigger — the active
 * section is always recomputed from the elements' positions, so large jumps (Back to top,
 * anchor links, scrolling back above the first section) never leave a stale value.
 *
 * Sections may render after the hook mounts (content arrives from the API), so a
 * MutationObserver keeps the IntersectionObserver attached to the current elements.
 * Pass a stable (module-level or memoised) array; an empty array disables tracking.
 */
export function useActiveSection(ids: readonly string[], rootMargin = "-40% 0px -55% 0px"): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observed = new Map<string, Element>();

    const recompute = (entries: readonly IntersectionObserverEntry[]) => {
      const line = entries.find((entry) => entry.rootBounds)?.rootBounds?.bottom ?? bandBottom(rootMargin);
      let current: string | null = null;
      for (const id of ids) {
        const element = observed.get(id);
        if (element && element.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };

    const intersection = new IntersectionObserver((entries) => recompute(entries), { rootMargin });

    // Jumps between two points where nothing crosses the band (e.g. from the footer straight back to
    // the top) fire no intersection change, so a rAF-throttled scroll listener recomputes as well.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        recompute([]);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const sync = () => {
      for (const id of ids) {
        const element = document.getElementById(id);
        const previous = observed.get(id);
        if (element === previous) continue;
        if (previous) intersection.unobserve(previous);
        if (element) {
          observed.set(id, element);
          intersection.observe(element);
        } else {
          observed.delete(id);
        }
      }
    };

    sync();
    const mutations = new MutationObserver(sync);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      intersection.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ids, rootMargin]);

  return ids.length > 0 && active !== null && ids.includes(active) ? active : null;
}
