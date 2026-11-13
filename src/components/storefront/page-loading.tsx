/** Reserve page space while route data is pending so the footer cannot flash first. */
export function PageLoading() {
  return (
    <section aria-label="Loading page" aria-busy="true" className="min-h-screen bg-background">
      <div aria-hidden="true" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="max-w-xl space-y-6 motion-safe:animate-pulse">
          <div className="h-4 w-40 bg-muted" />
          <div className="h-14 w-full bg-muted sm:h-20" />
          <div className="h-14 w-4/5 bg-muted sm:h-20" />
          <div className="h-4 w-3/4 bg-muted" />
          <div className="h-11 w-40 rounded-md bg-muted" />
        </div>
      </div>
    </section>
  );
}