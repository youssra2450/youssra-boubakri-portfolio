import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";

interface ProjectStatusProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  actions?: ReactNode;
}

/**
 * Light full-width panel for the case study's not-found / error states (ivory surface, soft blue
 * glow). It provides the page's h1 and keeps the transparent navbar readable.
 */
export function ProjectStatus({ eyebrow, title, description, icon: Icon, actions }: ProjectStatusProps) {
  return (
    <section
      aria-labelledby="status-title"
      className="relative isolate overflow-hidden border-b border-line bg-linear-to-b from-ivory to-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_60%_at_80%_25%,rgb(207_224_246/0.7),transparent_70%)]"
      />
      <Container className="flex min-h-[72svh] flex-col justify-center pt-36 pb-24">
        <div className="cs-enter max-w-2xl">
          <span className="flex size-12 items-center justify-center rounded-xl border border-accent/20 bg-white text-accent shadow-soft [&_svg]:size-6">
            <Icon aria-hidden="true" />
          </span>
          <p className="eyebrow mt-8 text-accent-strong">{eyebrow}</p>
          <h1 id="status-title" className="mt-4 text-h2 font-bold text-ink">
            {title}
          </h1>
          <div className="mt-4 text-lg text-slate-600">{description}</div>
          {actions && <div className="mt-10 flex flex-wrap gap-3">{actions}</div>}
        </div>
      </Container>
    </section>
  );
}
