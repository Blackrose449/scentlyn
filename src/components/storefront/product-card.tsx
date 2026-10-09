import { Link } from "@tanstack/react-router";
import { ArrowRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import type { StoreProduct } from "@/lib/storefront.functions";
import { availablePrice, money, productPath, stockFor } from "@/lib/storefront";

export function ProductCard({product}:{product:StoreProduct}) {
  const cart = useCart(); const path = productPath(product); const image = product.images[0]?.url ?? null; const stock = stockFor(product); const requiresChoice = product.variants.length > 0;
  const add = () => cart.addItem({productId:product.id,productSlug:path,name:product.name,brand:product.brand,image,variantId:null,variantLabel:null,price:product.base_price,quantity:1,maxQuantity:null});
  return <article className="group flex min-w-0 flex-col bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md">
    <Link to="/product/$slug" params={{slug:path}} className="relative block aspect-[4/3] overflow-hidden bg-product">
      {image ? <img src={image} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"/> : <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="size-10"/><span className="sr-only">Image coming soon</span></div>}
      <div className="absolute left-2 top-2 flex flex-col items-start gap-1">{product.is_best_seller && <span className="bg-accent px-2 py-1 text-[10px] font-bold uppercase text-accent-foreground">Best seller</span>}{stock !== null && stock > 0 && stock <= 5 && <span className="bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase text-destructive">Low stock</span>}</div>
    </Link>
    <div className="flex flex-1 flex-col px-1 pb-1 pt-3"><p className="truncate text-[11px] font-bold uppercase text-muted-foreground">{product.brand ?? "Scentlyn pick"}</p><Link to="/product/$slug" params={{slug:path}} className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5 hover:underline">{product.name}</Link><p className="mt-2 font-bold">{money(availablePrice(product))}</p>
      {requiresChoice ? <Button className="mt-3 w-full" asChild><Link to="/product/$slug" params={{slug:path}}>View Products <ArrowRight/></Link></Button> : <Button className="mt-3 w-full" onClick={add}>Add to cart</Button>}
    </div>
  </article>;
}

export function ProductGridSkeleton({count=5}:{count?:number}) { return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({length:count}).map((_,i)=><div key={i} className="bg-card p-3"><div className="aspect-[4/3] animate-pulse bg-muted"/><div className="mt-3 h-3 w-1/3 animate-pulse bg-muted"/><div className="mt-2 h-4 w-4/5 animate-pulse bg-muted"/><div className="mt-4 h-9 animate-pulse bg-muted"/></div>)}</div>; }

export function EmptyProducts({title="Fresh finds are coming soon",body="This collection is being prepared. Please check back shortly."}:{title?:string;body?:string}) { return <div className="border border-dashed border-border bg-card px-6 py-14 text-center"><ImageIcon className="mx-auto size-9 text-accent"/><h2 className="mt-4 font-display text-3xl">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p></div>; }
