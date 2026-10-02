import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminCard, PageHeading, StatusBadge } from "@/components/admin/admin-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES, getOrderDetail, updateOrder, type AdminOrderRow } from "@/lib/admin.functions";
import { money } from "@/lib/storefront";

export const Route = createFileRoute("/admin/orders/$orderId")({ component: OrderDetailPage });

type Patch = { status?: (typeof ORDER_STATUSES)[number]; payment_status?: "pending" | "paid" | "failed" };

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const detailFn = useServerFn(getOrderDetail);
  const updateFn = useServerFn(updateOrder);
  const key = ["admin", "order", orderId];
  const { data: order, isLoading } = useQuery({ queryKey: key, queryFn: () => detailFn({ data: { orderId } }) });
  const [confirm, setConfirm] = useState<null | { title: string; body: string; patch: Patch }>(null);

  const mutation = useMutation({
    mutationFn: (patch: Patch) => updateFn({ data: { orderId, ...patch } }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AdminOrderRow | null>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (error, _patch, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(error instanceof Error ? error.message : "Update failed");
    },
    onSuccess: () => toast.success("Order updated"),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!order) return <p className="text-sm text-muted-foreground">Order not found.</p>;

  const flow: Patch["status"][] = ["packing", "paid", "delivered"];

  return (
    <>
      <Link to="/admin/orders" search={{}} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <PageHeading
        title={order.order_number}
        description={new Date(order.created_at).toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short" })}
        action={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AdminCard>
          <h2 className="mb-3 text-base font-bold">Items</h2>
          <table className="w-full text-sm">
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-border first:border-t-0">
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold">{item.product_name}</div>
                    {item.variant_label ? <div className="text-xs text-muted-foreground">{item.variant_label}</div> : null}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {item.quantity} × {money(Number(item.unit_price))}
                  </td>
                  <td className="py-2.5 text-right font-semibold">{money(Number(item.line_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(Number(order.subtotal))}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{money(Number(order.delivery_fee))}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{money(Number(order.total))}</dd></div>
          </dl>
        </AdminCard>

        <div className="space-y-6">
          <AdminCard>
            <h2 className="mb-3 text-base font-bold">Update status</h2>
            <div className="flex flex-wrap gap-2">
              {flow.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={order.status === status ? "default" : "outline"}
                  disabled={mutation.isPending || order.status === status}
                  onClick={() => mutation.mutate({ status })}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={mutation.isPending || order.status === "cancelled"}
                onClick={() =>
                  setConfirm({
                    title: "Cancel this order?",
                    body: "The customer's order will be marked as cancelled.",
                    patch: { status: "cancelled" },
                  })
                }
              >
                Cancel order
              </Button>
            </div>
            {mutation.isPending ? <Loader2 className="mt-3 size-4 animate-spin" /> : null}
          </AdminCard>

          <AdminCard>
            <h2 className="mb-3 text-base font-bold">Payment</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>Method</dt><dd className="uppercase">{order.payment_method}</dd></div>
              <div className="flex justify-between"><dt>Status</dt><dd><StatusBadge status={order.payment_status} /></dd></div>
              {order.mpesa_receipt_number ? <div className="flex justify-between"><dt>M-Pesa receipt</dt><dd>{order.mpesa_receipt_number}</dd></div> : null}
              {order.payment_reference ? <div className="flex justify-between gap-3"><dt>Reference</dt><dd className="truncate">{order.payment_reference}</dd></div> : null}
            </dl>
            {order.payment_status !== "paid" ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-4 w-full"
                onClick={() =>
                  setConfirm({
                    title: "Mark as paid manually?",
                    body: "Only do this if you have confirmed the money arrived (for example via your M-Pesa statement).",
                    patch: { payment_status: "paid", status: order.status === "pending" ? "paid" : order.status as Patch["status"] },
                  })
                }
              >
                Mark as paid
              </Button>
            ) : null}
          </AdminCard>

          <AdminCard>
            <h2 className="mb-3 text-base font-bold">Delivery</h2>
            <dl className="space-y-1.5 text-sm">
              <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="font-semibold">{order.customer?.full_name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{order.customer?.phone}</dd></div>
              {order.customer?.email ? <div><dt className="text-xs text-muted-foreground">Email</dt><dd>{order.customer.email}</dd></div> : null}
              <div><dt className="text-xs text-muted-foreground">Zone</dt><dd>{order.zone?.zone_name ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Address</dt><dd className="whitespace-pre-wrap">{order.delivery_address_note || "—"}</dd></div>
            </dl>
          </AdminCard>
        </div>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) mutation.mutate(confirm.patch);
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
