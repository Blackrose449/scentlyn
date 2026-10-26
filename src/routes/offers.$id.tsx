import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyProducts, ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { getCampaignPage } from "@/lib/storefront.functions";

const offerQuery = (id: string) => queryOptions({ queryKey: ["offer", id], queryFn: () => getCampaignPage({ data: { id } }), staleTime: 60_000 });

export const Route = createFileRoute("/offers/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(offerQuery(params.id)),
  head: ({ loaderData }) => {
    const title = `${loaderData?.campaign.title || "Offer"} — Scentlyn`;
    return { meta: [{ title }, { property: "og:title", content: title }, ...(loaderData?.campaign.media_type === "image" ? [{ property: "og:image", content: loaderData.campaign.media_url }] : [])] };
  },
  component: OfferPage,
  errorComponent: () => <OfferMessage />,
  notFoundComponent: OfferMessage,
});

function OfferPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(offerQuery(id));
  if (!data) return <OfferMessage />;
  const { campaign, products } = data;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <nav className="text-xs text-muted-foreground"><Link to="/">Home</Link> / {campaign.title || "Offer"}</nav>
      <div className="mt-4 aspect-[16/9] max-h-[28rem] w-full overflow-hidden bg-secondary">
        {campaign.media_type === "video"
          ? <video src={campaign.media_url} poster={campaign.poster_url || undefined} autoPlay muted loop playsInline controls preload="metadata" className="h-full w-full object-cover" />
          : <img src={campaign.media_url} alt={campaign.title || "Promotion"} className="h-full w-full object-cover" />}
      </div>
      {campaign.title && <h1 className="mt-6 font-display text-4xl font-semibold sm:text-5xl">{campaign.title}</h1>}
      <div className="mt-6">
        {products.length
          ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          : <EmptyProducts title="These products are being restocked" body="Please check back shortly." />}
      </div>
    </div>
  );
}
function OfferMessage() {
  return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-5xl">This offer has ended</h1><Button className="mt-6" asChild><Link to="/">Continue shopping</Link></Button></div>;
}
