import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

interface CheckListProps {
  items: readonly string[];
  className?: string;
  itemClassName?: string;
}

/** List with small check marks (features, capabilities). */
export function CheckList({ items, className, itemClassName }: CheckListProps) {
  if (items.length === 0) return null;
  return (
    <ul className={cn("grid gap-2.5", className)}>
      {items.map((item) => (
        <li key={item} className={cn("flex items-start gap-2.5 text-[15px] text-ink", itemClassName)}>
          <span
            aria-hidden="true"
            className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-strong"
          >
            <Check className="size-3" strokeWidth={2.5} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
