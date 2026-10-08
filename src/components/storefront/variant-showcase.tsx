import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { money } from "@/lib/storefront";
import type { StoreProduct } from "@/lib/storefront.functions";

type Variant = StoreProduct["variants"][number];

export type Slide = { key: string; image: string | null; variant: Variant | null };

/** One slide per variant (paired with the product photo in the same position), then any leftover photos. */
export function buildSlides(product: StoreProduct): Slide[] {
  const slides: Slide[] = product.variants.map((variant, i) => ({
    key: variant.id,
    image: product.images[i]?.url ?? product.images[0]?.url ?? null,
    variant,
  }));
  for (let i = product.variants.length; i < product.images.length; i++) {
    const img = product.images[i];
    if (img) slides.push({ key: img.id, image: img.url, variant: null });
  }
  if (!slides.length) slides.push({ key: "empty", image: null, variant: null });
  return slides;
}

export function stockLabel(v: Variant) {
  if (v.stock_quantity === 0) return "Out of stock";
  if (v.stock_quantity <= 5) return `Only ${v.stock_quantity} left`;
  return "In stock";
}

export function VariantCarousel({ product, slides, selectedId, onSelect }: {
  product: StoreProduct; slides: Slide[]; selectedId: string | null; onSelect: (variantId: string) => void;
}) {
  const startIndex = Math.max(0, slides.findIndex((s) => s.variant?.id === selectedId));
  const [emblaRef, embla] = useEmblaCarousel({ align: "start", loop: false, startIndex });
  const [index, setIndex] = useState(startIndex);
  const lastSelected = useRef<string | null>(selectedId);

  // swipe / arrows / dots -> remember the slide; select its variant if it has one
  useEffect(() => {
    if (!embla) return;
    const onSelectSlide = () => {
      const i = embla.selectedScrollSnap();
      setIndex(i);
      const v = slides[i]?.variant;
      if (v) { lastSelected.current = v.id; onSelect(v.id); }
    };
    embla.on("select", onSelectSlide);
    return () => { embla.off("select", onSelectSlide); };
  }, [embla, slides, onSelect]);

  // a variant picked elsewhere (buttons / cards) -> scroll to its slide, only when that selection actually changed
  useEffect(() => {
    if (!embla || selectedId === lastSelected.current) return;
    lastSelected.current = selectedId;
    const i = slides.findIndex((s) => s.variant?.id === selectedId);
    if (i >= 0) embla.scrollTo(i);
  }, [embla, slides, selectedId]);
  const activeIndex = index;

  const prev = useCallback(() => embla?.scrollPrev(), [embla]);
  const next = useCallback(() => embla?.scrollNext(), [embla]);

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden bg-product" aria-roledescription="carousel">
        <div className="flex touch-pan-y">
          {slides.map((slide) => {
            const v = slide.variant;
            const price = v?.price_override ?? product.base_price;
            return (
              <div key={slide.key} className="min-w-0 shrink-0 grow-0 basis-full" aria-roledescription="slide">
                <div className="aspect-square">
                  {slide.image
                    ? <img src={slide.image} alt={v ? `${product.name} ${v.variant_value}` : product.name} width={900} height={900} className="h-full w-full object-contain p-6" draggable={false} />
                    : <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="size-16" /><span className="sr-only">Image coming soon</span></div>}
                </div>
                {v && (
                  <div className="flex items-end justify-between gap-3 border-t border-border bg-card px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase text-muted-foreground">{v.variant_type.replaceAll("_", " ")}</p>
                      <p className="truncate font-display text-2xl font-semibold leading-tight">{v.variant_value}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold">{money(price)}</p>
                      <p className={`text-xs ${v.stock_quantity <= 5 ? "text-destructive" : "text-muted-foreground"}`}>{stockLabel(v)}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {slides.length > 1 && <>
        <button type="button" onClick={prev} aria-label="Previous" className="absolute left-2 top-[40%] hidden size-9 -translate-y-1/2 place-items-center bg-card/90 shadow sm:grid"><ChevronLeft className="size-5" /></button>
        <button type="button" onClick={next} aria-label="Next" className="absolute right-2 top-[40%] hidden size-9 -translate-y-1/2 place-items-center bg-card/90 shadow sm:grid"><ChevronRight className="size-5" /></button>
        <div className="mt-3 flex justify-center gap-1.5">
          {slides.map((s, i) => <button key={s.key} type="button" aria-label={`Go to slide ${i + 1}`} onClick={() => embla?.scrollTo(i)} className={`h-1.5 transition-all ${i === activeIndex ? "w-6 bg-accent" : "w-1.5 bg-border"}`} />)}
        </div>
      </>}
    </div>
  );
}
