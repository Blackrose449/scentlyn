import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Banknote, PackageCheck, ShoppingCart } from "lucide-react";

import { AdminCard, PageHeading, StatusBadge } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getOverview } from "@/lib/admin.functions";
import { money } from "@/lib/storefront";

export const Route = createFileRoute("/admin/")({ component: OverviewPage });

function OverviewPage() {
  const overviewFn = useServerFn(getOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => overviewFn() });

  const stats = [
    { label: "Orders today", value: data ? String(data.ordersToday) : "", icon: ShoppingCart },
    { label: "Revenue today", value: data ? money(data.revenueToday) : "", icon: Banknote },
    { label: "Pending fulfilment", value: data ? String(data.pendingFulfilment) : "", icon: PackageCheck },
    { label: "Low-stock items", value: data ? String(data.lowStockCount) : "", icon: AlertTriangle },
  ];

  return (
    <>
      <PageHeading title="Overview" description="Today at a glance." />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminCard key={stat.label} className="p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {stat.label}
              <stat.icon className="size-4" />
            </div>
            {isLoading ? <Skeleton className="mt-3 h-8 w-20" /> : <div className="mt-2 text-2xl font-bold">{stat.value}</div>}
          </AdminCard>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AdminCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Recent orders</h2>
            <Link to="/admin/orders" search={{}} className="text-xs font-bold text-accent">
              View all
            </Link>
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : data?.recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Items</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="border-t border-border">
                      <td className="py-2.5 pr-3 font-semibold">
                        <Link to="/admin/orders/$orderId" params={{ orderId: order.id }} className="hover:underline">
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">{order.customer?.full_name ?? "—"}</td>
                      <td className="py-2.5 pr-3">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td className="py-2.5 pr-3">{money(Number(order.total))}</td>
                      <td className="py-2.5">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 text-base font-bold">Low stock</h2>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : data?.lowStock.length ? (
            <ul className="divide-y divide-border text-sm">
              {data.lowStock.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.label}</p>
                  </div>
                  <span className={item.quantity === 0 ? "font-bold text-destructive" : "font-bold"}>{item.quantity} left</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Everything is well stocked.</p>
          )}
        </AdminCard>
      </div>
    </>
  );
}
