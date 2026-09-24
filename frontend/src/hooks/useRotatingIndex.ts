import { useEffect, useState } from "react";

export interface UseRotatingIndexOptions {
  /** Time each item stays visible, in ms. */
  interval?: number;
  /** Rotate only while true (e.g. on screen and motion allowed). */
  enabled?: boolean;
}

/**
 * Index cycling through `count` items every `interval` ms while `enabled`.
 * Pauses while the tab is hidden; keeps its position when paused.
 */
export function useRotatingIndex(count: number, { interval = 2800, enabled = true }: UseRotatingIndexOptions = {}): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled || count < 2) return;
    let timer = 0;
    const start = () => {
      if (!timer) timer = window.setInterval(() => setIndex((current) => (current + 1) % count), interval);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };
    const onVisibilityChange = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [count, interval, enabled]);

  return count > 0 ? index % count : 0;
}
