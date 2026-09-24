import type { ReactNode } from "react";

import { ArchitecturePipeline } from "@/features/project/ArchitecturePipeline";
import {
  AccentList,
  CapabilityGrid,
  ConceptList,
  InteractiveLab,
  Lead,
  NumberedList,
  OutcomeList,
  SourceLinks,
  Statement,
  TechnologyGrid,
} from "@/features/project/CaseStudyBlocks";
import { safeHref } from "@/lib/url";
import type { ProjectDetail } from "@/types/api";

export interface CaseStudySection {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Sections of a case study (docs/SPEC.md §3.5), in reading order, with recruiter-oriented labels.
 * A section is only included when the project has data for it — nothing is ever filled with
 * placeholders.
 */
export function buildCaseStudySections(project: ProjectDetail): CaseStudySection[] {
  const github = safeHref(project.github_url);
  const demo = safeHref(project.demo_url);

  const sections: Array<CaseStudySection | null> = [
    project.summary ? { id: "overview", label: "Overview", content: <Lead>{project.summary}</Lead> } : null,
    project.problem
      ? { id: "challenge", label: "The challenge", content: <Statement>{project.problem}</Statement> }
      : null,
    project.solution ? { id: "approach", label: "Approach", content: <Statement>{project.solution}</Statement> } : null,
    project.architecture.length > 0
      ? { id: "architecture", label: "Architecture", content: <ArchitecturePipeline steps={project.architecture} /> }
      : null,
    project.concepts.length > 0
      ? { id: "concepts", label: "Key technical concepts", content: <ConceptList items={project.concepts} /> }
      : null,
    project.technologies.length > 0
      ? { id: "stack", label: "Technology stack", content: <TechnologyGrid items={project.technologies} /> }
      : null,
    project.implementation.length > 0
      ? { id: "implementation", label: "Implementation", content: <NumberedList items={project.implementation} /> }
      : null,
    project.features.length > 0
      ? { id: "capabilities", label: "Key capabilities", content: <CapabilityGrid items={project.features} /> }
      : null,
    project.results.length > 0
      ? { id: "outcomes", label: "Outcomes", content: <OutcomeList items={project.results} /> }
      : null,
    project.lessons_learned.length > 0
      ? { id: "lessons", label: "Lessons learned", content: <AccentList items={project.lessons_learned} /> }
      : null,
    project.visual === "uav"
      ? { id: "interactive", label: "Interactive visualisation", content: <InteractiveLab githubUrl={github} /> }
      : null,
    github || demo
      ? {
          id: "source",
          label: github && demo ? "Source & demo" : github ? "Source code" : "Live demo",
          content: <SourceLinks github={github} demo={demo} />,
        }
      : null,
  ];
  return sections.filter((section): section is CaseStudySection => section !== null);
}
