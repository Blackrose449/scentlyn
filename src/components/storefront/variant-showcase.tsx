import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { money } from "@/lib/storefront";
import type { StoreProduct } from "@/lib/storefront.functions";

export type Option = {
  id: string;
  label: string;
  price: number;
  stock: number;
  image: string | null;
  variantId: string | null;
};

const SIZE_AT_END = /\s*[-–—]?\s*(\d+(?:[.,]\d+)?\s*(?:sheets?|pcs?|pieces?|pods?|capsules?|tablets?|tabs?|wipes?|rolls?|packs?|kg|g|ml|l|litres?|liters?))\s*$/i;

/** Sellers type the main product's size into its name (e.g. "Dylon Colour Catcher 52 Sheets"). Split it out. */
export function splitBaseSize(name: string): { title: string; size: string | null } {
  const m = name.match(SIZE_AT_END);
  if (!m || !m[1] || m.index === undefined || m.index === 0) return { title: name, size: null };
  return { title: name.slice(0, m.index).trim(), size: m[1].trim().toLowerCase() };
}

/** Main product's size: the admin "Size / option" field first, else read from the end of the name. */
export function baseInfo(product: StoreProduct): { title: string; size: string | null } {
  const label = product.size_label?.trim();
  return label ? { title: product.name, size: label.toLowerCase() } : splitBaseSize(product.name);
}

/** Main product first (when its size is in the name), then every variant. */
export function buildOptions(product: StoreProduct): Option[] {
  const { size } = baseInfo(product);
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const options: Option[] = [];
  if (product.variants.length && size && !product.variants.some((v) => norm(v.variant_value) === norm(size))) {
    options.push({ id: "base", label: size, price: product.base_price, stock: product.stock_quantity ?? 0, image: null, variantId: null });
  }
  for (const v of product.variants) {
    options.push({ id: v.id, label: v.variant_value, price: v.price_override ?? product.base_price, stock: v.stock_quantity, image: null, variantId: v.id });
  }
  return options.map((o, i) => ({ ...o, image: product.images[i]?.url ?? product.images[0]?.url ?? null }));
}

export const stockLabel = (stock: number) => (stock > 0 ? "In stock" : "Out of stock");

type Slide = { key: string; image: string | null; option: Option | null };

export function VariantCarousel({ product, options, selectedId, onSelect }: {
  product: StoreProduct; options: Option[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const showCards = options.length >= 2;
  const slides: Slide[] = showCards
    ? options.map((o) => ({ key: o.id, image: o.image, option: o }))
    : product.images.length
      ? product.images.map((img) => ({ key: img.id, image: img.url, option: null }))
      : [{ key: "empty", image: null, option: null }];

  const startIndex = Math.max(0, slides.findIndex((s) => s.option?.id === selectedId));
  const [emblaRef, embla] = useEmblaCarousel({ align: "center", loop: false, containScroll: false, startIndex });
  const [index, setIndex] = useState(startIndex);
  const lastSelected = useRef<string | null>(selectedId);
  const optionIds = options.map((o) => o.id).join("|");

  // swipe / arrows / dots -> remember the slide and select its option
  useEffect(() => {
    if (!embla) return;
    const onSelectSlide = () => {
      const i = embla.selectedScrollSnap();
      setIndex(i);
      const o = slides[i]?.option;
      if (o) { lastSelected.current = o.id; onSelect(o.id); }
    };
    embla.on("select", onSelectSlide);
    return () => { embla.off("select", onSelectSlide); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embla, optionIds, onSelect]);

  // an option picked elsewhere (buttons / cards below) -> scroll to its slide
  useEffect(() => {
    if (!embla || selectedId === lastSelected.current) return;
    lastSelected.current = selectedId;
    const i = slides.findIndex((s) => s.option?.id === selectedId);
    if (i >= 0) embla.scrollTo(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embla, selectedId, optionIds]);

  const prev = useCallback(() => embla?.scrollPrev(), [embla]);
  const next = useCallback(() => embla?.scrollNext(), [embla]);

  return (
    <div className="relative min-w-0 max-w-full">
      <div ref={emblaRef} className="overflow-hidden" aria-roledescription="carousel">
        <div className={`flex touch-pan-y ${showCards ? "-ml-3" : ""}`}>
          {slides.map((slide, i) => {
            const o = slide.option;
            const active = i === index;
            const image = slide.image
              ? <img src={slide.image} alt={o ? `${product.name} ${o.label}` : product.name} width={900} height={900} className="h-full w-full object-contain p-4" draggable={false} />
              : <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="size-14" /><span className="sr-only">Image coming soon</span></div>;
            if (!o) {
              return <div key={slide.key} className="min-w-0 shrink-0 grow-0 basis-full"><div className="aspect-square bg-product">{image}</div></div>;
            }
            return (
              <div key={slide.key} className="min-w-0 shrink-0 grow-0 basis-[72%] pl-3 sm:basis-[46%] lg:basis-[48%]" aria-roledescription="slide">
                <button type="button" onClick={() => embla?.scrollTo(i)} className={`block w-full overflow-hidden bg-card text-left shadow-sm transition-all ${active ? "ring-2 ring-accent" : "opacity-70"}`}>
                  <div className="aspect-square bg-product">{image}</div>
                  <div className="flex items-end justify-between gap-2 border-t border-border px-3 py-3">
                    <p className="min-w-0 truncate font-display text-xl font-semibold leading-tight">{o.label}</p>
                    <div className="text-right">
                      <p className="text-base font-extrabold">{money(o.price)}</p>
                      <p className={`text-[11px] ${o.stock > 0 ? "text-muted-foreground" : "text-destructive"}`}>{stockLabel(o.stock)}</p>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {slides.length > 1 && <>
        <button type="button" onClick={prev} aria-label="Previous" className="absolute left-2 top-[40%] hidden size-9 -translate-y-1/2 place-items-center bg-card/90 shadow sm:grid"><ChevronLeft className="size-5" /></button>
        <button type="button" onClick={next} aria-label="Next" className="absolute right-2 top-[40%] hidden size-9 -translate-y-1/2 place-items-center bg-card/90 shadow sm:grid"><ChevronRight className="size-5" /></button>
        <div className="mt-3 flex justify-center gap-1.5">
          {slides.map((s, i) => <button key={s.key} type="button" aria-label={`Go to slide ${i + 1}`} onClick={() => embla?.scrollTo(i)} className={`h-1.5 transition-all ${i === index ? "w-6 bg-accent" : "w-1.5 bg-border"}`} />)}
        </div>
      </>}
    </div>
  );
}
