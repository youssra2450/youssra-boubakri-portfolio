import { createElement, type CSSProperties, type HTMLAttributes } from "react";

import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";

type RevealTag = "div" | "li" | "ol" | "ul" | "article" | "section" | "p" | "span" | "figure" | "header" | "aside";

/** Entrance style (styles/index.css `.reveal[data-reveal]`). */
export type RevealVariant = "fade-up" | "fade-in" | "scale-in" | "slide-left" | "mask";

interface RevealProps extends HTMLAttributes<HTMLElement> {
  as?: RevealTag;
  /** Stagger delay in ms (the design system uses steps of 60–80 ms). */
  delay?: number;
  variant?: RevealVariant;
  /** Stagger direct children (each child needs a `--i` index, see lib/motion `staggerIndex`). */
  staggerChildren?: boolean;
}

/**
 * Reveals its content the first time it enters the viewport (`.reveal` / `.is-visible` in
 * styles/index.css). Visible immediately without IntersectionObserver; instant under reduced motion.
 */
export function Reveal({
  as = "div",
  delay = 0,
  variant = "fade-up",
  staggerChildren = false,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const [ref, inView] = useInView<HTMLElement>({ once: true });
  return createElement(
    as,
    {
      ...rest,
      ref,
      "data-reveal": variant === "fade-up" ? undefined : variant,
      className: cn("reveal", staggerChildren && "reveal-children", inView && "is-visible", className),
      style: { ...style, "--reveal-delay": `${delay}ms` } as CSSProperties,
    },
    children,
  );
}
