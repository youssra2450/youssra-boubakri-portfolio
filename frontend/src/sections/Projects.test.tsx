import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { Projects } from "@/sections/Projects";
import { projectsFixture } from "@/test/fixtures";
import type { ProjectSummary } from "@/types/api";

function renderProjects(projects: readonly ProjectSummary[] = projectsFixture) {
  return render(
    <MemoryRouter>
      <Projects projects={projects} />
    </MemoryRouter>,
  );
}

function filterButtons() {
  return within(screen.getByRole("group", { name: "Filter projects by domain" })).getAllByRole("button");
}

function cards() {
  return screen.getAllByRole("article");
}

describe("Projects", () => {
  it("shows the heading and a lead naming the covered domains", () => {
    renderProjects();
    expect(screen.getByRole("heading", { level: 2, name: "Featured projects" })).toBeInTheDocument();
    expect(screen.getByText(/Data Science, Data Engineering, Machine Learning, NLP, LLMs, Computer Vision and Optimization/))
      .toBeInTheDocument();
  });

  it("lists All + the taxonomy filters with their project counts", () => {
    renderProjects();
    const labels = filterButtons().map((button) => button.textContent);
    expect(labels).toEqual([
      "All8(8 projects)",
      "Data Science3(3 projects)",
      "AI/ML7(7 projects)",
      "NLP3(3 projects)",
      "LLM1(1 project)",
      "Computer Vision2(2 projects)",
      "Optimization1(1 project)",
    ]);
    expect(screen.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("hides empty domains", () => {
    renderProjects(projectsFixture.filter((project) => project.slug === "tsp-uav-optimization"));
    expect(filterButtons().map((button) => button.textContent?.replace(/\d.*$/, ""))).toEqual(["All", "Optimization"]);
  });

  it("filters the grid by domain and toggles back to All", async () => {
    const user = userEvent.setup();
    renderProjects();
    expect(cards()).toHaveLength(8);

    const nlp = screen.getByRole("button", { name: /^NLP/ });
    await user.click(nlp);
    expect(nlp).toHaveAttribute("aria-pressed", "true");
    expect(cards()).toHaveLength(3);
    expect(screen.getByText("3 projects shown")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Optimization/ }));
    expect(cards()).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("TSP-UAV Optimization");

    await user.click(screen.getByRole("button", { name: /^Optimization/ }));
    expect(cards()).toHaveLength(8);
  });

  it("shows the flagship spotlight card only in the All view", async () => {
    const user = userEvent.setup();
    const { container } = renderProjects();
    const spotlight = container.querySelectorAll('[data-variant="spotlight"]');
    expect(spotlight).toHaveLength(1);
    expect(spotlight[0]).toHaveTextContent(/Multi-Agent System/);
    expect(within(spotlight[0] as HTMLElement).getByText("Flagship project")).toBeInTheDocument();
    // It opens the grid.
    expect(cards()[0]).toBe(spotlight[0]);

    await user.click(screen.getByRole("button", { name: /^LLM/ }));
    expect(cards()).toHaveLength(1);
    expect(container.querySelector('[data-variant="spotlight"]')).toBeNull();
  });

  it("renders a GitHub button only for projects with a repository", () => {
    renderProjects();
    const withRepository = projectsFixture.filter((project) => project.github_url);
    const buttons = screen.getAllByRole("link", { name: /^GitHub repository of/ });
    expect(buttons).toHaveLength(withRepository.length);
    buttons.forEach((button) => {
      expect(withRepository.map((project) => project.github_url)).toContain(button.getAttribute("href"));
      expect(button).toHaveAttribute("rel", "noopener noreferrer");
    });
    const document = screen.getByRole("article", { name: /Automatic Document Translation/ });
    expect(within(document).queryByRole("link", { name: /GitHub/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Demo/ })).not.toBeInTheDocument();
  });

  it("follows the card anatomy: concepts ≤ 4, technologies ≤ 5 + n, details link", () => {
    renderProjects();
    const card = screen.getByRole("article", { name: /Multi-Agent System/ });
    expect(within(card).getByRole("list", { name: "Key concepts" }).children).toHaveLength(4);
    const technologies = within(card).getByRole("list", { name: "Technologies" });
    expect(technologies.children).toHaveLength(6);
    expect(within(technologies).getByText("+9")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /^View details/ })).toHaveAttribute(
      "href",
      "/projects/ai-technology-watch-system",
    );
    expect(within(card).getByText("Master SDSI project · 2025–2026")).toBeInTheDocument();
  });

  it("lists the taxonomy domains on the flagship cover only", () => {
    renderProjects();
    const card = screen.getByRole("article", { name: /Multi-Agent System/ });
    const domains = within(card).getByRole("list", { name: "Domains" });
    const expected = projectsFixture.find((project) => project.slug === "ai-technology-watch-system")?.domains ?? [];
    expect(within(domains).getAllByRole("listitem").map((item) => item.textContent)).toEqual(expected.slice(0, 3));
    expect(screen.getAllByRole("list", { name: "Domains" })).toHaveLength(1);
  });

  it("reveals the grid once, plays the cover intro on first view only and re-enters after a filter change", async () => {
    const user = userEvent.setup();
    const { container } = renderProjects();
    const grid = () => container.querySelector(".projects-grid");
    expect(grid()).toHaveAttribute("data-revealed", "true");
    expect(grid()).toHaveAttribute("data-filtered", "false");
    expect(container.querySelectorAll('[data-intro="play"]')).toHaveLength(8);

    await user.click(screen.getByRole("button", { name: /^Data Science/ }));
    expect(grid()).toHaveAttribute("data-filtered", "true");
    expect(container.querySelectorAll('[data-intro="play"]')).toHaveLength(0);
    expect(cards()).toHaveLength(3);
  });

  it("links each cover to its case study without adding a tab stop", () => {
    const { container } = renderProjects();
    const coverLinks = container.querySelectorAll('a[aria-hidden="true"][tabindex="-1"]');
    expect(coverLinks).toHaveLength(8);
    expect(coverLinks[0]).toHaveAttribute("href", "/projects/ai-technology-watch-system");
  });

  it("omits the context · period line when both are empty", () => {
    renderProjects();
    const card = screen.getByRole("article", { name: /Automatic Document Translation/ });
    expect(card.querySelector("[data-project-meta]")).toBeNull();
    expect(card).not.toHaveTextContent("null");
    const withMeta = screen.getByRole("article", { name: /Visual Content Moderation/ });
    expect(withMeta.querySelector("[data-project-meta]")).toHaveTextContent("Computer Vision project · 2024");
  });
});
