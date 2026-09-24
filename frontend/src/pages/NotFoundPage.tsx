import { ArrowRight, SearchX } from "lucide-react";

import { StatusPanel } from "@/components/common/StatusPanel";
import { ButtonLink } from "@/components/ui/Button";
import { ARROW_NUDGE } from "@/components/ui/buttonStyles";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { SECTION, sectionHref, SITE_NAME } from "@/lib/site";

/** Catch-all route ("*"). */
export default function NotFoundPage() {
  useDocumentMeta({
    title: SITE_NAME ? `Page not found — ${SITE_NAME}` : "Page not found",
    robots: "noindex, follow",
  });

  return (
    <StatusPanel
      icon={SearchX}
      eyebrow="Error 404"
      title="Page not found"
      description="The page you requested does not exist or has moved. The portfolio and every project case study remain one click away."
      actions={
        <>
          <ButtonLink to="/">Back to the home page</ButtonLink>
          <ButtonLink
            to={sectionHref(SECTION.projects)}
            variant="secondary"
            trailingIcon={<ArrowRight aria-hidden="true" className={ARROW_NUDGE} />}
          >
            Browse projects
          </ButtonLink>
        </>
      }
    />
  );
}
