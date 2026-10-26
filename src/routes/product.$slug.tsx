import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ImageIcon, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { getProductPage, type StoreProduct } from "@/lib/storefront.functions";
import { buildOptions, baseInfo, stockLabel, type Option } from "@/components/storefront/variant-showcase";
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
  const {title,size}=baseInfo(product);
  const displayName=options.length>1&&options[0]?.id==="base"?title:product.name;
  const multi=options.length>1;
  const [added,setAdded]=useState<string|null>(null);
  const [quantity,setQuantity]=useState(1);
  // Always open a product at the top of the page (the previous page's scroll position used to carry over, then jump).
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:"instant" as ScrollBehavior})},[product.id]);
  const addOption=(option:Option|null,qty:number)=>{
    if(options.length&&!option)return;
    const variant=option?.variantId?product.variants.find((v)=>v.id===option.variantId)??null:null;
    cart.addItem({productId:product.id,productSlug:productPath(product),name:displayName,brand:product.brand,image:option?.image??product.images[0]?.url??null,variantId:variant?.id??null,variantLabel:option?(variant?`${variant.variant_type}: ${variant.variant_value}`:`${size??"Standard"}`):null,price:option?.price??product.base_price,quantity:qty,maxQuantity:option?option.stock:null});
    setAdded(option?.id??"base");window.setTimeout(()=>setAdded(null),1600);
  };
  const single=options[0]??null;
  const singleStock=single?single.stock>0:true;
  return <div className="mx-auto max-w-7xl overflow-x-clip px-4 py-4 sm:px-6 sm:py-8">
    <nav className="text-xs text-muted-foreground"><Link to="/">Home</Link> / {product.category&&<><Link to="/category/$slug" params={{slug:product.category.slug}} search={{sort:"featured"}}>{product.category.name}</Link> / </>}{displayName}</nav>

    {multi?<>
      <header className="mt-4 max-w-3xl">
        <p className="text-xs font-bold uppercase text-accent">{product.brand??product.category?.name??"Scentlyn pick"}</p>
        <h1 className="mt-1 break-words font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{displayName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{options.length} sizes available — compare and add the one you want.</p>
      </header>
      <section className="mt-6" aria-label="Available sizes">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {options.map((o)=>{const out=o.stock<=0;
            return <article key={o.id} className="flex min-w-0 flex-col bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md">
              <div className="relative aspect-[4/3] overflow-hidden bg-product">
                {o.image?<img src={o.image} alt={`${displayName} ${o.label}`} loading="lazy" className="h-full w-full object-contain p-3"/>:<div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="size-10"/></div>}
                {out&&<span className="absolute left-2 top-2 bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase text-destructive">Out of stock</span>}
              </div>
              <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
                <h2 className="line-clamp-2 min-h-10 font-display text-xl font-semibold leading-5">{o.label}</h2>
                <p className="mt-2 text-lg font-extrabold">{money(o.price)}</p>
                <p className={`text-[11px] ${out?"text-destructive":"text-muted-foreground"}`}>{stockLabel(o.stock)}</p>
                <Button className="mt-3 w-full" disabled={out} onClick={()=>addOption(o,1)}>{added===o.id?<><Check/>Added</>:out?"Out of stock":"Add to cart"}</Button>
              </div>
            </article>})}
        </div>
      </section>
    </>:<div className="mt-3 grid min-w-0 grid-cols-1 gap-5 lg:mt-7 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
      <div className="aspect-square bg-product">{(single?.image??product.images[0]?.url)?<img src={(single?.image??product.images[0]?.url)!} alt={displayName} width={900} height={900} className="h-full w-full object-contain p-4"/>:<div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="size-14"/><span className="sr-only">Image coming soon</span></div>}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-accent">{product.brand??product.category?.name??"Scentlyn pick"}</p>
        <h1 className="mt-1 break-words font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{displayName}</h1>
        <p className="mt-2 text-2xl font-extrabold">{money(single?.price??product.base_price)}{single&&<span className="ml-2 text-sm font-medium text-muted-foreground">for {single.label}</span>}</p>
        {single&&<p className={`mt-2 text-sm ${singleStock?"text-muted-foreground":"text-destructive"}`}>{stockLabel(single.stock)}</p>}
        <div className="mt-4 flex gap-3">
          <div className="grid h-11 grid-cols-3 border border-input bg-card"><Button variant="ghost" size="icon" onClick={()=>setQuantity(Math.max(1,quantity-1))} aria-label="Decrease quantity"><Minus/></Button><span className="grid min-w-10 place-items-center font-bold">{quantity}</span><Button variant="ghost" size="icon" onClick={()=>setQuantity(Math.min(single?Math.max(1,single.stock):50,quantity+1))} aria-label="Increase quantity"><Plus/></Button></div>
          <Button size="lg" className="min-w-0 flex-1" disabled={!singleStock} onClick={()=>addOption(single,quantity)}>{!singleStock?"Out of stock":added?<><Check/>Added to cart</>:"Add to cart"}</Button>
        </div>
      </div>
    </div>}

    {product.description&&<section className="mt-14 max-w-3xl"><h2 className="font-display text-4xl font-semibold">About this product</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{product.description}</p></section>}

    {related.length>0&&<section className="mt-14"><h2 className="font-display text-4xl font-semibold italic">You may also like</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{related.map((p)=><ProductCard key={p.id} product={p}/>)}</div></section>}
  </div>;
}
function Unavailable(){return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-5xl">This product is unavailable</h1><p className="mt-3 text-muted-foreground">It may have moved or is being restocked.</p><Button className="mt-6" asChild><Link to="/">Continue shopping</Link></Button></div>}
