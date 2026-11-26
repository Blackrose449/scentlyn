export function OurStory({ as = "h2" }: { as?: "h1" | "h2" }) {
  const Heading = as;
  return <section aria-labelledby="our-story-heading" className="bg-card">
    <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Our Story</p>
      <Heading id="our-story-heading" className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">A beautiful home is a feeling.</Heading>
      <div className="mt-8 space-y-5 text-base leading-8 text-foreground/85 sm:text-lg">
        <p>At Scentlyn, we believe home is found in the little things: the soft freshness of clean laundry, the familiar scent that welcomes you through the door, and the quiet comfort of a space lovingly cared for.</p>
        <p>Born from a love of freshness, quality and beautiful living, Scentlyn brings together thoughtfully selected essentials that transform everyday routines into moments of warmth, calm and connection.</p>
        <p>Because home is more than a place to live. It is where you breathe, feel held and belong.</p>
      </div>
      <p className="mt-10 font-display text-2xl font-semibold italic sm:text-3xl"><strong>Scentlyn: For homes that feel as good as they look.</strong></p>
    </div>
  </section>;
}
