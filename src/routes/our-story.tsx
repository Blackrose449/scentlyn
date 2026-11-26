import { createFileRoute } from "@tanstack/react-router";
import { OurStory } from "@/components/storefront/our-story";

const title = "Our Story — Scentlyn";
const description = "A beautiful home is a feeling. Discover the story behind Scentlyn's freshness and quality home essentials in Kenya.";
export const Route = createFileRoute("/our-story")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }], links: [{ rel: "canonical", href: "/our-story" }] }),
  component: () => <OurStory as="h1" />,
});
