import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Heart, ShieldCheck, Truck } from "lucide-react";
import heroFallback from "@/assets/scentlyn-hero-warm-home.jpg";
import laundryImage from "@/assets/category-laundry.jpg";
import kitchenImage from "@/assets/category-kitchen-cleaning.jpg";
import toiletriesImage from "@/assets/category-toiletries.jpg";
import fragranceImage from "@/assets/category-fragrance.jpg";
import scentStoryImage from "@/assets/scent-story-home.jpg";
import { Button } from "@/components/ui/button";
import { EmptyProducts, ProductCard } from "@/components/storefront/product-card";
import { getStorefrontHome } from "@/lib/storefront.functions";
import { CATEGORY_LABELS, CATEGORY_ORDER, settingBoolean, settingList, settingText } from "@/lib/storefront";

const homeQuery = queryOptions({ queryKey:["storefront-home"], queryFn:()=>getStorefrontHome(), staleTime:60_000 });
const categoryImages: Record<string,string> = {laundry:laundryImage,kitchen:kitchenImage,toiletries:toiletriesImage,fragrance:fragranceImage};
export const Route = createFileRoute("/")({
  loader:({context})=>context.queryClient.ensureQueryData(homeQuery),
  head:()=>({meta:[{title:"Scentlyn — Where freshness meets quality"},{name:"description",content:"Shop laundry, kitchen, bathroom and fragrance essentials delivered across Kenya."},{property:"og:title",content:"Scentlyn — Where freshness meets quality"},{property:"og:description",content:"Beautiful home and personal care essentials delivered across Kenya."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}],links:[{rel:"canonical",href:"/"}]}),
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
      <img src={heroImage} alt="Warm living room with cushions, flowers, a candle and diffuser" width={1600} height={900} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"/>
      <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/85 to-transparent sm:via-secondary/55"/>
      <div className="relative mx-auto flex min-h-[31rem] max-w-7xl items-center px-5 sm:min-h-[36rem] sm:px-8 lg:min-h-[34rem]">
        <div className="max-w-[22rem] sm:max-w-xl"><p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] sm:text-sm">{settingText(settings,"hero_eyebrow","FOR HOMES THAT FEEL")}</p><h1 className="font-display text-5xl font-semibold uppercase leading-[0.9] sm:text-7xl lg:text-8xl">{settingText(settings,"hero_headline","AS GOOD AS THEY LOOK.")}</h1><p className="mt-5 max-w-md text-sm leading-6 sm:text-base">{settingText(settings,"hero_subtext","A beautiful home begins with how it feels.")}</p><Button size="lg" className="mt-7 rounded-full px-7" asChild><Link to="/category/$slug" params={{slug:"laundry"}} search={{sort:"featured"}}>Shop now <ArrowRight/></Link></Button></div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-3 py-4 sm:px-5"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{catCards.map(({slug,name,image})=><Link key={slug} to="/category/$slug" params={{slug}} search={{sort:"featured"}} className="group overflow-hidden bg-card shadow-sm"><img src={image} alt={`${name} essentials`} width={928} height={720} loading="lazy" decoding="async" className="aspect-[1.6/1] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"/><div className="flex items-center justify-between px-4 py-3 font-display text-xl font-semibold uppercase"><span>{name}</span><span className="grid size-7 place-items-center rounded-full border border-accent text-accent"><ArrowRight className="size-4"/></span></div></Link>)}</div></section>
    <section className="mx-auto max-w-7xl px-4 py-7"><div className="mb-4 flex items-end justify-between"><h2 className="font-display text-4xl font-semibold italic sm:text-5xl">Our favourites</h2><Link to="/category/$slug" params={{slug:"laundry"}} search={{sort:"featured"}} className="flex items-center gap-1 text-xs font-bold uppercase text-accent">View all <ArrowRight className="size-4"/></Link></div>{featured.length ? <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">{featured.slice(0,8).map((product)=><div key={product.id} className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><ProductCard product={product}/></div>)}</div> : <EmptyProducts title="Our favourites are being selected" body="Featured products will appear here as soon as the catalogue is published."/>}</section>
    <section className="bg-secondary"><div className="mx-auto grid max-w-7xl md:grid-cols-2"><div className="min-h-80 overflow-hidden md:min-h-[30rem]"><img src={scentStoryImage} alt="A warm home with flowers, a candle, diffuser and treasured memories" width={1408} height={1008} loading="lazy" decoding="async" className="h-full w-full object-cover"/></div><div className="flex flex-col justify-center px-6 py-12 sm:px-10 md:py-16 lg:px-16"><p className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Long after the moment fades, the scent remains.<br/><span className="italic">And with it, the memories.</span></p><p className="mt-8 border-l-2 border-accent pl-6 text-base leading-7">The scents we bring into our homes become part of the memories we carry.</p></div></div></section>
    <TrustRow labels={trust}/>
  </>;
}
function TrustRow({labels}:{labels:string[]}){const items=[{icon:BadgeCheck,label:labels[0]??"Genuine Brands"},{icon:Truck,label:labels[1]??"Delivery Across Kenya"},{icon:ShieldCheck,label:labels[2]??"Secure Payments"},{icon:Heart,label:labels[3]??"Quality You Can Trust"}];return <section className="bg-secondary"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-border px-4 lg:grid-cols-4 lg:divide-y-0">{items.map(({icon:Icon,label})=><div key={label} className="flex items-center justify-center gap-3 px-3 py-5 text-center text-[10px] font-bold uppercase sm:text-xs"><Icon className="size-7 shrink-0 text-accent"/>{label}</div>)}</div></section>}
function HomeMessage({title,body}:{title:string;body:string}){return <section className="mx-auto max-w-3xl px-5 py-24 text-center"><h1 className="font-display text-5xl">{title}</h1><p className="mt-3 text-muted-foreground">{body}</p></section>}
