import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectDetailPage from "@/pages/ProjectDetailPage";
import { portfolioFixture, projectFixture } from "@/test/fixtures";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Minimal API: the aggregate + each project by slug; anything else is a 404. */
function mockApi() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url === "/api/portfolio") return jsonResponse(200, portfolioFixture());
    const match = /^\/api\/projects\/(.+)$/.exec(url);
    if (match) {
      try {
        return jsonResponse(200, projectFixture(decodeURIComponent(match[1])));
      } catch {
        return jsonResponse(404, { detail: "Project not found", code: "not_found" });
      }
    }
    return jsonResponse(404, { detail: "Not found", code: "not_found" });
  });
}

function renderPage(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/projects/${slug}`]}>
      <Routes>
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function sectionHeadings(): string[] {
  const article = screen.getByRole("article");
  return within(article)
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent ?? "");
}

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    mockApi();
  });

  it("renders only the sections that have data and the key concepts", async () => {
    const project = projectFixture("automatic-document-translation");
    renderPage(project.slug);

    expect(await screen.findByRole("heading", { level: 1, name: project.title })).toBeInTheDocument();
    expect(sectionHeadings()).toEqual([
      "Overview",
      "The challenge",
      "Approach",
      "Architecture",
      "Key technical concepts",
      "Technology stack",
      "Implementation",
      "Key capabilities",
    ]);
    const concepts = screen.getByRole("region", { name: "Key technical concepts" });
    project.concepts.forEach((concept) => expect(within(concepts).getByText(concept)).toBeInTheDocument());
  });

  it("hides an unknown period and offers the source code on request", async () => {
    const project = projectFixture("breast-cancer-classification");
    renderPage(project.slug);

    await screen.findByRole("heading", { level: 1, name: project.title });
    expect(screen.queryByText("Period")).not.toBeInTheDocument();
    expect(screen.getByText("Source code available on request.")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /request by email/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:youssrabkr2002@gmail\.com\?subject=/),
    );
    expect(screen.queryByRole("link", { name: /github/i })).not.toBeInTheDocument();
  });

  it("shows the GitHub button and the interactive lab when available", async () => {
    const project = projectFixture("tsp-uav-optimization");
    renderPage(project.slug);

    const title = await screen.findByRole("heading", { level: 1, name: project.title });
    const header = title.closest("header");
    if (!header) throw new Error("project header not found");
    expect(within(header).getByRole("link", { name: /view on github/i })).toHaveAttribute("href", project.github_url);
    expect(screen.queryByText("Source code available on request.")).not.toBeInTheDocument();
    expect(sectionHeadings()).toContain("Interactive visualisation");
    expect(sectionHeadings()).toContain("Source code");
    // The lab is a lazy chunk.
    expect(await screen.findByRole("tablist", { name: "Algorithm" }, { timeout: 15_000 })).toBeInTheDocument();
  }, 20_000);

  it("does not render the lab for other projects", async () => {
    const project = projectFixture("ai-technology-watch-system");
    renderPage(project.slug);

    await screen.findByRole("heading", { level: 1, name: project.title });
    expect(screen.getByText(project.period_label ?? "")).toBeInTheDocument();
    expect(sectionHeadings()).not.toContain("Interactive visualisation");
    expect(sectionHeadings()).toContain("Outcomes");
    const outcomes = screen.getByRole("region", { name: "Outcomes" });
    project.results.forEach((result) => expect(within(outcomes).getByText(result)).toBeInTheDocument());
  });

  it("wraps long architecture labels into a kicker and a title", async () => {
    renderPage("ai-technology-watch-system");
    const pipeline = await screen.findByRole("list", { name: "Architecture pipeline" });
    expect(within(pipeline).getByText("Data Collection & Cleaning")).toBeInTheDocument();
    expect(within(pipeline).getAllByText("Agent 1")[0]).toBeInTheDocument();
  });

  it("shows the not-found state for an unknown project on a light panel", async () => {
    renderPage("does-not-exist");
    const heading = await screen.findByRole("heading", { level: 1, name: "Project not found" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse all projects/i })).toHaveAttribute("href", "/#projects");
    expect(heading.closest("section")?.className).not.toMatch(/navy/);
  });

  it("uses light surfaces only (no navy / dark backgrounds)", async () => {
    const project = projectFixture("tsp-uav-optimization");
    const { container } = renderPage(project.slug);
    await screen.findByRole("heading", { level: 1, name: project.title });
    await screen.findByRole("tablist", { name: "Algorithm" }, { timeout: 15_000 });
    const dark = [...container.querySelectorAll("[class]")]
      .flatMap((node) => (node.getAttribute("class") ?? "").split(/\s+/))
      .filter((name) => /(^|:)(bg-(navy|black)|fill-navy|from-navy|to-navy)/.test(name));
    expect(dark).toEqual([]);
    // Sanity check: the pattern does flag a navy surface.
    expect(/(^|:)(bg-(navy|black)|fill-navy|from-navy|to-navy)/.test("bg-navy-900")).toBe(true);
    expect(container.querySelector('[data-tone="navy"]')).toBeNull();
  }, 20_000);

  it("offers a sticky section navigation and prev / next projects", async () => {
    const project = projectFixture("breast-cancer-classification");
    renderPage(project.slug);
    await screen.findByRole("heading", { level: 1, name: project.title });
    const nav = screen.getByRole("navigation", { name: "On this page" });
    expect(within(nav).getByRole("link", { name: "Overview" })).toHaveAttribute("href", "#overview");
    const pager = await screen.findByRole("navigation", { name: "More projects" });
    expect(await within(pager).findByRole("link", { name: /Previous project/ })).toHaveAttribute(
      "href",
      "/projects/automatic-document-translation",
    );
    expect(within(pager).getByRole("link", { name: /Next project/ })).toHaveAttribute(
      "href",
      "/projects/tsp-uav-optimization",
    );
  });
});
