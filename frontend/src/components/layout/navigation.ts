import { SECTION, type SectionId } from "@/lib/site";

export interface NavItem {
  id: SectionId;
  label: string;
}

/** Primary navigation (docs/SPEC.md §3.3). */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: SECTION.home, label: "Home" },
  { id: SECTION.about, label: "About" },
  { id: SECTION.experience, label: "Experience" },
  { id: SECTION.education, label: "Education" },
  { id: SECTION.skills, label: "Skills" },
  { id: SECTION.projects, label: "Projects" },
  { id: SECTION.architecture, label: "Architecture" },
  { id: SECTION.contact, label: "Contact" },
];

/** Every home-page section, in document order, observed for the active nav state. */
export const HOME_SECTION_IDS: readonly string[] = Object.values(SECTION);

/** Sections that belong to another nav item's group. */
const NAV_GROUP: Partial<Record<string, SectionId>> = {
  [SECTION.snapshot]: SECTION.about,
  [SECTION.capabilities]: SECTION.skills,
};

/** Nav item highlighted for the section currently in view. */
export function navIdForSection(sectionId: string): string {
  return NAV_GROUP[sectionId] ?? sectionId;
}
