import { ArrowRight, Menu } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Link, useLocation } from "react-router";

import { Brand } from "@/components/common/Brand";
import { SocialLinks } from "@/components/common/SocialLinks";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { HOME_SECTION_IDS, NAV_ITEMS, navIdForSection } from "@/components/layout/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useActiveSection } from "@/hooks/useActiveSection";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePageScrollProgress } from "@/hooks/useScrollProgress";
import { useScrolledPast } from "@/hooks/useScrolledPast";
import { cn } from "@/lib/cn";
import { splitHeadline } from "@/lib/portfolio";
import { SECTION, sectionHref, SITE_NAME } from "@/lib/site";

const NO_SECTIONS: readonly string[] = [];
const MOBILE_MENU_ID = "mobile-menu";
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Header v4 (docs/SPEC.md §3.3): transparent over the ivory hero, then blurred ivory with a
 * hairline and soft shadow once the page scrolls. Blue monogram, sliding active indicator,
 * GitHub / LinkedIn on xl, "Get in touch" CTA, scroll-progress bar on the bottom edge, and a
 * full-screen light sheet under lg.
 */
export function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const scrolled = useScrolledPast(16);
  const activeSection = useActiveSection(isHome ? HOME_SECTION_IDS : NO_SECTIONS);
  const activeNavId = isHome
    ? activeSection
      ? navIdForSection(activeSection)
      : null
    : location.pathname.startsWith("/projects/")
      ? SECTION.projects
      : null;

  const portfolio = usePortfolio();
  const profile = portfolio.data?.profile;
  const name = profile?.full_name ?? SITE_NAME;
  const primaryRole = profile ? splitHeadline(profile.headline)[0] : undefined;
  const progressRef = usePageScrollProgress<HTMLDivElement>();

  // The sheet is bound to the history entry it was opened on: any navigation closes it.
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const menuOpen = menuOpenedAt === location.key;
  const closeMenu = useCallback(() => setMenuOpenedAt(null), []);

  useEffect(() => {
    if (!menuOpen) return;
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpenedAt(null);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [menuOpen]);

  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  useSlidingIndicator(listRef, indicatorRef, activeNavId);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-500 ease-out",
        scrolled
          ? "border-line/70 bg-ivory/80 shadow-[0_12px_32px_-26px_rgb(19_34_63/0.4)] backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-18 items-center justify-between gap-6">
        <Brand name={name} subtitle={primaryRole} showSubtitle={scrolled} nameClassName="lg:hidden xl:flex" />

        <nav aria-label="Primary" className="hidden lg:block">
          <div className="relative">
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="nav-indicator pointer-events-none absolute inset-y-0 left-0 w-0 rounded-full bg-white opacity-0 shadow-[0_1px_2px_rgb(19_34_63/0.06),0_6px_16px_-8px_rgb(19_34_63/0.2)] ring-1 ring-line/80 after:absolute after:bottom-[3px] after:left-1/2 after:h-[2px] after:w-3 after:-translate-x-1/2 after:rounded-full after:bg-accent"
            />
            <ul ref={listRef} className="flex items-center">
              {NAV_ITEMS.map((item) => {
                const active = activeNavId === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      to={sectionHref(item.id)}
                      data-nav-id={item.id}
                      aria-current={active && isHome ? "location" : undefined}
                      className={cn(
                        "relative flex h-9 items-center rounded-full px-3 text-[13.5px] font-medium transition-colors duration-300",
                        active ? "text-ink" : "text-slate-600 hover:text-ink",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          {profile ? (
            <SocialLinks
              email={profile.email}
              githubUrl={profile.github_url}
              linkedinUrl={profile.linkedin_url}
              channels={["github", "linkedin"]}
              size="sm"
              className="mr-1 max-xl:hidden"
            />
          ) : portfolio.loading ? (
            // Same footprint as the two icon buttons while the profile loads, so the nav does not shift.
            <span aria-hidden="true" className="mr-1 flex gap-1.5 max-xl:hidden">
              <span className="size-9 rounded-full border border-line/70 bg-white/60" />
              <span className="size-9 rounded-full border border-line/70 bg-white/60" />
            </span>
          ) : null}
          <ButtonLink
            to={sectionHref(SECTION.contact)}
            size="sm"
            trailingIcon={<ArrowRight aria-hidden="true" />}
            className="max-sm:hidden"
          >
            Get in touch
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMenuOpenedAt(location.key)}
            aria-expanded={menuOpen}
            aria-controls={MOBILE_MENU_ID}
            aria-label="Open menu"
            className="-mr-1.5 flex size-11 items-center justify-center rounded-full border border-transparent text-ink transition-colors hover:border-line hover:bg-white lg:hidden"
          >
            <Menu aria-hidden="true" className="size-[22px]" />
          </button>
        </div>
      </Container>

      <div aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[2px] overflow-hidden">
        <div ref={progressRef} className="scroll-progress h-full w-full bg-linear-to-r from-accent-soft via-accent to-accent-strong" />
      </div>

      {menuOpen && (
        <MobileMenu
          id={MOBILE_MENU_ID}
          name={name}
          profile={profile}
          activeNavId={isHome ? activeNavId : null}
          onClose={closeMenu}
        />
      )}
    </header>
  );
}

/**
 * Moves the indicator pill under the active link (transform + width, written to the DOM —
 * no re-render). Transitions are enabled only after the first placement so it never
 * slides in from the left edge.
 */
function useSlidingIndicator(
  listRef: RefObject<HTMLUListElement | null>,
  indicatorRef: RefObject<HTMLSpanElement | null>,
  activeId: string | null,
): void {
  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const place = () => {
      const target = activeId ? list.querySelector<HTMLElement>(`[data-nav-id="${activeId}"]`) : null;
      if (!target) {
        indicator.style.opacity = "0";
        return;
      }
      indicator.style.width = `${target.offsetWidth}px`;
      indicator.style.transform = `translate3d(${target.offsetLeft}px, 0, 0)`;
      indicator.style.opacity = "1";
      if (!indicator.dataset.ready) {
        // Enable transitions on the next frame, after the first position has been painted.
        requestAnimationFrame(() => {
          indicator.dataset.ready = "true";
        });
      }
    };

    place();
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    resize?.observe(list);
    return () => resize?.disconnect();
  }, [listRef, indicatorRef, activeId]);
}
