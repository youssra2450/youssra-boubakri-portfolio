import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder with the same geometry as the hero + first section, so the page does not
 * jump when GET /api/portfolio resolves. Light (ivory → white) like the real hero.
 */
export function HomeSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading the portfolio…</span>
      <div className="bg-linear-to-b from-ivory via-ivory to-white">
        <Container className="pt-32 pb-16 md:pt-40 md:pb-20">
          <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <Skeleton tone="warm" className="h-8 w-80 max-w-full rounded-full" />
              <Skeleton tone="warm" className="mt-7 h-14 w-full max-w-lg md:h-16" />
              <Skeleton tone="warm" className="mt-6 h-7 w-full max-w-sm" />
              <Skeleton tone="warm" className="mt-10 h-8 w-full max-w-xl" />
              <Skeleton tone="warm" className="mt-3 h-8 w-4/5 max-w-lg" />
              <Skeleton tone="warm" className="mt-8 h-4 w-full max-w-xl" />
              <Skeleton tone="warm" className="mt-3 h-4 w-11/12 max-w-lg" />
              <Skeleton tone="warm" className="mt-3 h-4 w-3/4 max-w-md" />
              <div className="mt-10 flex flex-wrap gap-3">
                <Skeleton tone="warm" className="h-12 w-40 rounded-xl" />
                <Skeleton tone="warm" className="h-12 w-40 rounded-xl" />
                <Skeleton tone="warm" className="h-12 w-28 rounded-xl" />
              </div>
            </div>
            <div className="lg:col-span-5">
              <Skeleton tone="warm" className="mx-auto aspect-[4/5] w-4/5 max-w-[440px] rounded-[26px] lg:mr-0 lg:w-full" />
            </div>
          </div>
          <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:mt-24 md:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="bg-white px-5 py-6">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="mt-3 h-3.5 w-24" />
              </div>
            ))}
          </div>
        </Container>
      </div>
      <Container className="py-24 md:py-32">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="mt-6 h-10 w-full max-w-md" />
        <Skeleton className="mt-5 h-5 w-full max-w-xl" />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-card" />
          ))}
        </div>
      </Container>
    </div>
  );
}
