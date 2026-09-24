import { useApi, type UseApiResult } from "@/hooks/useApi";
import { PORTFOLIO_PATH, projectPath } from "@/services/portfolio";
import type { Portfolio, ProjectDetail } from "@/types/api";

/** GET /api/portfolio through the shared cache (one request shared by every consumer). */
export function usePortfolio(): UseApiResult<Portfolio> {
  return useApi<Portfolio>(PORTFOLIO_PATH);
}

/** GET /api/projects/:slug through the shared cache. */
export function useProject(slug: string | undefined): UseApiResult<ProjectDetail> {
  return useApi<ProjectDetail>(slug ? projectPath(slug) : null);
}
