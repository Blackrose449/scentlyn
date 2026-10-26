import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { EmptyProducts, ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { getCategoryPage } from "@/lib/storefront.functions";
import { TypeFilter } from "@/components/storefront/type-filter";
import { CATEGORY_LABELS, buildTypeGroups, canonicalType } from "@/lib/storefront";

const searchSchema=z.object({category:z.string().optional(),subcategory:z.string().optional(),sort:z.enum(["featured","price-low","price-high","newest"]).catch("featured")});
const categoryQuery=(slug:string)=>queryOptions({queryKey:["category",slug],queryFn:()=>getCategoryPage({data:{slug}}),staleTime:60_000});
export const Route=createFileRoute("/category/$slug")({
  validateSearch:(search)=>searchSchema.parse(search),
  loader:({context,params})=>context.queryClient.ensureQueryData(categoryQuery(params.slug)),
  head:({params,loaderData})=>{const label=loaderData?.category.name??CATEGORY_LABELS[params.slug]??"Collection";return {meta:[{title:`${label} essentials — Scentlyn`},{name:"description",content:`Shop ${label.toLowerCase()} essentials from Scentlyn, delivered across Kenya.`},{property:"og:title",content:`${label} essentials — Scentlyn`},{property:"og:description",content:`Shop quality ${label.toLowerCase()} essentials delivered across Kenya.`},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}],links:[{rel:"canonical",href:`/category/${params.slug}`} ]}},
  component:CategoryPage,errorComponent:()=> <CategoryMessage title="This collection couldn't load"/>,notFoundComponent:()=> <CategoryMessage title="Collection not found"/>,
});
function CategoryPage(){
  const {slug}=Route.useParams();const search=Route.useSearch();const navigate=Route.useNavigate();
  const {data}=useSuspenseQuery(categoryQuery(slug));
  if(!data)return <CategoryMessage title="Collection not found"/>;
  const isAll=slug==="all";
  const category=isAll?search.category:slug;
  const type=canonicalType(search.subcategory)??undefined;
  const groups=buildTypeGroups(data.products,isAll?undefined:slug);
  let products=data.products.filter((p)=>(!category||p.category?.slug===category||!isAll)&&(!type||canonicalType(p.subcategory)===type));
  products=[...products].sort((a,b)=>search.sort==="price-low"?a.base_price-b.base_price:search.sort==="price-high"?b.base_price-a.base_price:search.sort==="newest"?b.created_at.localeCompare(a.created_at):Number(b.is_featured)-Number(a.is_featured));
  const heading=isAll?(category?CATEGORY_LABELS[category]??data.category.name:data.category.name):data.category.name;
  const pick=(c?:string,t?:string)=>navigate({search:(prev)=>({...prev,category:isAll?c:undefined,subcategory:t})});
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <nav className="text-xs text-muted-foreground"><Link to="/">Home</Link> / {isAll?<Link to="/category/$slug" params={{slug:"all"}} search={{sort:"featured"}}>All products</Link>:data.category.name}{isAll&&category&&<> / {heading}</>}{type&&<> / {type}</>}</nav>
    <h1 className="mt-4 font-display text-5xl font-semibold sm:text-6xl">{type??heading}</h1>
    <div className="mt-8 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
        <p className="mb-3 text-xs font-bold uppercase">Shop by type</p>
        <TypeFilter groups={groups} total={data.products.length} category={category} type={type} onChange={pick}/>
      </aside>
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-4">
          <p className="text-sm text-muted-foreground">{products.length} {products.length===1?"product":"products"}</p>
          <div className="w-40"><p className="mb-1.5 text-xs font-bold uppercase">Sort by</p><Select value={search.sort} onValueChange={(sort)=>navigate({search:(prev)=>({...prev,sort:sort as typeof search.sort})})}><SelectTrigger className="w-full" aria-label="Sort products"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="featured">Featured</SelectItem><SelectItem value="price-low">Price: low</SelectItem><SelectItem value="price-high">Price: high</SelectItem><SelectItem value="newest">Newest</SelectItem></SelectContent></Select></div>
        </div>
        <div className="mt-4">{products.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{products.map((product)=><ProductCard key={product.id} product={product}/>)}</div>:<EmptyProducts title={type||category?"Nothing matches this filter":"This collection is arriving soon"} body={type||category?"Try another product type or view everything.":"Products will appear here as soon as they are published."}/>}</div>
      </div>
    </div>
  </div>}
function CategoryMessage({title}:{title:string}){return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-5xl">{title}</h1><Button className="mt-6" asChild><Link to="/">Return home</Link></Button></div>}
