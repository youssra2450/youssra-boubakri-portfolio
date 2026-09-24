import { describe, expect, it } from "vitest";

import {
  buildDomainFilters,
  findSpotlightProject,
  locationLine,
  mobilityHighlight,
  sortProjects,
  splitRolePrefix,
  splitStepLabel,
} from "@/lib/portfolio";
import { projectsFixture } from "@/test/fixtures";
import type { ProjectSummary } from "@/types/api";

function project(overrides: Partial<ProjectSummary>): ProjectSummary {
  return { ...projectsFixture[0], ...overrides };
}

describe("buildDomainFilters", () => {
  it("follows the fixed taxonomy order with project counts", () => {
    expect(buildDomainFilters(projectsFixture)).toEqual([
      { name: "Data Science", count: 3 },
      { name: "AI/ML", count: 7 },
      { name: "NLP", count: 3 },
      { name: "LLM", count: 1 },
      { name: "Computer Vision", count: 2 },
      { name: "Optimization", count: 1 },
    ]);
  });

  it("hides empty domains and appends unknown ones after the taxonomy", () => {
    const filters = buildDomainFilters([
      project({ slug: "a", domains: ["Robotics", "nlp"] }),
      project({ slug: "b", domains: ["NLP", "Edge AI"] }),
    ]);
    expect(filters).toEqual([
      { name: "NLP", count: 2 },
      { name: "Robotics", count: 1 },
      { name: "Edge AI", count: 1 },
    ]);
  });
});

describe("findSpotlightProject", () => {
  it("returns the featured project with the lowest display order", () => {
    expect(findSpotlightProject(projectsFixture)?.slug).toBe("ai-technology-watch-system");
  });

  it("ignores non-featured projects and returns null when none is featured", () => {
    const projects = [
      project({ slug: "a", featured: false, display_order: 1 }),
      project({ slug: "b", featured: true, display_order: 5 }),
    ];
    expect(findSpotlightProject(projects)?.slug).toBe("b");
    expect(findSpotlightProject([project({ featured: false })])).toBeNull();
  });
});

describe("sortProjects", () => {
  it("puts featured projects first, then orders by display order", () => {
    const order = sortProjects(projectsFixture).map((item) => item.display_order);
    expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("splitStepLabel", () => {
  it("extracts a short leading label as a kicker", () => {
    expect(splitStepLabel("Agent 1 — Data Collection & Cleaning")).toEqual({
      kicker: "Agent 1",
      title: "Data Collection & Cleaning",
    });
  });

  it("keeps labels without a short prefix whole", () => {
    expect(splitStepLabel("Export & Dashboard")).toEqual({ kicker: null, title: "Export & Dashboard" });
    expect(splitStepLabel("A very long architecture step name — with a dash")).toEqual({
      kicker: null,
      title: "A very long architecture step name — with a dash",
    });
  });
});

describe("mobilityHighlight", () => {
  it("summarises nationwide mobility and relocation from the statement", () => {
    expect(
      mobilityHighlight(
        "Mobile across Morocco and open to international relocation — available to travel for full-time positions and internships.",
      ),
    ).toBe("Mobile across Morocco & open to relocation");
  });

  it("keeps only what the statement says and never invents", () => {
    expect(mobilityHighlight("Open to relocation.")).toBe("Open to relocation");
    expect(mobilityHighlight("Mobile across Europe.")).toBe("Mobile across Europe");
    expect(mobilityHighlight("Available for remote work.")).toBe("");
    expect(mobilityHighlight("")).toBe("");
    expect(mobilityHighlight(null)).toBe("");
  });
});

describe("locationLine", () => {
  it("joins the location and the mobility highlight", () => {
    expect(locationLine("Morocco", "Mobile across Morocco and open to international relocation.")).toBe(
      "Morocco · Mobile across Morocco & open to relocation",
    );
  });

  it("drops empty parts", () => {
    expect(locationLine("Morocco", "")).toBe("Morocco");
    expect(locationLine("", "Open to relocation")).toBe("Open to relocation");
  });
});

describe("splitRolePrefix", () => {
  it("factors out a shared first word", () => {
    expect(splitRolePrefix(["Data Scientist", "Data Engineer", "Data Analyst"])).toEqual({
      prefix: "Data",
      variants: ["Scientist", "Engineer", "Analyst"],
    });
  });

  it("keeps full roles when nothing is shared", () => {
    expect(splitRolePrefix(["Data Scientist", "ML Engineer"])).toEqual({
      prefix: "",
      variants: ["Data Scientist", "ML Engineer"],
    });
    expect(splitRolePrefix(["Data Scientist"])).toEqual({ prefix: "", variants: ["Data Scientist"] });
  });
});
