type SearchVariant = { id?: string; variant_type?: string | null; variant_value: string; price_override?: number | null };
type SearchProduct = {
  name: string;
  brand?: string | null;
  description?: string | null;
  subcategory?: string | null;
  size_label?: string | null;
  category?: { name: string; slug: string } | null;
  category_slugs?: string[];
  variants?: SearchVariant[];
};

const UNIT_ALIASES: [RegExp, string][] = [
  [/^(l|lt|ltr|ltrs|litre|litres|liter|liters)$/, "l"],
  [/^(ml|mls|millilitre|millilitres|milliliter|milliliters)$/, "ml"],
  [/^(kg|kgs|kilo|kilos|kilogram|kilograms)$/, "kg"],
  [/^(g|gm|gms|gram|grams)$/, "g"],
  [/^(wash|washes|load|loads)$/, "wash"],
  [/^(pod|pods|capsule|capsules)$/, "pod"],
  [/^(sheet|sheets)$/, "sheet"],
  [/^(pc|pcs|piece|pieces|pack|packs)$/, "pack"],
];
const unit = (u: string) => UNIT_ALIASES.find(([re]) => re.test(u))?.[1] ?? u;

/** Lower-cases, joins numbers to units ("1 litre" → "1l", "pack of 6" → "6pack") and splits into tokens. */
export function tokenize(text: string): string[] {
  const s = text.toLowerCase().replace(/pack\s+of\s+(\d+)/g, "$1 pack").replace(/[^a-z0-9.\s]/g, " ");
  const raw = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i]!;
    const glued = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(t);
    if (glued) { out.push(`${Number(glued[1])}${unit(glued[2]!)}`); continue; }
    const next = raw[i + 1];
    if (/^\d+(?:\.\d+)?$/.test(t) && next && /^[a-z]+$/.test(next) && UNIT_ALIASES.some(([re]) => re.test(next))) { out.push(`${Number(t)}${unit(next)}`); i++; continue; }
    out.push(/^[a-z]+$/.test(t) ? unit(t) : t);
  }
  return out;
}

function within1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
/** Exact/prefix match, or one typo for words of 5+ letters. Sizes ("1l") must match exactly. */
function tokenHit(q: string, field: string[]): boolean {
  const isSize = /^\d/.test(q);
  const bareNumber = /^\d+(?:\.\d+)?$/.test(q);
  return field.some((f) => f === q || (bareNumber && f.startsWith(q) && /^[a-z]/.test(f.slice(q.length))) || (!isSize && f.startsWith(q)) || (!isSize && q.length >= 5 && within1(q, f)));
}

export type SearchMatch = { score: number; variantId: string | null; variantLabel: string | null; price: number | null };

/** Ranks a product: name > variant > size/wash count > category/brand/description. Every query word must hit somewhere. */
export function scoreProductSearch(product: SearchProduct, query: string, categories: { name: string; slug: string }[] = []): SearchMatch | null {
  const terms = tokenize(query);
  if (!terms.length) return { score: 0, variantId: null, variantLabel: null, price: null };
  const name = tokenize(product.name);
  const size = tokenize(product.size_label ?? "");
  const other = tokenize([product.brand, product.description, product.subcategory, product.category?.name, product.category?.slug,
    ...(product.category_slugs ?? []), ...categories.filter((c) => product.category_slugs?.includes(c.slug)).map((c) => c.name)].filter(Boolean).join(" "));
  const variants = (product.variants ?? []).map((v) => ({ v, tokens: tokenize(`${v.variant_type ?? ""} ${v.variant_value}`) }));
  let best: SearchMatch | null = null;
  for (const cand of [null, ...variants]) {
    let score = 0;
    let ok = true;
    let variantHits = 0;
    for (const t of terms) {
      if (tokenHit(t, name)) score += name.includes(t) ? 10 : 7;
      else if (cand && tokenHit(t, cand.tokens)) { score += /^\d/.test(t) ? 5 : 6; variantHits++; }
      else if (tokenHit(t, size)) score += 5;
      else if (tokenHit(t, other)) score += 2;
      else { ok = false; break; }
    }
    if (!ok) continue;
    if (terms.join(" ") === name.join(" ")) score += 20;
    const m: SearchMatch = cand && variantHits
      ? { score, variantId: cand.v.id ?? null, variantLabel: cand.v.variant_value, price: cand.v.price_override ?? null }
      : { score, variantId: null, variantLabel: null, price: null };
    if (!best || m.score > best.score) best = m;
  }
  return best;
}

export function matchesProductSearch(product: SearchProduct, query: string, categories: { name: string; slug: string }[] = []): boolean {
  return scoreProductSearch(product, query, categories) !== null;
}
