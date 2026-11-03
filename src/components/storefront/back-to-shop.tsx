import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lastShopPage } from "@/lib/storefront";

/**
 * "Continue shopping" that returns the customer to the shop page they came from
 * (category or product, with its filters), falling back to All products.
 */
export function BackToShopLink({ className, children }: { className?: string; children?: ReactNode }) {
  const last = typeof window === "undefined" ? null : lastShopPage();
  if (last?.kind === "product") {
    return <Link to="/product/$slug" params={{ slug: last.slug }} className={className}>{children ?? "Continue shopping"}</Link>;
  }
  if (last?.kind === "category") {
    return (
      <Link to="/category/$slug" params={{ slug: last.slug }} search={last.search as never} className={className}>
        {children ?? "Continue shopping"}
      </Link>
    );
  }
  return (
    <Link to="/category/$slug" params={{ slug: "all" }} search={{ sort: "featured" }} className={className}>
      {children ?? "Continue shopping"}
    </Link>
  );
}
