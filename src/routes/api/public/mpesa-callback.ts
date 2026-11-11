import { createFileRoute } from "@tanstack/react-router";

// New payments use verified Pesapal IPNs. Unsigned Daraja payloads must never write orders.
export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: { handlers: { POST: async () => Response.json({ error: "This payment endpoint is retired." }, { status: 410 }) } },
});