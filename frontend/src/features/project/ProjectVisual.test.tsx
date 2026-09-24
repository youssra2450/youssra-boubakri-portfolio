import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectVisual } from "@/features/project/ProjectVisual";

const KEYS = ["multi-agent", "biometric", "vision", "medical", "document", "uav"] as const;
const LIGHT_TONES = ["sky", "ivory"];

function cover(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>("[data-visual]");
  if (!element) throw new Error("cover not rendered");
  return element;
}

/** Every class used by a cover (the element itself and its SVG descendants). */
function classNames(element: Element): string[] {
  return [element, ...element.querySelectorAll("*")].flatMap((node) =>
    (node.getAttribute("class") ?? "").split(/\s+/).filter(Boolean),
  );
}

describe("ProjectVisual", () => {
  it.each(KEYS)("renders the %s cover as decorative SVG", (key) => {
    const { container } = render(<ProjectVisual visual={key} className="aspect-video" />);
    const element = cover(container);
    expect(element).toHaveAttribute("data-visual", key);
    expect(element).toHaveAttribute("aria-hidden", "true");
    expect(element).toHaveClass("project-visual", "aspect-video");
    expect(element.querySelector("svg")).toHaveAttribute("viewBox", "0 0 320 180");
    expect(element.querySelectorAll("svg *").length).toBeGreaterThan(10);
    expect(element.querySelector("img, image")).toBeNull();
  });

  it.each([...KEYS, null])("uses a light surface and no navy / dark fills for %s", (key) => {
    const { container } = render(<ProjectVisual visual={key} />);
    const element = cover(container);
    expect(LIGHT_TONES).toContain(element.getAttribute("data-tone"));
    expect(classNames(element).filter((name) => /navy|black|white\/|bg-ink/.test(name))).toEqual([]);
  });

  it("alternates sky and ivory surfaces across the identities", () => {
    const tones = KEYS.map((key) => cover(render(<ProjectVisual visual={key} />).container).getAttribute("data-tone"));
    expect(new Set(tones)).toEqual(new Set(LIGHT_TONES));
  });

  it("gives every instance its own gradient ids", () => {
    const { container } = render(
      <>
        <ProjectVisual visual="multi-agent" />
        <ProjectVisual visual="multi-agent" />
      </>,
    );
    const ids = [...container.querySelectorAll("linearGradient, radialGradient")].map((node) => node.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    ids.forEach((id) => expect(id).toMatch(/^[a-zA-Z0-9_-]+$/));
  });

  it.each([null, "unknown-visual", "toString"])("falls back to the neutral cover for %s", (visual) => {
    const { container } = render(<ProjectVisual visual={visual} />);
    expect(cover(container)).toHaveAttribute("data-visual", "fallback");
  });

  it("labels the four agents of the multi-agent cover", () => {
    const { container } = render(<ProjectVisual visual="multi-agent" />);
    const labels = [...container.querySelectorAll("text")].map((text) => text.textContent);
    expect(labels).toEqual(["A1", "A2", "A3", "A4"]);
  });
});
