import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { Contact } from "@/sections/Contact";
import { profileFixture } from "@/test/fixtures";
import type { Profile } from "@/types/api";

function renderContact(overrides: Partial<Profile> = {}) {
  return render(
    <MemoryRouter>
      <Contact profile={{ ...profileFixture, ...overrides }} />
    </MemoryRouter>,
  );
}

describe("Contact", () => {
  it("renders the heading and the three contact cards", () => {
    renderContact();
    expect(
      screen.getByRole("heading", { level: 2, name: "Let's discuss your next data initiative" }),
    ).toBeInTheDocument();

    const channels = screen.getByRole("list", { name: "Contact channels" });
    const email = within(channels).getByRole("article", { name: "Email" });
    expect(within(email).getByText(profileFixture.email)).toBeInTheDocument();
    expect(within(email).getByRole("link", { name: /send an email/i })).toHaveAttribute(
      "href",
      `mailto:${profileFixture.email}`,
    );

    const linkedin = within(channels).getByRole("article", { name: "LinkedIn" });
    const linkedinLink = within(linkedin).getByRole("link", { name: /view profile/i });
    expect(linkedinLink).toHaveAttribute("href", profileFixture.linkedin_url);
    expect(linkedinLink).toHaveAttribute("target", "_blank");
    expect(linkedinLink).toHaveAttribute("rel", "noopener noreferrer");

    const github = within(channels).getByRole("article", { name: "GitHub" });
    expect(within(github).getByRole("link", { name: /view repositories/i })).toHaveAttribute(
      "href",
      profileFixture.github_url,
    );
  });

  it("shows location, mobility and availability — and no CV link", () => {
    const { container } = renderContact();
    expect(screen.getByText(profileFixture.location)).toBeInTheDocument();
    expect(screen.getByText(profileFixture.mobility)).toBeInTheDocument();
    expect(screen.getByText("Open to opportunities")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /\bcv\b/i })).not.toBeInTheDocument();
    expect(container.querySelector('a[href*="/cv"]')).toBeNull();
  });

  it("hides channels whose value is missing", () => {
    renderContact({ linkedin_url: null, github_url: null });
    const channels = screen.getByRole("list", { name: "Contact channels" });
    expect(within(channels).getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("article", { name: "LinkedIn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "GitHub" })).not.toBeInTheDocument();
  });

  it("copies the email address and confirms it", async () => {
    const user = userEvent.setup();
    renderContact();
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(await navigator.clipboard.readText()).toBe(profileFixture.email);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByText(`Email address ${profileFixture.email} copied to the clipboard.`)).toBeInTheDocument();
  });

  it("does not render the form when email forwarding is not configured", () => {
    renderContact({ contact_form_enabled: false });
    expect(screen.queryByRole("heading", { name: "Send a message" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();
  });

  it("renders the form when email forwarding is configured", () => {
    renderContact({ contact_form_enabled: true });
    expect(screen.getByRole("heading", { name: "Send a message" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    // The channels stay available next to the form.
    expect(screen.getByRole("button", { name: "Copy email address" })).toBeInTheDocument();
  });

  it("never shows a phone number", () => {
    const { container } = renderContact({ phone: "+212 600 000 000", contact_form_enabled: true });
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(screen.queryByText(/600 000 000/)).not.toBeInTheDocument();
  });
});
