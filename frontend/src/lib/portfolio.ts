import { PROJECT_DOMAINS, type Education, type Portfolio, type ProjectSummary, type SkillCategory } from "@/types/api";

/**
 * Pure helpers that derive presentation data from the API payload.
 * Nothing here invents content: every value is computed from the portfolio data.
 */

/** Featured projects first, then by display order (stable for equal keys). */
export function sortProjects<T extends ProjectSummary>(projects: readonly T[]): T[] {
  return [...projects].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || a.display_order - b.display_order,
  );
}

export interface DomainCount {
  name: string;
  count: number;
}

/** Previous / next project in the same order as the home page (featured first). */
export function findNeighbours<T extends ProjectSummary>(
  projects: readonly T[],
  slug: string,
): { previous: T | null; next: T | null } {
  const ordered = sortProjects(projects);
  const index = ordered.findIndex((project) => project.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null };
}

/** Unique project domains (case-insensitive), in order of first appearance, with project counts. */
export function collectDomains(projects: readonly ProjectSummary[]): DomainCount[] {
  const domains = new Map<string, DomainCount>();
  for (const project of projects) {
    for (const domain of new Set(project.domains.map((name) => name.trim()).filter(Boolean))) {
      const key = domain.toLowerCase();
      const existing = domains.get(key);
      if (existing) existing.count += 1;
      else domains.set(key, { name: domain, count: 1 });
    }
  }
  return [...domains.values()];
}

/**
 * Filter chips of the Projects section: the fixed taxonomy (PROJECT_DOMAINS, canonical
 * spelling and order) with their project counts, empty domains hidden, then any domain
 * found in the data but unknown to the taxonomy, in order of first appearance.
 */
export function buildDomainFilters(projects: readonly ProjectSummary[]): DomainCount[] {
  const found = new Map(collectDomains(projects).map((domain) => [domain.name.toLowerCase(), domain]));
  const known = PROJECT_DOMAINS.flatMap((name) => {
    const match = found.get(name.toLowerCase());
    return match ? [{ name, count: match.count }] : [];
  });
  const taxonomy = new Set<string>(PROJECT_DOMAINS.map((name) => name.toLowerCase()));
  const unknown = [...found.values()].filter((domain) => !taxonomy.has(domain.name.toLowerCase()));
  return [...known, ...unknown];
}

/** The flagship project: the featured project with the lowest display order (`null` when none is featured). */
export function findSpotlightProject<T extends ProjectSummary>(projects: readonly T[]): T | null {
  return projects.reduce<T | null>(
    (best, project) => (project.featured && (!best || project.display_order < best.display_order) ? project : best),
    null,
  );
}

/** Projects that list `domain` (case-insensitive); `null` keeps every project. */
export function filterProjectsByDomain<T extends ProjectSummary>(projects: readonly T[], domain: string | null): T[] {
  if (!domain) return [...projects];
  const wanted = domain.toLowerCase();
  return projects.filter((project) => project.domains.some((d) => d.toLowerCase() === wanted));
}

/** Number of distinct skill names across all categories (a skill listed twice counts once). */
export function countDistinctSkills(categories: readonly SkillCategory[]): number {
  return new Set(categories.flatMap((category) => category.skills.map((skill) => skill.name.trim().toLowerCase())))
    .size;
}

export interface SkillFilter {
  /** Category slug, or `null` for every category. */
  category: string | null;
  /** Free-text search on skill names, category names and domains of use. */
  query: string;
}

/**
 * Narrow categories with the category chip and the search box.
 * A query matching a category's name or description keeps all its skills;
 * otherwise only the matching skills are kept and empty categories are dropped.
 */
export function filterSkillCategories(categories: readonly SkillCategory[], filter: SkillFilter): SkillCategory[] {
  const query = filter.query.trim().toLowerCase();
  return categories
    .filter((category) => filter.category === null || category.slug === filter.category)
    .map((category) => {
      if (!query) return category;
      const categoryMatches =
        category.name.toLowerCase().includes(query) || (category.description ?? "").toLowerCase().includes(query);
      if (categoryMatches) return category;
      return { ...category, skills: category.skills.filter((skill) => skill.name.toLowerCase().includes(query)) };
    })
    .filter((category) => category.skills.length > 0);
}

/** The Master's degree entry, if any (first by display order). */
export function findMastersDegree(education: readonly Education[]): Education | null {
  return (
    [...education].sort((a, b) => a.display_order - b.display_order).find((entry) => /^master/i.test(entry.degree)) ??
    null
  );
}

/** "Master's Degree — Data Science & Intelligent Systems" → { level: "Master's Degree", field: "Data Science & …" }. */
export function splitDegreeTitle(degree: string): { level: string; field: string | null } {
  const [level, ...rest] = degree.split(/\s+[—–-]\s+/);
  const field = rest.join(" — ").trim();
  return { level: level.trim(), field: field || null };
}

