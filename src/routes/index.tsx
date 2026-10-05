import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CreditCard, Gem, Headphones, ShieldCheck, Truck } from "lucide-react";
import heroFallback from "@/assets/scentlyn-hero.jpg";
import laundryImage from "@/assets/category-laundry.jpg";
import kitchenImage from "@/assets/category-kitchen-cleaning.jpg";
import toiletriesImage from "@/assets/category-toiletries.jpg";
import fragranceImage from "@/assets/category-fragrance.jpg";
import { Button } from "@/components/ui/button";
import { EmptyProducts, ProductCard } from "@/components/storefront/product-card";
import { getStorefrontHome } from "@/lib/storefront.functions";
import { CATEGORY_LABELS, CATEGORY_ORDER, settingBoolean, settingList, settingText } from "@/lib/storefront";

const homeQuery = queryOptions({ queryKey:["storefront-home"], queryFn:()=>getStorefrontHome(), staleTime:60_000 });
const categoryImages: Record<string,string> = {laundry:laundryImage,kitchen:kitchenImage,toiletries:toiletriesImage,fragrance:fragranceImage};
export const Route = createFileRoute("/")({
  loader:({context})=>context.queryClient.ensureQueryData(homeQuery),
  head:()=>({meta:[{title:"Scentlyn — Where freshness meets quality"},{name:"description",content:"Shop laundry, kitchen, toiletries and fragrance essentials delivered across Kenya."},{property:"og:title",content:"Scentlyn — Where freshness meets quality"},{property:"og:description",content:"Beautiful home and personal care essentials delivered across Kenya."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}],links:[{rel:"canonical",href:"/"}]}),
  component:HomePage,
  errorComponent:()=> <HomeMessage title="We’re refreshing the shelves" body="Please try again in a moment."/>,
  notFoundComponent:()=> <HomeMessage title="Welcome to Scentlyn" body="Our fresh collection is on its way."/>,
});

function HomePage(){
  const {data}=useSuspenseQuery(homeQuery); const {settings,featured,categories}=data;
  const catCards=CATEGORY_ORDER.map((slug)=>({slug,cat:categories.find((c)=>c.slug===slug)})).map(({slug,cat})=>({slug,name:cat?.name??CATEGORY_LABELS[slug]??slug,image:cat?.icon_url||categoryImages[slug],order:cat?.display_order??99})).sort((a,b)=>a.order-b.order);
  const heroImage=settingText(settings,"hero_image_url",heroFallback);
  const trust=settingList(settings,"trust_badges");
  return <>
    {settingBoolean(settings,"promo_banner_enabled") && <div className="bg-accent px-4 py-2 text-center text-xs font-bold text-accent-foreground">{settingText(settings,"promo_banner_text")}</div>}
    <section className="relative min-h-[31rem] overflow-hidden bg-secondary sm:min-h-[36rem] lg:min-h-[34rem]">
      <img src={heroImage} alt="Fresh towels and home fragrance" width={1600} height={900} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"/>
      <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/78 to-transparent sm:via-secondary/45"/>
      <div className="relative mx-auto flex min-h-[31rem] max-w-7xl items-center px-5 sm:min-h-[36rem] sm:px-8 lg:min-h-[34rem]">
        <div className="max-w-[22rem] sm:max-w-xl"><h1 className="font-display text-5xl font-semibold leading-[0.9] sm:text-7xl lg:text-8xl">{settingText(settings,"hero_headline","Fresh homes, beautiful scents")}</h1><p className="mt-5 max-w-md text-sm leading-6 sm:text-base">{settingText(settings,"hero_subtext","Laundry, kitchen, toiletries and fragrance essentials delivered across Kenya.")}</p><Button size="lg" className="mt-7 rounded-full px-7" asChild><Link to="/category/$slug" params={{slug:"laundry"}} search={{sort:"featured"}}>Shop now <ArrowRight/></Link></Button></div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-3 py-4 sm:px-5"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{catCards.map(({slug,name,image})=><Link key={slug} to="/category/$slug" params={{slug}} search={{sort:"featured"}} className="group overflow-hidden bg-card shadow-sm"><img src={image} alt={`${name} essentials`} width={928} height={720} loading="lazy" decoding="async" className="aspect-[1.6/1] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"/><div className="flex items-center justify-between px-4 py-3 font-display text-xl font-semibold uppercase"><span>{name}</span><span className="grid size-7 place-items-center rounded-full border border-accent text-accent"><ArrowRight className="size-4"/></span></div></Link>)}</div></section>
    <section className="mx-auto max-w-7xl px-4 py-7"><div className="mb-4 flex items-end justify-between"><h2 className="font-display text-4xl font-semibold italic sm:text-5xl">Our favourites</h2><Link to="/category/$slug" params={{slug:"laundry"}} search={{sort:"featured"}} className="flex items-center gap-1 text-xs font-bold uppercase text-accent">View all <ArrowRight className="size-4"/></Link></div>{featured.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{featured.slice(0,5).map((product)=><ProductCard key={product.id} product={product}/>)}</div> : <EmptyProducts title="Our favourites are being selected" body="Featured products will appear here as soon as the catalogue is published."/>}</section>
    <section className="relative min-h-64 overflow-hidden bg-secondary"><img src={heroFallback} alt="Scentlyn home fragrance and linens" width={1600} height={900} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right opacity-70"/><div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-secondary/70"/><div className="relative mx-auto flex min-h-64 max-w-7xl items-center justify-end px-6"><p className="max-w-lg text-right font-display text-3xl font-semibold sm:text-4xl">Long after the moments fade,<br/>the scent of home remains.</p></div></section>
    <TrustRow labels={trust}/>
  </>;
}
function TrustRow({labels}:{labels:string[]}){const items=[{icon:Gem,label:labels[0]??"Premium brands"},{icon:Truck,label:labels[1]??"Fast & reliable delivery"},{icon:ShieldCheck,label:labels[2]??"Secure payments"},{icon:Headphones,label:labels[3]??"Support when you need us"}];return <section className="bg-secondary"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-border px-4 lg:grid-cols-4 lg:divide-y-0">{items.map(({icon:Icon,label})=><div key={label} className="flex items-center justify-center gap-3 px-3 py-5 text-center text-[10px] font-bold uppercase sm:text-xs"><Icon className="size-7 shrink-0 text-accent"/>{label}</div>)}</div></section>}
function HomeMessage({title,body}:{title:string;body:string}){return <section className="mx-auto max-w-3xl px-5 py-24 text-center"><h1 className="font-display text-5xl">{title}</h1><p className="mt-3 text-muted-foreground">{body}</p></section>}
