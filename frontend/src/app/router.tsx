import { createBrowserRouter } from "react-router";

import { PageFallback } from "@/components/layout/PageFallback";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import HomePage from "@/pages/HomePage";

/**
 * Route map (docs/SPEC.md §3.1).
 * All pages share PublicLayout (navbar + footer); project detail and 404 are lazy-loaded chunks.
 */
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <PageFallback />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "projects/:slug",
        lazy: async () => ({ Component: (await import("@/pages/ProjectDetailPage")).default }),
      },
      {
        path: "*",
        lazy: async () => ({ Component: (await import("@/pages/NotFoundPage")).default }),
      },
    ],
  },
]);
