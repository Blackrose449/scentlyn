import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";

import { AdminCard, PageHeading, StatusBadge } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomerDetail } from "@/lib/admin.functions";
import { money } from "@/lib/storefront";

export const Route = createFileRoute("/admin/customers/$customerId")({ component: CustomerDetailPage });

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const detailFn = useServerFn(getCustomerDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customer", customerId],
    queryFn: () => detailFn({ data: { customerId } }),
  });

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">Customer not found.</p>;
  const spend = data.orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0);

  return (
    <>
      <Link to="/admin/customers" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All customers
      </Link>
      <PageHeading
        title={data.customer.full_name}
        description={`${data.customer.phone}${data.customer.email ? ` · ${data.customer.email}` : ""} · ${data.orders.length} orders · ${money(spend)} spent`}
      />
      <AdminCard>
        <h2 className="mb-3 text-base font-bold">Order history</h2>
        {data.orders.length ? (
          <table className="w-full text-sm">
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.id} className="border-t border-border first:border-t-0">
                  <td className="py-2.5 pr-3 font-semibold">
                    <Link to="/admin/orders/$orderId" params={{ orderId: order.id }} className="hover:underline">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">{new Date(order.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}</td>
                  <td className="py-2.5 pr-3">{money(Number(order.total))}</td>
                  <td className="py-2.5"><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No orders.</p>
        )}
      </AdminCard>
    </>
  );
}
