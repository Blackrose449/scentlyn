import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyProducts, ProductCard } from "@/components/storefront/product-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { BackToShopLink } from "@/components/storefront/back-to-shop";
import { getCampaignPage } from "@/lib/storefront.functions";

const offerQuery = (id: string) => queryOptions({ queryKey: ["offer", id], queryFn: () => getCampaignPage({ data: { id } }), staleTime: 60_000 });

export const Route = createFileRoute("/offers/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(offerQuery(params.id)),
  head: ({ loaderData }) => {
    const title = `${loaderData?.campaign.title || "Offer"} — Scentlyn`;
    const description = `Shop ${loaderData?.campaign.title || "current offers"} from Scentlyn, delivered across Kenya.`;
    const image = loaderData?.campaign.media_type === "image" && loaderData.campaign.media_url.startsWith("https://") ? loaderData.campaign.media_url : null;
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : [])] };
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
  return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-5xl">This offer has ended</h1><BackToShopLink className={`${buttonVariants()} mt-6`}>Continue shopping</BackToShopLink></div>;
}
