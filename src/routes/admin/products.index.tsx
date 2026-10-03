import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminCard, PageHeading, StatusBadge } from "@/components/admin/admin-shell";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listProducts, setProductArchived } from "@/lib/admin.functions";
import { money } from "@/lib/storefront";

export const Route = createFileRoute("/admin/products/")({ component: ProductsPage });

function ProductsPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listProducts);
  const archiveFn = useServerFn(setProductArchived);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "products"], queryFn: () => listFn() });
  const [term, setTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  const archive = useMutation({
    mutationFn: (input: { productId: string; archived: boolean }) => archiveFn({ data: input }),
    onSuccess: (_r, input) => {
      toast.success(input.archived ? "Product archived" : "Product restored");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rows = (data?.products ?? []).filter((p) => {
    if (Boolean(p.archived_at) !== showArchived) return false;
    const t = term.trim().toLowerCase();
    return !t || p.name.toLowerCase().includes(t) || (p.brand ?? "").toLowerCase().includes(t);
  });

  return (
    <>
      <PageHeading
        title="Products"
        description="Everything in your catalogue."
        action={
          <Button asChild>
            <Link to="/admin/products/$productId" params={{ productId: "new" }}>
              <Plus className="size-4" /> Add product
            </Link>
          </Button>
        }
      />
      <AdminCard className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input className="sm:w-64" placeholder="Search products" value={term} onChange={(e) => setTerm(e.target.value)} />
          <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Show live products" : "Show archived"}
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-60 w-full" />
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Stock</th>
                  <th className="py-2 pr-3">Featured</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => {
                  const image = [...product.images].sort((a, b) => a.display_order - b.display_order)[0];
                  const stock = product.variants.length
                    ? product.variants.reduce((s, v) => s + v.stock_quantity, 0)
                    : product.stock_quantity;
                  return (
                    <tr key={product.id} className="border-t border-border">
                      <td className="py-2 pr-3">
                        <Link to="/admin/products/$productId" params={{ productId: product.id }} className="flex items-center gap-3 hover:underline">
                          <span className="size-11 shrink-0 overflow-hidden rounded border border-border bg-product">
                            {image ? <img src={image.url} alt="" className="size-full object-cover" loading="lazy" /> : null}
                          </span>
                          <span>
                            <span className="block font-semibold">{product.name}</span>
                            <span className="block text-xs text-muted-foreground">{product.brand}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{product.category?.name ?? "—"}</td>
                      <td className="py-2 pr-3">{money(Number(product.base_price))}</td>
                      <td className={stock <= 8 ? "py-2 pr-3 font-bold text-destructive" : "py-2 pr-3"}>{stock}</td>
                      <td className="py-2 pr-3">{product.is_featured ? <Star className="size-4 fill-accent text-accent" /> : "—"}</td>
                      <td className="py-2 pr-3"><StatusBadge status={product.status} /></td>
                      <td className="py-2 text-right">
                        {showArchived ? (
                          <Button size="sm" variant="ghost" onClick={() => archive.mutate({ productId: product.id, archived: false })}>Restore</Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setTarget({ id: product.id, name: product.name })}>Delete</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">{showArchived ? "No archived products." : "No products yet — add your first one."}</p>
        )}
      </AdminCard>

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{target?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the shop and moved to the archive. Past orders keep their details, and you can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (target) archive.mutate({ productId: target.id, archived: true }); setTarget(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
