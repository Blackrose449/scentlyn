import { createFileRoute } from "@tanstack/react-router";

// Do not expose credential diagnostics or let anonymous probes trigger provider authentication.
export const Route = createFileRoute("/api/public/checkout-health")({
  server: { handlers: { GET: async () => Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } }) } },
});