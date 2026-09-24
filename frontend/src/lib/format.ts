const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseISODate(value: string): { year: number; month: number } {
  const [y, m] = value.split("-").map((part) => Number.parseInt(part, 10));
  return { year: y, month: m };
}

/** "2023-05-01" → "May 2023". */
export function formatMonthYear(value: string): string {
  const { year, month } = parseISODate(value);
  return `${MONTHS[month - 1] ?? ""} ${year}`.trim();
}

/** "May 2023 – Jul 2023" or "May 2023 – Present". */
export function formatDateRange(start: string, end: string | null): string {
  return `${formatMonthYear(start)} – ${end ? formatMonthYear(end) : "Present"}`;
}

/** Inclusive month count between two ISO dates (May → Jul = 3 months). */
export function monthsBetween(start: string, end: string | null, now: Date = new Date()): number {
  const s = parseISODate(start);
  const e = end ? parseISODate(end) : { year: now.getFullYear(), month: now.getMonth() + 1 };
  return Math.max(1, (e.year - s.year) * 12 + (e.month - s.month) + 1);
}

/** 3 → "3 months", 1 → "1 month", 14 → "1 yr 2 mos". */
export function formatDuration(months: number): string {
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} yr ${rest} mo${rest === 1 ? "" : "s"}` : `${years} year${years === 1 ? "" : "s"}`;
}

/** 2024, 2026 → "2024 – 2026"; 2024, 2024 → "2024"; 2024, null → "2024 – Present". */
export function formatYearRange(start: number, end: number | null): string {
  if (end === null) return `${start} – Present`;
  return start === end ? String(start) : `${start} – ${end}`;
}
