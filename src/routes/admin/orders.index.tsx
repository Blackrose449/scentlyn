import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import { AdminCard, PageHeading, StatusBadge } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES, listOrders } from "@/lib/admin.functions";
import { money } from "@/lib/storefront";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ status: z.string().optional(), q: z.string().optional() });

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: (search) => searchSchema.parse(search),
  component: OrdersPage,
});

function OrdersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const status = search.status ?? "all";
  const [term, setTerm] = useState(search.q ?? "");
  const listFn = useServerFn(listOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, search.q ?? ""],
    queryFn: () => listFn({ data: { status, search: search.q } }),
  });

  return (
    <>
      <PageHeading title="Orders" description="Every order placed on the store." />
      <AdminCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {["all", ...ORDER_STATUSES].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => navigate({ search: { ...search, status: value === "all" ? undefined : value } })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold capitalize",
                  status === value ? "border-accent text-accent" : "border-border text-foreground/70 hover:text-foreground",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <form
            className="ml-auto w-full sm:w-64"
            onSubmit={(event) => {
              event.preventDefault();
              navigate({ search: { ...search, q: term.trim() || undefined } });
            }}
          >
            <Input placeholder="Search name, phone or order #" value={term} onChange={(e) => setTerm(e.target.value)} />
          </form>
        </div>

        <div className="mt-4 overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : data?.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Payment</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="py-2.5 pr-3 font-semibold">
                      <Link to="/admin/orders/$orderId" params={{ orderId: order.id }} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{new Date(order.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="py-2.5 pr-3">
                      <div>{order.customer?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{order.customer?.phone}</div>
                    </td>
                    <td className="py-2.5 pr-3 uppercase text-xs">
                      {order.payment_method} · <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="py-2.5 pr-3">{money(Number(order.total))}</td>
                    <td className="py-2.5">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No orders match.</p>
          )}
        </div>
      </AdminCard>
    </>
  );
}
