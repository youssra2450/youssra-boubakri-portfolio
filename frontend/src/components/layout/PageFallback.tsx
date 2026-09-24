/** Shown only while a lazy route loads on the very first page view (light, like the site). */
export function PageFallback() {
  return (
    <div role="status" aria-live="polite" className="min-h-svh bg-linear-to-b from-ivory to-white">
      <span className="sr-only">Loading…</span>
    </div>
  );
}
