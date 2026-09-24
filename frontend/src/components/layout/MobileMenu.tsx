import { ArrowRight, MapPin, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";

import { Brand } from "@/components/common/Brand";
import { SocialLinks } from "@/components/common/SocialLinks";
import { NAV_ITEMS } from "@/components/layout/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/cn";
import { staggerIndex } from "@/lib/motion";
import { locationLine, ordinal } from "@/lib/portfolio";
import { SECTION, sectionHref } from "@/lib/site";
import type { Profile } from "@/types/api";

interface MobileMenuProps {
  id: string;
  name: string;
  profile?: Profile;
  activeNavId: string | null;
  onClose: () => void;
}

/**
 * Full-screen light navigation sheet for small screens: modal dialog with a focus trap,
 * Esc to close, body scroll lock, staggered links. Rendered in a portal because the
 * header's backdrop-filter would otherwise become the containing block of `position: fixed`.
 */
export function MobileMenu({ id, name, profile, activeNavId, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef);
  useBodyScrollLock();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const whereabouts = profile ? locationLine(profile.location, profile.mobility) : "";

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className="fixed inset-0 z-50 flex animate-sheet-in flex-col bg-ivory lg:hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(141_182_234/0.3),transparent)]"
      />
      <div className="relative border-b border-sand-200">
        <Container className="flex h-18 items-center justify-between">
          <Brand name={name} onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-1.5 flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-[0_1px_2px_rgb(19_34_63/0.05)] transition-colors hover:border-accent/35 hover:text-accent-strong"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </Container>
      </div>

      <nav aria-label="Mobile" className="relative flex-1 overflow-y-auto overscroll-contain">
        <Container>
          <p className="menu-item-in eyebrow pt-7 text-slate-600">Navigate</p>
          <ul className="pt-2 pb-6">
            {NAV_ITEMS.map((item, index) => {
              const active = activeNavId === item.id;
              return (
                <li key={item.id} className="menu-item-in border-b border-sand-200/80 last:border-b-0" style={staggerIndex(index + 1)}>
                  <Link
                    to={sectionHref(item.id)}
                    onClick={onClose}
                    aria-current={active ? "location" : undefined}
                    className="group flex min-h-14 items-center justify-between gap-4 py-3"
                  >
                    <span className="flex items-baseline gap-4">
                      <span
                        className={cn("font-mono text-xs", active ? "text-accent-strong" : "text-slate-600")}
                        aria-hidden="true"
                      >
                        {ordinal(index + 1)}
                      </span>
                      <span
                        className={cn(
                          "font-display text-[1.6rem] leading-tight font-semibold tracking-tight transition-colors",
                          active ? "text-accent-strong" : "text-ink group-hover:text-accent-strong",
                        )}
                      >
                        {item.label}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border transition-[transform,border-color,background-color] duration-300 group-hover:translate-x-0.5",
                        active ? "border-accent bg-accent text-white" : "border-line bg-white text-slate-600",
                      )}
                    >
                      <ArrowRight className="size-4" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </nav>

      <div className="relative border-t border-sand-200 bg-white/70 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <Container className="flex flex-col gap-4 py-5">
          {profile && (
            <div className="flex items-center justify-between gap-4">
              {whereabouts && (
                <p className="flex min-w-0 items-start gap-2 text-[13px] leading-snug text-slate-600">
                  <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent-strong" />
                  <span>{whereabouts}</span>
                </p>
              )}
              <SocialLinks
                email={profile.email}
                githubUrl={profile.github_url}
                linkedinUrl={profile.linkedin_url}
                size="sm"
                className="shrink-0"
              />
            </div>
          )}
          <ButtonLink
            to={sectionHref(SECTION.contact)}
            size="lg"
            className="w-full"
            trailingIcon={<ArrowRight aria-hidden="true" />}
            onClick={onClose}
          >
            Get in touch
          </ButtonLink>
        </Container>
      </div>
    </div>,
    document.body,
  );
}
