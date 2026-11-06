import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { lastShopPage, type LastShopPage } from "@/lib/storefront";

/**
 * "Continue shopping" that returns the customer to the shop page they came from
 * (category or product, with its filters), falling back to All products.
 * The remembered page is read after mount so server and browser render the same link first.
 */
export function BackToShopLink({ className, children }: { className?: string; children?: ReactNode }) {
  const [last, setLast] = useState<LastShopPage | null>(null);
  useEffect(() => setLast(lastShopPage()), []);
  const label = children ?? "Continue shopping";
  if (last?.kind === "product") {
    return <Link to="/product/$slug" params={{ slug: last.slug }} className={className}>{label}</Link>;
  }
  if (last?.kind === "category") {
    return <Link to="/category/$slug" params={{ slug: last.slug }} search={last.search as never} className={className}>{label}</Link>;
  }
  return <Link to="/category/$slug" params={{ slug: "all" }} search={{ sort: "featured" }} className={className}>{label}</Link>;
}
