import type { MouseEvent } from "react";
import { Outlet, useLocation } from "react-router";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollManager } from "@/components/layout/ScrollManager";

const MAIN_ID = "main";

/** Move focus to <main> without changing the URL hash. */
function skipToContent(event: MouseEvent<HTMLAnchorElement>): void {
  const main = document.getElementById(MAIN_ID);
  if (!main) return;
  event.preventDefault();
  main.focus({ preventScroll: true });
  main.scrollIntoView({ block: "start" });
}

/** Shell of every public page: skip link, navbar, routed content (short fade between routes), footer. */
export function PublicLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <a
        href={`#${MAIN_ID}`}
        onClick={skipToContent}
        className="fixed top-3 left-3 z-[60] -translate-y-24 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white shadow-lift transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <ScrollManager />
      <Navbar />
      <main id={MAIN_ID} tabIndex={-1} className="outline-none">
        {/* Keyed by path: each page fades / slides in once (≤ 260 ms, instant under reduced motion). */}
        <div key={pathname} className="animate-route-in">
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  );
}
