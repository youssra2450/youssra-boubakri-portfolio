import { act, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCountUp } from "@/hooks/useCountUp";
import { useRotatingIndex } from "@/hooks/useRotatingIndex";
import { usePageScrollProgress, useScrollLinkedProgress } from "@/hooks/useScrollProgress";

/** Emulate `prefers-reduced-motion: reduce` (the mock is restored after each test by setup.ts). */
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

function mockRect(top: number, height: number): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 100,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);
}

function LinkedProgress() {
  const ref = useScrollLinkedProgress<HTMLDivElement>({ anchor: 0.5 });
  return <div ref={ref} data-testid="target" />;
}

function PageProgress() {
  const ref = usePageScrollProgress<HTMLDivElement>();
  return <div ref={ref} data-testid="bar" />;
}

describe("useRotatingIndex", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cycles through the items at the given interval", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRotatingIndex(3, { interval: 1000 }));
    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe(0);
  });

  it("stays on the first item while disabled (off screen or reduced motion)", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRotatingIndex(3, { interval: 1000, enabled: false }));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(0);
  });

  it("does not rotate a single item", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRotatingIndex(1, { interval: 1000 }));
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current).toBe(0);
  });
});

describe("useScrollLinkedProgress", () => {
  it("writes the element's progress through the anchor line", () => {
    // Anchor line at 50 % of the viewport; the element straddles it by half its height.
    const line = window.innerHeight * 0.5;
    mockRect(line - 100, 200);
    const { getByTestId } = render(<LinkedProgress />);
    expect(getByTestId("target").style.getPropertyValue("--progress")).toBe("0.5000");
  });

  it("is 0 before the element reaches the line", () => {
    mockRect(window.innerHeight, 200);
    const { getByTestId } = render(<LinkedProgress />);
    expect(getByTestId("target").style.getPropertyValue("--progress")).toBe("0.0000");
  });

  it("shows the final state immediately under reduced motion", () => {
    preferReducedMotion();
    mockRect(window.innerHeight, 200);
    const { getByTestId } = render(<LinkedProgress />);
    expect(getByTestId("target").style.getPropertyValue("--progress")).toBe("1.0000");
  });
});

describe("usePageScrollProgress", () => {
  it("writes the page scroll progress on mount", () => {
    const { getByTestId } = render(<PageProgress />);
    expect(getByTestId("bar").style.getPropertyValue("--scroll-progress")).toMatch(/^\d\.\d{4}$/);
  });
});

describe("useCountUp", () => {
  it("returns the final value immediately under reduced motion", () => {
    preferReducedMotion();
    const { result } = renderHook(() => useCountUp(56, { enabled: true }));
    expect(result.current).toBe(56);
  });

  it("starts from 0 until enabled", () => {
    const { result } = renderHook(() => useCountUp(56, { enabled: false }));
    expect(result.current).toBe(0);
  });
});
