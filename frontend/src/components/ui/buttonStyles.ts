import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";
/**
 * Surface the button sits on. Palette v4 has no dark surfaces any more, so `dark` is kept
 * only for backward compatibility and renders exactly like `light`.
 */
export type ButtonTone = "light" | "dark";

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  className?: string;
}

const BASE =
  "group/button relative isolate inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,translate] duration-200 ease-out " +
  "disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 " +
  "[&_svg]:size-4 [&_svg]:shrink-0";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 rounded-lg px-3.5 text-sm",
  md: "h-11 rounded-[10px] px-5 text-[15px]",
  lg: "h-12 rounded-xl px-6 text-base",
};

const LINK_SIZES: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-[15px]",
  lg: "text-base",
};

/** Primary: accent fill + white text, soft blue shadow and a one-pass sheen on hover. */
const PRIMARY =
  "overflow-hidden bg-accent text-white shadow-accent hover:-translate-y-0.5 hover:bg-accent-strong " +
  "hover:shadow-[0_1px_2px_rgb(19_34_63/0.1),0_16px_32px_-14px_rgb(46_107_203/0.7)] active:translate-y-0 " +
  "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:-z-10 before:w-1/2 before:-translate-x-[120%] before:-skew-x-12 " +
  "before:bg-linear-to-r before:from-transparent before:via-white/28 before:to-transparent " +
  "hover:before:translate-x-[260%] hover:before:transition-transform hover:before:duration-700 hover:before:ease-out motion-reduce:before:hidden";

/** Secondary: white surface, ink text, hairline border. */
const SECONDARY =
  "border border-line bg-white text-ink shadow-[0_1px_2px_rgb(19_34_63/0.05)] hover:-translate-y-0.5 " +
  "hover:border-accent/35 hover:text-accent-strong hover:shadow-soft active:translate-y-0";

/** Ghost: text only, with an underline that draws from the left on hover. */
const GHOST =
  "text-ink hover:text-accent-strong after:pointer-events-none after:absolute after:h-px after:origin-left after:scale-x-0 " +
  "after:bg-current after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100";

const GHOST_UNDERLINE: Record<ButtonSize, string> = {
  sm: "after:inset-x-3.5 after:bottom-1.5",
  md: "after:inset-x-5 after:bottom-2.5",
  lg: "after:inset-x-6 after:bottom-3",
};

const LINK = "rounded-sm text-accent-strong decoration-accent/40 underline-offset-4 hover:text-accent hover:underline";

function variantClasses(variant: ButtonVariant, size: ButtonSize): string {
  switch (variant) {
    case "primary":
      return PRIMARY;
    case "secondary":
      return SECONDARY;
    case "ghost":
      return cn(GHOST, GHOST_UNDERLINE[size]);
    case "link":
      return LINK;
  }
}

/** Class list for a button-like element (shared by `<Button>` and `<ButtonLink>`). */
export function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyleProps): string {
  return cn(BASE, variant === "link" ? LINK_SIZES[size] : SIZES[size], variantClasses(variant, size), className);
}

/** Classes for a trailing arrow icon that nudges on hover. */
export const ARROW_NUDGE = "transition-transform duration-300 ease-out group-hover/button:translate-x-1";
