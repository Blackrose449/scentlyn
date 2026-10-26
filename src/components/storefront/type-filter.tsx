import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { TypeGroup } from "@/lib/storefront";
import { cn } from "@/lib/utils";

type Props = {
  groups: TypeGroup[];
  total: number;
  category?: string | undefined;
  type?: string | undefined;
  onChange: (category?: string, type?: string) => void;
};

const row = "flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm transition-colors";

/** Four main categories first; tapping one expands its product types underneath (one open at a time). */
export function TypeFilter({ groups, total, category, type, onChange }: Props) {
  const [open, setOpen] = useState<string | null>(category ?? (groups.length === 1 ? groups[0]!.slug : null));
  useEffect(() => { if (category) setOpen(category); }, [category]);
  const nothingPicked = !category && !type;

  return (
    <nav aria-label="Shop by type" className="border border-border bg-card">
      {groups.length > 1 && (
        <button type="button" onClick={() => { setOpen(null); onChange(); }} aria-current={nothingPicked ? "true" : undefined}
          className={cn(row, "border-b border-border font-bold", nothingPicked ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>
          <span>All products</span><span className="text-xs font-medium opacity-70">{total}</span>
        </button>
      )}
      {groups.map((g) => {
        const expanded = open === g.slug;
        const categoryActive = (category === g.slug || groups.length === 1) && !type;
        return (
          <div key={g.slug} className="border-b border-border last:border-b-0">
            <button type="button" aria-expanded={expanded} aria-controls={`types-${g.slug}`}
              onClick={() => { if (expanded && groups.length > 1) { setOpen(null); } else { setOpen(g.slug); onChange(g.slug); } }}
              className={cn(row, "font-bold uppercase tracking-wide", categoryActive ? "text-accent" : "hover:bg-secondary")}>
              <span>{g.name}</span>
              <span className="flex items-center gap-2"><span className="text-xs font-medium normal-case opacity-70">{g.count}</span><ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} /></span>
            </button>
            {expanded && (
              <ul id={`types-${g.slug}`} className="bg-secondary/60 pb-1">
                <li><button type="button" onClick={() => onChange(g.slug)} className={cn(row, "py-2.5 pl-6", categoryActive ? "font-bold text-accent" : "hover:underline")}><span>All {g.name}</span></button></li>
                {g.subs.map((s) => {
                  const active = category === g.slug && type === s.name || (groups.length === 1 && type === s.name);
                  return <li key={s.name}><button type="button" aria-current={active ? "true" : undefined} onClick={() => onChange(g.slug, s.name)} className={cn(row, "py-2.5 pl-6", active ? "font-bold text-accent" : "hover:underline")}><span>{s.name}</span><span className="text-xs opacity-70">{s.count}</span></button></li>;
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
