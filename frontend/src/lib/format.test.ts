import { describe, expect, it } from "vitest";

import { formatDateRange, formatDuration, formatMonthYear, formatYearRange, monthsBetween } from "@/lib/format";

describe("formatMonthYear", () => {
  it("formats an ISO date as short month and year", () => {
    expect(formatMonthYear("2023-05-01")).toBe("May 2023");
    expect(formatMonthYear("2024-12-15")).toBe("Dec 2024");
  });
});

describe("formatDateRange", () => {
  it("joins start and end", () => {
    expect(formatDateRange("2023-05-01", "2023-07-01")).toBe("May 2023 – Jul 2023");
  });

  it("uses Present for an open range", () => {
    expect(formatDateRange("2025-02-01", null)).toBe("Feb 2025 – Present");
  });
});

describe("monthsBetween", () => {
  it("counts months inclusively", () => {
    expect(monthsBetween("2023-05-01", "2023-07-01")).toBe(3);
    expect(monthsBetween("2023-05-01", "2023-05-20")).toBe(1);
  });

  it("measures open ranges up to the reference date", () => {
    expect(monthsBetween("2025-01-01", null, new Date(2025, 11, 10))).toBe(12);
  });

  it("never returns less than one month", () => {
    expect(monthsBetween("2024-06-01", "2024-01-01")).toBe(1);
  });
});

describe("formatDuration", () => {
  it.each([
    [1, "1 month"],
    [3, "3 months"],
    [12, "1 year"],
    [13, "1 yr 1 mo"],
    [26, "2 yr 2 mos"],
    [24, "2 years"],
  ])("%i months → %s", (months, expected) => {
    expect(formatDuration(months)).toBe(expected);
  });
});

describe("formatYearRange", () => {
  it("collapses identical years", () => {
    expect(formatYearRange(2024, 2024)).toBe("2024");
  });

  it("joins different years and handles open ranges", () => {
    expect(formatYearRange(2024, 2026)).toBe("2024 – 2026");
    expect(formatYearRange(2025, null)).toBe("2025 – Present");
  });
});
