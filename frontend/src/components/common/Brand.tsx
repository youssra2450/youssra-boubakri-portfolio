import { Link } from "react-router";

import { cn } from "@/lib/cn";
import { initials } from "@/lib/portfolio";

interface BrandProps {
  name: string;
  /** Kept for backward compatibility; the brand is always rendered for light surfaces. */
  tone?: "light" | "dark";
  onClick?: () => void;
  /** Classes for the text block (e.g. to hide it on some breakpoints). */
  nameClassName?: string;
  /** Small mono line under the name (e.g. "Data Scientist"). */
  subtitle?: string;
  /** Show the subtitle (the name slides up to make room). Defaults to true when a subtitle is set. */
  showSubtitle?: boolean;
  size?: "md" | "lg";
}

/** Blue "YB" monogram tile + full name, linking to the home page. */
export function Brand({ name, onClick, nameClassName, subtitle, showSubtitle = true, size = "md" }: BrandProps) {
  const withSubtitle = Boolean(subtitle);
  const subtitleVisible = withSubtitle && showSubtitle;

  return (
    <Link
      to="/"
      onClick={onClick}
      className="group/brand flex min-h-11 items-center gap-3 rounded-md"
      aria-label={`${name || "Portfolio"} — home`}
    >
      <Monogram name={name} size={size} />
      {name && (
        <span
          aria-hidden="true"
          className={cn("relative flex h-10 flex-col justify-center overflow-hidden", nameClassName)}
        >
          <span
            className={cn(
              "block font-display font-bold tracking-tight whitespace-nowrap text-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              size === "lg" ? "text-lg" : "text-[15px]",
              subtitleVisible && "-translate-y-[7px]",
            )}
          >
            {name}
          </span>
          {withSubtitle && (
            <span
              className={cn(
                "absolute top-1/2 left-0 block font-mono text-[10.5px] leading-none tracking-[0.14em] whitespace-nowrap text-accent-strong uppercase transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                subtitleVisible ? "translate-y-[5px] opacity-100" : "translate-y-[14px] opacity-0",
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

/** The monogram tile on its own (brand accent, white initials, light-blue underline like the favicon). */
export function Monogram({ name, size = "md", className }: { name: string; size?: "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-[10px] bg-accent font-display font-extrabold tracking-tight text-white shadow-accent transition-transform duration-300 ease-out group-hover/brand:-translate-y-px",
        size === "lg" ? "size-11 text-[15px]" : "size-9 text-[13px]",
        className,
      )}
    >
      <span className="-mt-0.5">{initials(name) || "·"}</span>
      <span className="absolute bottom-[7px] left-1/2 h-[2px] w-3.5 -translate-x-1/2 rounded-full bg-sky-200" />
    </span>
  );
}
