import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Hero } from "@/sections/Hero";
import { portfolioFixture, profileFixture } from "@/test/fixtures";
import type { Portfolio } from "@/types/api";

/** Emulate `prefers-reduced-motion: reduce` for the duration of a test (restored by setup.ts). */
function preferReducedMotion(): void {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

function renderHero(portfolio: Portfolio = portfolioFixture()) {
  return render(
    <MemoryRouter>
      <Hero portfolio={portfolio} />
    </MemoryRouter>,
  );
}

describe("Hero", () => {
  it("shows the name as the page heading and the headline", () => {
    renderHero();
    expect(screen.getByRole("heading", { level: 1, name: profileFixture.full_name })).toBeInTheDocument();
    expect(screen.getByText(profileFixture.headline)).toBeInTheDocument();
    expect(screen.getByText(profileFixture.tagline)).toBeInTheDocument();
  });

  it("offers the two calls to action and no CV download", () => {
    renderHero();
    expect(screen.getByRole("link", { name: /view my work/i })).toHaveAttribute("href", "/#projects");
    expect(screen.getByRole("link", { name: /get in touch/i })).toHaveAttribute("href", "/#contact");
    expect(screen.queryByRole("link", { name: /\bcv\b/i })).not.toBeInTheDocument();
  });

  it("links to email, GitHub and LinkedIn", () => {
    renderHero();
    expect(screen.getByRole("link", { name: `Email ${profileFixture.email}` })).toHaveAttribute(
      "href",
      `mailto:${profileFixture.email}`,
    );
    const github = screen.getByRole("link", { name: "GitHub profile" });
    expect(github).toHaveAttribute("href", profileFixture.github_url);
    expect(github).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "LinkedIn profile" })).toHaveAttribute("href", profileFixture.linkedin_url);
  });

  it("hides social links that are not set", () => {
    renderHero(portfolioFixture({ github_url: null, linkedin_url: null }));
    expect(screen.queryByRole("link", { name: "GitHub profile" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "LinkedIn profile" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Email ${profileFixture.email}` })).toBeInTheDocument();
  });

  it("never displays a phone number, even when the API sends one", () => {
    const { container } = renderHero(portfolioFixture({ phone: "+212 600 000 000" }));
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(screen.queryByText(/\+212 600 000 000/)).not.toBeInTheDocument();
  });

  it("shows key figures computed from the data", () => {
    renderHero();
    const figures = screen.getByLabelText("Key figures");
    expect(within(figures).getByText("AI & data projects")).toBeInTheDocument();
    // The accessible value is exact; the visible one counts up from 0.
    expect(within(figures).getAllByText("8").length).toBeGreaterThan(0);
  });

  it("shows the location with the mobility highlight (country only, no city)", () => {
    renderHero();
    expect(screen.getByText("Morocco · Mobile across Morocco & open to relocation")).toBeInTheDocument();
    expect(screen.queryByText(/Nador/)).not.toBeInTheDocument();
  });

  it("rotates the roles visually while screen readers get the full headline", () => {
    const { container } = renderHero();
    expect(screen.getByText(profileFixture.headline)).toHaveClass("sr-only");
    const words = container.querySelectorAll(".rotator > span");
    expect([...words].map((word) => word.textContent)).toEqual(["Scientist", "Engineer", "Analyst"]);
    expect(container.querySelector('.rotator > [data-state="active"]')).toHaveTextContent("Scientist");
  });

  it("shows every role statically under reduced motion", () => {
    preferReducedMotion();
    const { container } = renderHero();
    expect(container.querySelector(".rotator")).toBeNull();
    for (const role of ["Data Scientist", "Data Engineer", "Data Analyst"]) {
      expect(screen.getByText(role)).toBeInTheDocument();
    }
    // Count-up is skipped: the visible figure is the final value right away.
    const figures = screen.getByLabelText("Key figures");
    expect(within(figures).getAllByText("8")).toHaveLength(2);
  });

  it("shows the portrait as-is with the Master's credential card", () => {
    renderHero();
    const photo = screen.getByRole("img", { name: `Portrait of ${profileFixture.full_name}` });
    expect(photo).toHaveAttribute("src", profileFixture.photo_url);
    expect(photo.getAttribute("style")).toBeNull();
    expect(screen.getByText("Data Science & Intelligent Systems")).toBeInTheDocument();
  });
});
