import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/sitemap.xml")({
  server: { handlers: { GET: async ({ request }) => {
    const origin = new URL(request.url).origin;
    const paths = ["/", "/category/all"];
    try {
      const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth: { persistSession: false } });
      const { data: cats } = await sb.from("categories").select("slug").eq("is_active", true).order("display_order");
      cats?.forEach((c) => paths.push(`/category/${c.slug}`));
      const { data: prods } = await sb.from("products").select("slug").eq("is_active", true).is("archived_at", null).limit(500);
      prods?.forEach((p) => paths.push(`/product/${p.slug}`));
    } catch { /* fall back to core pages */ }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${origin}${p}</loc></url>`).join("")}</urlset>`;
    return new Response(xml, { headers: { "content-type": "application/xml", "cache-control": "public, max-age=3600" } });
  } } },
});
