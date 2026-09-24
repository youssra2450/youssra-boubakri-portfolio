import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { sortProjects } from "@/lib/portfolio";
import { portfolioFixture, profileFixture, projectsFixture } from "@/test/fixtures";

function mockPortfolioApi(): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify(portfolioFixture({ phone: "+212 600 000 000" })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter initialEntries={["/"]}>{ui}</MemoryRouter>);
}

describe("Navbar (Header v4)", () => {
  beforeEach(mockPortfolioApi);

  it("links every home section and offers a contact call to action (no CV)", () => {
    renderWithRouter(<Navbar />);
    const primary = screen.getByRole("navigation", { name: "Primary" });
    const labels = within(primary)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual(["Home", "About", "Experience", "Education", "Skills", "Projects", "Architecture", "Contact"]);
    expect(within(primary).getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/#projects");
    expect(screen.getByRole("link", { name: /get in touch/i })).toHaveAttribute("href", "/#contact");
    expect(screen.queryByRole("link", { name: /\bcv\b/i })).not.toBeInTheDocument();
  });

  it("shows the GitHub and LinkedIn icon buttons from the API profile", async () => {
    renderWithRouter(<Navbar />);
    const github = await screen.findByRole("link", { name: "GitHub profile" });
    expect(github).toHaveAttribute("href", profileFixture.github_url);
    expect(github).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "LinkedIn profile" })).toHaveAttribute("href", profileFixture.linkedin_url);
  });

  it("opens the full-screen menu and closes it with Escape", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Navbar />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    const dialog = screen.getByRole("dialog", { name: "Site menu" });
    expect(within(dialog).getAllByRole("link", { name: /^(Home|About|Experience|Education|Skills|Projects|Architecture|Contact)$/ })).toHaveLength(8);
    expect(within(dialog).getByRole("link", { name: /get in touch/i })).toHaveAttribute("href", "/#contact");
    expect(document.documentElement.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Site menu" })).not.toBeInTheDocument();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("renders the scroll-progress bar", () => {
    const { container } = renderWithRouter(<Navbar />);
    expect(container.querySelector(".scroll-progress")).toBeInTheDocument();
  });
});

describe("Footer (Footer v4)", () => {
  beforeEach(mockPortfolioApi);

  it("shows the availability pill built from the mobility statement", async () => {
    renderWithRouter(<Footer />);
    expect(
      await screen.findByText("Open to opportunities · Mobile across Morocco & open to relocation"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get in touch/i })).toHaveAttribute("href", "/#contact");
  });

  it("lists the first four projects in portfolio order", async () => {
    renderWithRouter(<Footer />);
    const nav = await screen.findByRole("navigation", { name: "Selected projects" });
    const expected = sortProjects(projectsFixture).slice(0, 4);
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(4);
    links.forEach((link, index) => {
      expect(link).toHaveTextContent(expected[index].title);
      expect(link).toHaveAttribute("href", `/projects/${expected[index].slug}`);
    });
  });

  it("offers email, LinkedIn and GitHub — never a phone number or a CV", async () => {
    const { container } = renderWithRouter(<Footer />);
    const connect = await screen.findByRole("navigation", { name: "Connect" });
    expect(within(connect).getByRole("link", { name: "Email" })).toHaveAttribute("href", `mailto:${profileFixture.email}`);
    expect(within(connect).getByRole("link", { name: /linkedin/i })).toHaveAttribute("href", profileFixture.linkedin_url);
    expect(within(connect).getByRole("link", { name: /github/i })).toHaveAttribute("href", profileFixture.github_url);
    expect(container.querySelector('a[href*="/cv"]')).toBeNull();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(screen.queryByText(/600 000 000/)).not.toBeInTheDocument();
  });

  it("has the bottom bar with copyright, stack, API docs and back to top", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo");
    const user = userEvent.setup();
    renderWithRouter(<Footer />);
    await waitFor(() =>
      expect(
        screen.getByText(`© ${new Date().getFullYear()} ${profileFixture.full_name}. All rights reserved.`),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Built with React, TypeScript, FastAPI & PostgreSQL")).toBeInTheDocument();
    const docs = screen.getByRole("link", { name: /api documentation/i });
    expect(docs).toHaveAttribute("href", "/api/docs");
    expect(docs).toHaveAttribute("target", "_blank");

    await user.click(screen.getByRole("button", { name: /back to top/i }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it("shows the location as the country only", async () => {
    renderWithRouter(<Footer />);
    expect(await screen.findByText(profileFixture.location)).toBeInTheDocument();
    expect(screen.queryByText(/Nador/)).not.toBeInTheDocument();
  });
});
