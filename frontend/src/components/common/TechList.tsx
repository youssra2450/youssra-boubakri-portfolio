import { Chip } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { staggerIndex } from "@/lib/motion";

interface TechListProps {
  items: readonly string[];
  /** Show at most `max` chips followed by a "+n" chip. */
  max?: number;
  /** Kept for backward compatibility; chips are always rendered for light surfaces. */
  tone?: "light" | "dark";
  className?: string;
  label?: string;
  /** Cascade the chips in when an ancestor is revealed (`.is-visible`). */
  cascade?: boolean;
}

/** Wrapped list of technology chips. */
export function TechList({ items, max, className, label = "Technologies", cascade = false }: TechListProps) {
  if (items.length === 0) return null;
  const visible = max === undefined ? items : items.slice(0, max);
  const hidden = items.slice(visible.length);

  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", cascade && "reveal-children", className)}>
      {visible.map((item, index) => (
        <li key={item} style={cascade ? staggerIndex(index) : undefined}>
          <Chip>{item}</Chip>
        </li>
      ))}
      {hidden.length > 0 && (
        <li style={cascade ? staggerIndex(visible.length) : undefined}>
          <Chip variant="muted" title={hidden.join(", ")}>
            <span aria-hidden="true">+{hidden.length}</span>
            <span className="sr-only">and {hidden.length} more: {hidden.join(", ")}</span>
          </Chip>
        </li>
      )}
    </ul>
  );
}
