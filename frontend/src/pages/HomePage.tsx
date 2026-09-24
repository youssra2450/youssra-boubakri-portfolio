import { CloudOff, RefreshCw } from "lucide-react";

import { StatusPanel } from "@/components/common/StatusPanel";
import { Button } from "@/components/ui/Button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { usePortfolio } from "@/hooks/usePortfolio";
import { About } from "@/sections/About";
import { Architecture } from "@/sections/Architecture";
import { Capabilities } from "@/sections/Capabilities";
import { Contact } from "@/sections/Contact";
import { Education } from "@/sections/Education";
import { Experience } from "@/sections/Experience";
import { Hero } from "@/sections/Hero";
import { HomeSkeleton } from "@/sections/HomeSkeleton";
import { Projects } from "@/sections/Projects";
import { Skills } from "@/sections/Skills";
import { Snapshot } from "@/sections/Snapshot";

/** "/" — every section, rendered from a single GET /api/portfolio. */
export default function HomePage() {
  // Title, description and canonical URL come from index.html (SEO-reviewed copy).
  useDocumentMeta({});
  const { data, error, validating, reload } = usePortfolio();

  if (!data) {
    if (!error) return <HomeSkeleton />;
    return (
      <StatusPanel
        icon={CloudOff}
        eyebrow="Temporarily unavailable"
        title="The portfolio is momentarily unavailable"
        description="The content service did not respond as expected. This is usually brief — please retry in a moment."
        actions={
          <Button loading={validating} leadingIcon={<RefreshCw aria-hidden="true" />} onClick={reload}>
            Retry
          </Button>
        }
      />
    );
  }

  const { profile } = data;
  return (
    <>
      <Hero portfolio={data} />
      <Snapshot profile={profile} />
      <About profile={profile} />
      <Experience items={data.experience} />
      <Education items={data.education} />
      <Skills categories={data.skills} />
      <Capabilities capabilities={profile.capabilities} />
      <Projects projects={data.projects} />
      <Architecture portfolio={data} />
      <Contact profile={profile} />
    </>
  );
}
