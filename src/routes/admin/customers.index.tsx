import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AdminCard, PageHeading } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listCustomers } from "@/lib/admin.functions";
import { money } from "@/lib/storefront";

export const Route = createFileRoute("/admin/customers/")({ component: CustomersPage });

function CustomersPage() {
  const listFn = useServerFn(listCustomers);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "customers"], queryFn: () => listFn() });
  const [term, setTerm] = useState("");
  const rows = (data ?? []).filter((c) => {
    const t = term.trim().toLowerCase();
    return !t || c.full_name.toLowerCase().includes(t) || c.phone.includes(t);
  });

  return (
    <>
      <PageHeading title="Customers" description="Built from order history." />
      <AdminCard className="p-4">
        <Input className="mb-4 sm:w-64" placeholder="Search name or phone" value={term} onChange={(e) => setTerm(e.target.value)} />
        {isLoading ? (
          <Skeleton className="h-60 w-full" />
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Orders</th>
                  <th className="py-2">Lifetime spend</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => (
                  <tr key={customer.id} className="border-t border-border">
                    <td className="py-2.5 pr-3 font-semibold">
                      <Link to="/admin/customers/$customerId" params={{ customerId: customer.id }} className="hover:underline">
                        {customer.full_name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">{customer.phone}</td>
                    <td className="py-2.5 pr-3">{customer.orderCount}</td>
                    <td className="py-2.5">{money(customer.lifetimeSpend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">No customers yet.</p>
        )}
      </AdminCard>
    </>
  );
}