/** "Data Scientist | Data Engineer | Data Analyst" → ["Data Scientist", "Data Engineer", "Data Analyst"]. */
export function splitHeadline(headline: string): string[] {
  return headline
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** True when the mobility statement mentions relocation. */
export function isOpenToRelocation(mobility: string): boolean {
  return /relocat/i.test(mobility);
}

/**
 * Short mobility label derived from the mobility statement (never invented):
 * "Mobile across Morocco and open to international relocation — …" → "Mobile across Morocco & open to relocation".
 * Returns "" when the statement mentions neither nationwide mobility nor relocation.
 */
export function mobilityHighlight(mobility: string | null | undefined): string {
  if (!mobility) return "";
  const across = /\bmobile across\s+(.+?)(?=\s+(?:and|&)\b|[,.;:—–(]|$)/i.exec(mobility);
  const parts = [
    across ? `Mobile across ${across[1].trim()}` : null,
    isOpenToRelocation(mobility) ? (across ? "open to relocation" : "Open to relocation") : null,
  ].filter((part): part is string => Boolean(part));
  return parts.join(" & ");
}

/** "Morocco · Mobile across Morocco & open to relocation" (location + mobility highlight, empty parts dropped). */
export function locationLine(location: string | null | undefined, mobility: string | null | undefined): string {
  return [location?.trim(), mobilityHighlight(mobility)].filter(Boolean).join(" · ");
}

/**
 * Split roles sharing a first word: ["Data Scientist", "Data Engineer"] →
 * { prefix: "Data", variants: ["Scientist", "Engineer"] }. Without a shared word the prefix is "".
 */
export function splitRolePrefix(roles: readonly string[]): { prefix: string; variants: string[] } {
  const words = roles.map((role) => role.trim().split(/\s+/));
  const first = words[0]?.[0];
  const shared =
    roles.length > 1 && first !== undefined && words.every((parts) => parts.length > 1 && parts[0] === first);
  return shared
    ? { prefix: first, variants: words.map((parts) => parts.slice(1).join(" ")) }
    : { prefix: "", variants: roles.map((role) => role.trim()) };
}

/** "Youssra Boubakri" → "YB". */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Every technology named anywhere in the portfolio (skills, capability tools, project stacks),
 * lower-cased. Used to make sure UI illustrations only mention tools from her own stack.
 */
export function collectKnownTechnologies(portfolio: Portfolio): Set<string> {
  const names = [
    ...portfolio.skills.flatMap((category) => category.skills.map((skill) => skill.name)),
    ...portfolio.profile.capabilities.flatMap((capability) => capability.tools),
    ...portfolio.projects.flatMap((project) => project.technologies),
  ];
  return new Set(names.map((name) => name.trim().toLowerCase()));
}

export interface Stat {
  key: string;
  /** Numbers animate (count-up); strings are shown as-is. */
  value: number | string;
  label: string;
}

/** Hero stats strip — computed from the API payload only; empty facts are omitted. */
export function buildStats(portfolio: Portfolio): Stat[] {
  const stats: Stat[] = [];
  const { projects, experience, skills, profile, education } = portfolio;

  if (projects.length > 0) stats.push({ key: "projects", value: projects.length, label: "AI & data projects" });

  if (experience.length > 0) {
    const internships = experience.filter((item) => /intern/i.test(item.employment_type)).length;
    stats.push(
      internships === experience.length
        ? { key: "experience", value: internships, label: internships === 1 ? "Internship" : "Internships" }
        : { key: "experience", value: experience.length, label: "Professional experiences" },
    );
  }

  const skillCount = countDistinctSkills(skills);
  if (skillCount > 0) stats.push({ key: "skills", value: skillCount, label: "Technical skills" });

  if (profile.languages.length > 0) {
    stats.push({ key: "languages", value: profile.languages.length, label: "Languages" });
  }

  const masters = findMastersDegree(education);
  if (masters) {
    const label =
      masters.status === "completed"
        ? masters.end_year
          ? `Graduated ${masters.end_year}`
          : "Graduated"
        : "In progress";
    stats.push({ key: "masters", value: "Master's", label });
  }
  return stats;
}

/**
 * "Agent 1 — Data Collection & Cleaning" → { kicker: "Agent 1", title: "Data Collection & Cleaning" }.
 * Only a short leading label (≤ 20 characters) becomes a kicker; other labels are kept whole.
 */
export function splitStepLabel(label: string): { kicker: string | null; title: string } {
  const match = /^(.{1,20}?)\s+[—–]\s+(.+)$/.exec(label.trim());
  return match ? { kicker: match[1], title: match[2] } : { kicker: null, title: label.trim() };
}

/** Zero-padded ordinal used in eyebrows and step numbers ("01"). */
export function ordinal(index: number): string {
  return String(index).padStart(2, "0");
}
