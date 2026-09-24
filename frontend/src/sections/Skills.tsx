import {
  Brain,
  ChartColumn,
  ChartPie,
  CodeXml,
  Database,
  Kanban,
  Layers,
  List,
  MessageSquare,
  Search,
  SearchX,
  Server,
  Shapes,
  Table2,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Chip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { staggerIndex } from "@/lib/motion";
import { countDistinctSkills, filterSkillCategories } from "@/lib/portfolio";
import { SECTION } from "@/lib/site";
import type { Skill, SkillCategory } from "@/types/api";

/** `skill_categories.icon` (kebab-case names) → lucide icon; unknown names fall back to Layers. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "bar-chart": ChartColumn,
  brain: Brain,
  "message-square": MessageSquare,
  server: Server,
  code: CodeXml,
  "pie-chart": ChartPie,
  database: Database,
  shapes: Shapes,
  wrench: Wrench,
  kanban: Kanban,
};

function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Layers;
  return <Icon aria-hidden="true" className={className} />;
}

type View = "list" | "matrix";

interface SkillsProps {
  categories: readonly SkillCategory[];
}

/** #skills — category chips + search, rendered as cards (List) or a compact matrix (desktop). */
export function Skills({ categories }: SkillsProps) {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("list");
  const searchId = useId();

  const ordered = useMemo(() => [...categories].sort((a, b) => a.display_order - b.display_order), [categories]);
  const visible = useMemo(() => filterSkillCategories(ordered, { category, query }), [ordered, category, query]);
  // Distinct names, so the total matches the hero stats strip (a tool listed in two categories counts once).
  const skillCount = countDistinctSkills(visible);

  if (ordered.length === 0) return null;

  const resetFilters = () => {
    setCategory(null);
    setQuery("");
  };

  return (
    <Section id={SECTION.skills} tone="sky">
      <Container>
        <SectionHeading
          sectionId={SECTION.skills}
          index="05"
          eyebrow="Skills"
          title="Technical expertise"
          lead="A hands-on toolkit spanning analytics, machine learning, data engineering and applied AI — filter by domain or search for a specific technology."
        />

        <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <label htmlFor={searchId} className="sr-only">
              Search skills
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-600"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a skill, e.g. Spark"
              autoComplete="off"
              className="h-11 w-full rounded-full border border-line bg-white pr-11 pl-11 text-[15px] text-ink shadow-[0_1px_2px_rgb(19_34_63/0.05)] transition-[border-color,box-shadow] placeholder:text-slate-600/80 hover:border-accent/30 focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-600 hover:bg-sky-100 hover:text-ink"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>

          <div role="group" aria-label="Display" className="hidden items-center gap-1 rounded-full border border-line bg-white p-1 shadow-[0_1px_2px_rgb(19_34_63/0.05)] md:flex">
            <ViewButton active={view === "list"} onClick={() => setView("list")} icon={List} label="List" />
            <ViewButton active={view === "matrix"} onClick={() => setView("matrix")} icon={Table2} label="Matrix" />
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter by category"
          className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          <FilterChip active={category === null} onClick={() => setCategory(null)}>
            All
          </FilterChip>
          {ordered.map((item) => (
            <FilterChip
              key={item.slug}
              active={category === item.slug}
              onClick={() => setCategory(category === item.slug ? null : item.slug)}
            >
              {item.name}
            </FilterChip>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p aria-live="polite">
            {visible.length} {visible.length === 1 ? "category" : "categories"} · {skillCount}{" "}
            {skillCount === 1 ? "skill" : "skills"}
          </p>
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block size-2.5 rounded-full border border-accent bg-accent-tint" />
            Core skill
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-card border border-dashed border-accent/30 bg-white/70 px-6 py-14 text-center">
            <SearchX aria-hidden="true" className="size-8 text-accent-soft" />
            <p className="mt-4 font-display text-lg font-semibold">No skill matches “{query.trim()}”</p>
            <p className="mt-1 text-slate-600">Refine the search term or reset the filters to see the full toolkit.</p>
            <Button variant="secondary" size="sm" className="mt-6" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        ) : (
          <>
            <ul className={cn("mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3", view === "matrix" && "md:hidden")}>
              {visible.map((item, index) => (
                <Reveal as="li" key={item.slug} delay={(index % 3) * 80}>
                  <CategoryCard category={item} />
                </Reveal>
              ))}
            </ul>
            {view === "matrix" && <SkillMatrix categories={visible} />}
          </>
        )}
      </Container>
    </Section>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: string;
}

function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-200 pointer-coarse:min-h-11",
        active
          ? "border-accent bg-accent text-white shadow-accent"
          : "border-line bg-white text-slate-600 hover:border-accent/35 hover:text-accent-strong",
      )}
    >
      {children}
    </button>
  );
}

interface ViewButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

function ViewButton({ active, onClick, icon: Icon, label }: ViewButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors duration-200",
        active ? "bg-accent-tint text-accent-strong" : "text-slate-600 hover:text-ink",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

function SkillChip({ skill }: { skill: Skill }) {
  return (
    <Chip variant={skill.is_core ? "core" : "default"}>
      {skill.name}
      {skill.is_core && <span className="sr-only"> (core skill)</span>}
      {skill.proficiency && (
        <span className="rounded-full bg-white/80 px-1.5 text-[10px] tracking-wider text-accent-strong uppercase">
          {skill.proficiency}
        </span>
      )}
    </Chip>
  );
}

function CategoryCard({ category }: { category: SkillCategory }) {
  return (
    <Card interactive spotlight className="flex h-full flex-col p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent-tint text-accent-strong">
          <CategoryIcon name={category.icon} className="size-5" />
        </span>
        <h3 className="text-lg leading-snug font-bold">{category.name}</h3>
      </div>
      {category.description && <p className="mt-3 text-sm leading-relaxed text-slate-600">{category.description}</p>}
      <ul aria-label={`${category.name} skills`} className="reveal-children mt-5 flex flex-wrap gap-2">
        {category.skills.map((skill, index) => (
          <li key={skill.id} style={staggerIndex(index)}>
            <SkillChip skill={skill} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Compact "category → technologies → domain of use" table (desktop only). */
function SkillMatrix({ categories }: { categories: readonly SkillCategory[] }) {
  return (
    <Card className="mt-6 hidden overflow-hidden md:block">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Skill categories, their technologies and domain of use</caption>
        <thead className="bg-sky-50">
          <tr className="border-b border-line">
            <th scope="col" className="eyebrow w-[24%] px-6 py-4 font-medium text-slate-600">
              Category
            </th>
            <th scope="col" className="eyebrow px-6 py-4 font-medium text-slate-600">
              Technologies
            </th>
            <th scope="col" className="eyebrow w-[28%] px-6 py-4 font-medium text-slate-600">
              Domain of use
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {categories.map((category) => (
            <tr key={category.slug} className="align-top transition-colors hover:bg-sky-50/70">
              <th scope="row" className="px-6 py-5">
                <span className="flex items-center gap-3">
                  <CategoryIcon name={category.icon} className="size-4 shrink-0 text-accent-strong" />
                  <span className="font-display text-[15px] font-semibold text-ink">{category.name}</span>
                </span>
              </th>
              <td className="px-6 py-5">
                <ul aria-label={`${category.name} skills`} className="flex flex-wrap gap-1.5">
                  {category.skills.map((skill) => (
                    <li key={skill.id}>
                      <SkillChip skill={skill} />
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-6 py-5 text-sm leading-relaxed text-slate-600">{category.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
