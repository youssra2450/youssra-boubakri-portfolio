import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";
import { staggerIndex } from "@/lib/motion";

interface StatusPanelProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  actions?: ReactNode;
}

/**
 * Calm full-width light panel (ivory → white, soft blue glow) for empty / error / not-found
 * states. It provides the page's h1.
 */
export function StatusPanel({ eyebrow, title, description, icon: Icon, actions }: StatusPanelProps) {
  return (
    <section aria-labelledby="status-title" className="relative isolate overflow-hidden bg-linear-to-b from-ivory to-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 size-[640px] rounded-full bg-[radial-gradient(closest-side,rgb(141_182_234/0.32),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(46_107_203/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(46_107_203/0.05)_1px,transparent_1px)] bg-size-[56px_56px] [mask-image:radial-gradient(60%_60%_at_70%_30%,#000,transparent)]" />
      </div>
      <Container className="relative flex min-h-[72svh] flex-col justify-center pt-36 pb-24">
        <div className="max-w-2xl">
          <span className="hero-in flex size-12 items-center justify-center rounded-xl border border-accent/15 bg-accent-tint text-accent-strong [&_svg]:size-6">
            <Icon aria-hidden="true" />
          </span>
          <p className="hero-in eyebrow mt-8 text-accent-strong" style={staggerIndex(1)}>
            {eyebrow}
          </p>
          <h1 id="status-title" className="hero-in mt-4 text-h2 font-bold text-ink" style={staggerIndex(2)}>
            {title}
          </h1>
          <div className="hero-in mt-4 text-lg leading-relaxed text-slate-600" style={staggerIndex(3)}>
            {description}
          </div>
          {actions && (
            <div className="hero-in mt-10 flex flex-wrap gap-3" style={staggerIndex(4)}>
              {actions}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
