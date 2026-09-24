import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/** Centered page column: max 1152 px, 20 px / 32 px side gutters. */
export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)} {...rest} />;
}
