import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ImageIcon, Minus, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { getProductPage, type StoreProduct } from "@/lib/storefront.functions";
import { VariantCarousel, buildOptions, splitBaseSize, stockLabel, type Option } from "@/components/storefront/variant-showcase";
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
  const options=useMemo(()=>buildOptions(product),[product]);
  const {title,size}=splitBaseSize(product.name);
  const displayName=options.length>1&&options[0]?.id==="base"?title:product.name;
  const defaultOption=useMemo(()=>{const mid=options.length>=3?options[Math.floor(options.length/2)]:undefined;return (mid&&mid.stock>0?mid:options.find((o)=>o.stock>0)??options[0])??null},[options]);
  const [selectedId,setSelectedId]=useState<string|null>(defaultOption?.id??null);
  const [quantity,setQuantity]=useState(1);
  const [added,setAdded]=useState<string|null>(null);
  const selected=options.find((o)=>o.id===selectedId)??null;
  const price=selected?.price??product.base_price;
  const inStock=selected?selected.stock>0:true;
  const select=useCallback((id:string)=>{setSelectedId(id);setQuantity(1)},[]);
  const addOption=(option:Option|null,qty:number)=>{
    if(options.length&&!option)return;
    const variant=option?.variantId?product.variants.find((v)=>v.id===option.variantId)??null:null;
    cart.addItem({productId:product.id,productSlug:productPath(product),name:displayName,brand:product.brand,image:option?.image??product.images[0]?.url??null,variantId:variant?.id??null,variantLabel:option?(variant?`${variant.variant_type}: ${variant.variant_value}`:`${size??"Standard"}`):null,price:option?.price??product.base_price,quantity:qty,maxQuantity:option?option.stock:null});
    setAdded(option?.id??"base");window.setTimeout(()=>setAdded(null),1600);
  };
  return <div className="mx-auto max-w-7xl overflow-x-clip px-4 py-8 sm:px-6">
    <nav className="text-xs text-muted-foreground"><Link to="/">Home</Link> / {product.category&&<><Link to="/category/$slug" params={{slug:product.category.slug}} search={{sort:"featured"}}>{product.category.name}</Link> / </>}{displayName}</nav>

    <div className="mt-7 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
      <VariantCarousel product={product} options={options} selectedId={selectedId} onSelect={select}/>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-accent">{product.brand??product.category?.name??"Scentlyn pick"}</p>
        <h1 className="mt-2 break-words font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{displayName}</h1>
        <p className="mt-5 text-2xl font-extrabold">{money(price)}{selected&&options.length>1&&<span className="ml-2 text-sm font-medium text-muted-foreground">for {selected.label}</span>}</p>
        {options.length>1&&<fieldset className="mt-7"><legend className="sr-only">Options</legend>
          <div className="flex flex-wrap gap-2">{options.map((o)=><Button key={o.id} type="button" variant={selectedId===o.id?"default":"outline"} onClick={()=>select(o.id)} className="h-auto flex-col items-start gap-0 px-4 py-2 text-left"><span>{o.label}</span><span className="text-xs font-normal opacity-80">{money(o.price)}</span></Button>)}</div></fieldset>}
        {selected&&<p className={`mt-3 text-sm ${inStock?"text-muted-foreground":"text-destructive"}`}>{stockLabel(selected.stock)}</p>}
        <div className="mt-8 flex gap-3">
          <div className="grid h-11 grid-cols-3 border border-input bg-card"><Button variant="ghost" size="icon" onClick={()=>setQuantity(Math.max(1,quantity-1))} aria-label="Decrease quantity"><Minus/></Button><span className="grid min-w-10 place-items-center font-bold">{quantity}</span><Button variant="ghost" size="icon" onClick={()=>setQuantity(Math.min(selected?Math.max(1,selected.stock):50,quantity+1))} aria-label="Increase quantity"><Plus/></Button></div>
          <Button size="lg" className="min-w-0 flex-1" disabled={!inStock} onClick={()=>addOption(selected,quantity)}>{!inStock?"Out of stock":added&&added===(selected?.id??"base")?<><Check/>Added to cart</>:"Add to cart"}</Button>
        </div>
      </div>
    </div>

    {options.length>1&&<section className="mt-12" aria-label="All options">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {options.map((o)=>{const out=o.stock<=0;const isSel=o.id===selectedId;
          return <article key={o.id} className={`flex min-w-0 flex-col bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md ${isSel?"ring-2 ring-accent":""}`}>
            <button type="button" onClick={()=>{select(o.id);window.scrollTo({top:0,behavior:"smooth"})}} className="relative block aspect-[4/3] overflow-hidden bg-product" aria-label={`Show ${o.label}`}>
              {o.image?<img src={o.image} alt={`${displayName} ${o.label}`} loading="lazy" className="h-full w-full object-contain p-3"/>:<div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="size-10"/></div>}
              {out&&<span className="absolute left-2 top-2 bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase text-destructive">Out of stock</span>}
            </button>
            <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
              <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{o.label}</h3>
              <p className="mt-2 text-lg font-extrabold">{money(o.price)}</p>
              <Button className="mt-3 w-full" disabled={out} onClick={()=>addOption(o,1)}>{added===o.id?<><Check/>Added</>:out?"Out of stock":"Add to cart"}</Button>
            </div>
          </article>})}
      </div>
    </section>}

    {product.description&&<section className="mt-16 max-w-3xl"><h2 className="font-display text-4xl font-semibold">About this product</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{product.description}</p></section>}

    {related.length>0&&<section className="mt-16"><h2 className="font-display text-4xl font-semibold italic">You may also like</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{related.map((p)=><ProductCard key={p.id} product={p}/>)}</div></section>}
  </div>;
}
function Unavailable(){return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-5xl">This product is unavailable</h1><p className="mt-3 text-muted-foreground">It may have moved or is being restocked.</p><Button className="mt-6" asChild><Link to="/">Continue shopping</Link></Button></div>}
