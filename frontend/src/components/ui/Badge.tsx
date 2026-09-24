import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * `navy` and `dark` are kept for backward compatibility only: Palette v4 has no dark
 * surfaces, so they render as a solid accent badge and a neutral light badge.
 */
type BadgeVariant = "neutral" | "accent" | "outline" | "success" | "solid" | "navy" | "dark";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  neutral: "border-line bg-sky-50 text-slate-600",
  accent: "border-accent/20 bg-accent-tint text-accent-strong",
  outline: "border-line bg-white text-ink",
  success: "border-success/25 bg-success/[0.08] text-success-strong",
  solid: "border-accent bg-accent text-white",
  navy: "border-accent bg-accent text-white",
  dark: "border-line bg-white text-slate-600",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: ReactNode;
}

/** Small rounded status / category label (sans-serif). */
export function Badge({ variant = "neutral", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs leading-5 font-medium whitespace-nowrap [&_svg]:size-3.5",
        BADGE_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

/** `dark` is a backward-compatible alias of `default` (no dark surfaces in Palette v4). */
type ChipVariant = "default" | "core" | "accent" | "dark" | "muted";

const CHIP_VARIANTS: Record<ChipVariant, string> = {
  default: "border-line bg-white text-slate-600",
  core: "border-accent/40 bg-accent-tint text-accent-strong",
  accent: "border-accent/25 bg-accent-tint/70 text-accent-strong",
  dark: "border-line bg-white text-slate-600",
  muted: "border-transparent bg-sky-50 text-slate-600",
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

/** Technology / tool chip (JetBrains Mono). */
export function Chip({ variant = "default", className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[12px] leading-4 whitespace-nowrap",
        CHIP_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
