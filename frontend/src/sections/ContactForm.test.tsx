import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContactForm } from "@/sections/ContactForm";

const EMAIL = "owner@example.com";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const VALID_VALUES = {
  Name: "Jane Recruiter",
  Email: "jane@company.com",
  Subject: "Data Scientist role",
  Message: "Hello, I would like to discuss an opportunity with you.",
} as const;

async function fill(user: UserEvent, label: string, value: string): Promise<void> {
  await user.click(screen.getByLabelText(label));
  await user.paste(value);
}

async function fillValidForm(user: UserEvent): Promise<void> {
  for (const [label, value] of Object.entries(VALID_VALUES)) await fill(user, label, value);
}

describe("ContactForm", () => {
  it("validates every field on the client before sending", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<ContactForm email={EMAIL} />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Subject is required.")).toBeInTheDocument();
    expect(screen.getByText("Message is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a too short message and an invalid email", async () => {
    const user = userEvent.setup();
    render(<ContactForm email={EMAIL} />);
    await fill(user, "Email", "not-an-email");
    await fill(user, "Message", "Too short");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Message must be at least 20 characters.")).toBeInTheDocument();
  });

  it("sends the trimmed message with anti-bot fields and shows the success panel", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(201, { success: true, message: "Thank you for your message." }));
    const user = userEvent.setup();
    render(<ContactForm email={EMAIL} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("heading", { name: "Message sent" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      name: "Jane Recruiter",
      email: "jane@company.com",
      subject: "Data Scientist role",
      website: "",
    });
    expect(typeof body.elapsed_ms).toBe("number");
  });

  it("maps 422 validation errors onto the fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(422, {
        detail: "Validation error",
        code: "validation_error",
        errors: [{ field: "body.email", message: "The email domain does not accept mail." }],
      }),
    );
    const user = userEvent.setup();
    render(<ContactForm email={EMAIL} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText("The email domain does not accept mail.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/check the highlighted fields/i);
  });

  it("explains when the form is unavailable (503) and offers the email address", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(503, { detail: "Contact form unavailable", code: "contact_unavailable" }),
    );
    const user = userEvent.setup();
    render(<ContactForm email={EMAIL} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Messages can't be sent through this form at the moment.");
    expect(screen.getByRole("link", { name: EMAIL })).toHaveAttribute("href", `mailto:${EMAIL}`);
    // The typed message is kept so the visitor can copy it.
    expect(screen.getByLabelText("Message")).toHaveValue(VALID_VALUES.Message);
  });

  it("reports rate limiting with the retry delay", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Too many requests", code: "rate_limited" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "600" },
      }),
    );
    const user = userEvent.setup();
    render(<ContactForm email={EMAIL} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/try again in about 10 minutes/i);
  });
});
