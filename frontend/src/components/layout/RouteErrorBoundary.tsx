import { RefreshCw, SearchX, TriangleAlert } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import { buttonClasses } from "@/components/ui/buttonStyles";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

/** A lazy chunk that no longer exists (typically right after a new deployment). */
function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      error.message,
    )
  );
}

/**
 * Rendered by react-router when a route throws (render error, failed lazy import, 404
 * response). Self-contained: it replaces the whole layout, so it cannot rely on it.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const outdated = isChunkLoadError(error);

  const title = notFound
    ? "Page not found"
    : outdated
      ? "A new version of this site is available"
      : "This page could not be displayed";
  const description = notFound
    ? "The page you requested does not exist or has moved."
    : outdated
      ? "Reload the page to load the latest version."
      : "An unexpected error interrupted rendering. Reloading the page usually resolves it.";

  useDocumentMeta({ title: `${title}`, robots: "noindex, nofollow" });

  const Icon = notFound ? SearchX : TriangleAlert;

  return (
    <main id="main" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-linear-to-b from-ivory to-white text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 -z-10 size-[640px] rounded-full bg-[radial-gradient(closest-side,rgb(141_182_234/0.32),transparent)]"
      />
      <Container className="flex flex-1 flex-col justify-center py-24">
        <div className="max-w-2xl">
          <span className="flex size-12 items-center justify-center rounded-xl border border-accent/15 bg-accent-tint text-accent-strong">
            <Icon aria-hidden="true" className="size-6" />
          </span>
          <p className="eyebrow mt-8 text-accent-strong">{notFound ? "Error 404" : "Error"}</p>
          <h1 className="mt-4 text-h2 font-bold text-ink">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{description}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            {!notFound && (
              <Button leadingIcon={<RefreshCw aria-hidden="true" />} onClick={() => window.location.reload()}>
                Reload page
              </Button>
            )}
            {/* Full page load on purpose: the router state may be what failed. */}
            <a href="/" className={buttonClasses({ variant: notFound ? "primary" : "secondary" })}>
              Go to the home page
            </a>
          </div>
        </div>
      </Container>
    </main>
  );
}
