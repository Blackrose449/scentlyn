import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ImageIcon, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { getProductPage, type StoreProduct } from "@/lib/storefront.functions";
import { VariantCarousel, buildSlides } from "@/components/storefront/variant-showcase";
import { money, productIdFromSlug, productPath } from "@/lib/storefront";
import { useCart } from "@/lib/cart";

const productQuery=(slug:string)=>{const productId=productIdFromSlug(slug);return queryOptions({queryKey:["product",productId],queryFn:()=>productId?getProductPage({data:{productId}}):Promise.resolve(null),staleTime:60_000})};
export const Route=createFileRoute("/product/$slug")({
  loader:({context,params})=>context.queryClient.ensureQueryData(productQuery(params.slug)),
  head:({params,loaderData})=>{const p=loaderData?.product;if(!p)return {meta:[{title:"Product unavailable — Scentlyn"},{name:"description",content:"This Scentlyn product is currently unavailable."},{property:"og:title",content:"Product unavailable — Scentlyn"},{property:"og:description",content:"This Scentlyn product is currently unavailable."},{property:"og:type",content:"product"},{name:"twitter:card",content:"summary_large_image"},{name:"robots",content:"noindex"}]};const description=p.description?.slice(0,155)??`Shop ${p.name} from Scentlyn with delivery across Kenya.`;return {meta:[{title:`${p.name} — Scentlyn`},{name:"description",content:description},{property:"og:title",content:`${p.name} — Scentlyn`},{property:"og:description",content:description},{property:"og:type",content:"product"},{name:"twitter:card",content:"summary_large_image"}],links:[{rel:"canonical",href:`/product/${params.slug}`}],scripts:[{type:"application/ld+json",children:JSON.stringify({"@context":"https://schema.org","@type":"Product",name:p.name,description:p.description??undefined,brand:p.brand?{"@type":"Brand",name:p.brand}:undefined,image:p.images.map((i)=>i.url),offers:{"@type":"Offer",priceCurrency:"KES",price:p.base_price,availability:"https://schema.org/InStock",url:`/product/${params.slug}`}})}]};},
  component:ProductPage,errorComponent:()=> <Unavailable/>,notFoundComponent:Unavailable,
});
function ProductPage(){
  const {slug}=Route.useParams();
  const {data}=useSuspenseQuery(productQuery(slug));
  if(!data)return <Unavailable/>;
  return <ProductView product={data.product} related={data.related}/>;
}
function ProductView({product,related}:{product:StoreProduct;related:StoreProduct[]}){
  const cart=useCart();
  const groups=useMemo(()=>Object.entries(product.variants.reduce<Record<string,typeof product.variants>>((all,v)=>{(all[v.variant_type]??=[]).push(v);return all},{})),[product.variants]);
  const slides=useMemo(()=>buildSlides(product),[product]);
  const firstInStock=product.variants.find((v)=>v.stock_quantity>0)??product.variants[0];
  const [selectedId,setSelectedId]=useState<string|null>(firstInStock?.id??null);
  const [quantity,setQuantity]=useState(1);
  const [added,setAdded]=useState<string|null>(null);
  const selected=product.variants.find((v)=>v.id===selectedId)??null;
  const price=selected?.price_override??product.base_price;
  const max=selected?selected.stock_quantity:null;
  const select=useCallback((id:string)=>{setSelectedId(id);setQuantity(1)},[]);
  const imageFor=(variantId:string|null)=>slides.find((s)=>s.variant?.id===variantId)?.image??product.images[0]?.url??null;
  const addVariant=(variant:typeof product.variants[number]|null,qty:number)=>{
    if(product.variants.length&&!variant)return;
    cart.addItem({productId:product.id,productSlug:productPath(product),name:product.name,brand:product.brand,image:imageFor(variant?.id??null),variantId:variant?.id??null,variantLabel:variant?`${variant.variant_type}: ${variant.variant_value}`:null,price:variant?.price_override??product.base_price,quantity:qty,maxQuantity:variant?variant.stock_quantity:null});
    setAdded(variant?.id??"base");window.setTimeout(()=>setAdded(null),1600);
  };
  const priceRange=useMemo(()=>{const prices=product.variants.map((v)=>v.price_override??product.base_price);return prices.length?{min:Math.min(...prices),max:Math.max(...prices)}:null},[product]);
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <nav className="text-xs text-muted-foreground"><Link to="/">Home</Link> / {product.category&&<><Link to="/category/$slug" params={{slug:product.category.slug}} search={{sort:"featured"}}>{product.category.name}</Link> / </>}{product.name}</nav>

    {/* Hero */}
    <div className="mt-7 grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
      <VariantCarousel product={product} slides={slides} selectedId={selectedId} onSelect={select}/>
      <div>
        <p className="text-xs font-bold uppercase text-accent">{product.brand??product.category?.name??"Scentlyn pick"}</p>
        <h1 className="mt-2 break-words font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{product.name}</h1>
        <p className="mt-5 text-2xl font-extrabold">{money(price)}{selected&&<span className="ml-2 text-sm font-medium text-muted-foreground">for {selected.variant_value}</span>}</p>
        {priceRange&&priceRange.min!==priceRange.max&&<p className="mt-1 text-xs text-muted-foreground">Range: {money(priceRange.min)} – {money(priceRange.max)} across {product.variants.length} options</p>}
        {groups.map(([type,variants])=><fieldset key={type} className="mt-7"><legend className="mb-3 text-xs font-bold uppercase">{type.replaceAll("_"," ")}</legend>
          <div className="flex flex-wrap gap-2">{variants.map((variant)=><Button key={variant.id} type="button" variant={selectedId===variant.id?"default":"outline"} disabled={variant.stock_quantity===0} onClick={()=>select(variant.id)} className="h-auto flex-col items-start gap-0 px-4 py-2 text-left"><span>{variant.variant_value}</span><span className="text-xs font-normal opacity-80">{money(variant.price_override??product.base_price)}</span></Button>)}</div></fieldset>)}
        {selected&&<p className={`mt-3 text-sm ${selected.stock_quantity<=5?"text-destructive":"text-muted-foreground"}`}>{selected.stock_quantity?`${selected.stock_quantity} available`:"Out of stock"}</p>}
        <div className="mt-8 flex gap-3">
          <div className="grid h-11 grid-cols-3 border border-input bg-card"><Button variant="ghost" size="icon" onClick={()=>setQuantity(Math.max(1,quantity-1))} aria-label="Decrease quantity"><Minus/></Button><span className="grid min-w-10 place-items-center font-bold">{quantity}</span><Button variant="ghost" size="icon" onClick={()=>setQuantity(Math.min(max??50,quantity+1))} aria-label="Increase quantity"><Plus/></Button></div>
          <Button size="lg" className="flex-1" disabled={Boolean(selected&&selected.stock_quantity===0)} onClick={()=>addVariant(selected,quantity)}>{added&&added===(selected?.id??"base")?<><Check/>Added to cart</>:"Add to cart"}</Button>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 border-y border-border py-5 text-xs font-bold uppercase"><span className="flex items-center gap-2"><Truck className="size-6 text-accent"/>Nairobi delivery</span><span className="flex items-center gap-2"><ShieldCheck className="size-6 text-accent"/>100% genuine</span></div>
      </div>
    </div>

    {/* Mini homepage: every variant as its own card */}
    {product.variants.length>1&&<section className="mt-16" aria-labelledby="all-variants">
      <p className="text-xs font-bold uppercase text-accent">Choose your size</p>
      <h2 id="all-variants" className="font-display text-4xl font-semibold italic">All {product.name} options</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {product.variants.map((variant)=>{const vPrice=variant.price_override??product.base_price;const img=imageFor(variant.id);const out=variant.stock_quantity===0;const isSel=variant.id===selectedId;
          return <article key={variant.id} className={`flex min-w-0 flex-col bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md ${isSel?"ring-2 ring-accent":""}`}>
            <button type="button" onClick={()=>{select(variant.id);window.scrollTo({top:0,behavior:"smooth"})}} className="relative block aspect-[4/3] overflow-hidden bg-product" aria-label={`Show ${variant.variant_value}`}>
              {img?<img src={img} alt={`${product.name} ${variant.variant_value}`} loading="lazy" className="h-full w-full object-contain p-3"/>:<div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="size-10"/></div>}
              {out&&<span className="absolute left-2 top-2 bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase text-destructive">Out of stock</span>}
              {!out&&variant.stock_quantity<=5&&<span className="absolute left-2 top-2 bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase text-destructive">Low stock</span>}
            </button>
            <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
              <p className="truncate text-[11px] font-bold uppercase text-muted-foreground">{variant.variant_type.replaceAll("_"," ")}</p>
              <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5">{variant.variant_value}</h3>
              <p className="mt-2 text-lg font-extrabold">{money(vPrice)}</p>
              <Button className="mt-3 w-full" disabled={out} onClick={()=>addVariant(variant,1)}>{added===variant.id?<><Check/>Added</>:out?"Out of stock":"Add to cart"}</Button>
            </div>
          </article>})}
      </div>
    </section>}

    {product.description&&<section className="mt-16 max-w-3xl"><h2 className="font-display text-4xl font-semibold">About this product</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{product.description}</p></section>}

    {related.length>0&&<section className="mt-16"><h2 className="font-display text-4xl font-semibold italic">You may also like</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{related.map((p)=><ProductCard key={p.id} product={p}/>)}</div></section>}
  </div>;
}
function Unavailable(){return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-5xl">This product is unavailable</h1><p className="mt-3 text-muted-foreground">It may have moved or is being restocked.</p><Button className="mt-6" asChild><Link to="/">Continue shopping</Link></Button></div>}
