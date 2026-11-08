import { createFileRoute } from "@tanstack/react-router";

/**
 * Checkout setup self-test for any host (Lovable, Vercel, Netlify).
 * Reports only yes/no checks — never key values or anything derived from them —
 * and runs a no-op checkout call that returns before any data is written.
 */
const STORE_PROJECT_REF = "kgwwnsfuebrimqecbnis";

export const Route = createFileRoute("/api/public/checkout-health")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env["SUPABASE_URL"] ?? "";
        const hasUrl = url.length > 0;
        const hasServiceKey = Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);
        const checks: Record<string, boolean | string> = {
          SUPABASE_URL_set: hasUrl,
          SUPABASE_URL_points_to_scentlyn_database: hasUrl && url.includes(STORE_PROJECT_REF),
          SUPABASE_SERVICE_ROLE_KEY_set: hasServiceKey,
          PESAPAL_CONSUMER_KEY_set: Boolean(process.env["PESAPAL_CONSUMER_KEY"]),
          PESAPAL_CONSUMER_SECRET_set: Boolean(process.env["PESAPAL_CONSUMER_SECRET"]),
          PESAPAL_IPN_ID_set: Boolean(process.env["PESAPAL_IPN_ID"]),
        };

        let canSaveOrders = false;
        let problem = "";
        if (!hasUrl || !hasServiceKey) {
          problem = "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing on this host. Add it and redeploy.";
        } else {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            // A missing checkout key makes the database return immediately without writing anything.
            const { data, error } = await supabaseAdmin.rpc("create_checkout_order", {
              p_full_name: "", p_phone: "", p_email: "", p_delivery_zone_id: null as unknown as string,
              p_delivery_address_note: "", p_payment_method: "cod", p_mpesa_mode: "",
              p_items: [], p_checkout_key: null as unknown as string,
            });
            if (error) {
              problem =
                error.code === "42501"
                  ? "The SUPABASE_SERVICE_ROLE_KEY on this host is not the service_role key (it looks like the anon/public key). Copy the service_role key from Supabase → Project Settings → API, then redeploy."
                  : error.message.toLowerCase().includes("invalid api key") || error.message.includes("JWT")
                    ? "The SUPABASE_SERVICE_ROLE_KEY on this host is invalid or belongs to another Supabase project. Re-copy it and redeploy."
                    : `Database refused the checkout check (${error.code ?? "unknown"}): ${error.message}`;
            } else if (data && typeof data === "object") {
              canSaveOrders = true;
            } else {
              problem = "The database answered unexpectedly.";
            }
          } catch (err) {
            problem = `Could not reach the database: ${err instanceof Error ? err.message : "unknown error"}`;
          }
        }

        return Response.json(
          { can_save_orders: canSaveOrders, problem: problem || null, checks },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
