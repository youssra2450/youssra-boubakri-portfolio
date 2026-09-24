import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  /** `dark` is kept for backward compatibility and renders like `light` (no dark surfaces in Palette v4). */
  tone?: "light" | "warm" | "dark";
}

const TONES = {
  light: "bg-line/70",
  warm: "bg-sand-200/70",
  dark: "bg-line/70",
} as const;

/** Placeholder block shown while content loads (decorative, hidden from assistive tech). */
export function Skeleton({ className, tone = "light" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md motion-reduce:animate-none", TONES[tone], className)}
    />
  );
}
