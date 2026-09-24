import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useActiveSection } from "@/hooks/useActiveSection";

const IDS = ["first", "second", "third"] as const;

/** Viewport-relative `top` of each section, as returned by getBoundingClientRect. */
let tops: Record<(typeof IDS)[number], number>;

function Probe() {
  const active = useActiveSection(IDS);
  return (
    <>
      <output data-testid="active">{active ?? "none"}</output>
      {IDS.map((id) => (
        <section
          key={id}
          id={id}
          ref={(element) => {
            if (element) element.getBoundingClientRect = () => ({ top: tops[id] }) as DOMRect;
          }}
        />
      ))}
    </>
  );
}

function scrollTo(next: typeof tops) {
  tops = next;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("useActiveSection", () => {
  const initialHeight = window.innerHeight;

  beforeEach(() => {
    // Default band "-40% 0px -55% 0px" → a section is current once its top is above 45 % of 1000 px.
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    tops = { first: 0, second: 900, third: 1800 };
  });

  afterEach(() => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: initialHeight });
  });

  it("reports the last section whose top has entered the band", async () => {
    render(<Probe />);
    scrollTo({ first: 0, second: 900, third: 1800 });
    await waitFor(() => expect(screen.getByTestId("active")).toHaveTextContent("first"));

    scrollTo({ first: -900, second: 300, third: 900 });
    await waitFor(() => expect(screen.getByTestId("active")).toHaveTextContent("second"));
  });

  it("never stays stale after a jump where nothing crosses the band", async () => {
    render(<Probe />);
    scrollTo({ first: -3000, second: -2000, third: -1000 });
    await waitFor(() => expect(screen.getByTestId("active")).toHaveTextContent("third"));

    // Straight back above the first section (e.g. "Back to top" on a page with a header area).
    scrollTo({ first: 700, second: 1600, third: 2500 });
    await waitFor(() => expect(screen.getByTestId("active")).toHaveTextContent("none"));
  });
});
