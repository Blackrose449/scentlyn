import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminCard, PageHeading } from "@/components/admin/admin-shell";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getProductForm, saveProduct } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/products/$productId")({ component: ProductFormPage });

type VariantRow = { key: string; id: string | null; value: string; price: string; stock: string; sku: string };
type Group = { key: string; type: string; rows: VariantRow[] };

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const uid = () => crypto.randomUUID();

function ProductFormPage() {
  const { productId } = Route.useParams();
  const isNew = productId === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formFn = useServerFn(getProductForm);
  const saveFn = useServerFn(saveProduct);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "product-form", productId],
    queryFn: () => formFn({ data: { productId: isNew ? null : productId } }),
  });

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [badge, setBadge] = useState<"none" | "best_seller">("none");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<"active" | "draft">("draft");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = data?.product;
    if (!p) return;
    setName(p.name);
    setBrand(p.brand ?? "");
    setCategoryId(p.category_id ?? "");
    setSubcategory(p.subcategory ?? "");
    setDescription(p.description ?? "");
    setPrice(String(p.base_price));
    setStock(String(p.stock_quantity));
    setBadge(p.is_best_seller ? "best_seller" : "none");
    setFeatured(p.is_featured);
    setStatus(p.status === "active" ? "active" : "draft");
    setImages([...p.images].sort((a, b) => a.display_order - b.display_order).map((i) => ({ id: i.id, url: i.url })));
    const byType = new Map<string, Group>();
    for (const v of p.variants) {
      const g = byType.get(v.variant_type) ?? { key: uid(), type: v.variant_type, rows: [] };
      g.rows.push({ key: uid(), id: v.id, value: v.variant_value, price: v.price_override === null ? "" : String(v.price_override), stock: String(v.stock_quantity), sku: v.sku ?? "" });
      byType.set(v.variant_type, g);
    }
    setGroups([...byType.values()]);
  }, [data]);

  useEffect(() => {
    if (isNew && data?.categories[0] && !categoryId) setCategoryId(data.categories[0].id);
  }, [data, isNew, categoryId]);

  function updateGroup(key: string, patch: (g: Group) => Group) {
    setGroups((gs) => gs.map((g) => (g.key === key ? patch(g) : g)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const variants = groups.flatMap((g) =>
        g.rows
          .filter((r) => r.value.trim())
          .map((r) => ({
            id: r.id,
            variant_type: g.type.trim() || "Option",
            variant_value: r.value.trim(),
            price_override: r.price.trim() ? Number(r.price) : null,
            stock_quantity: Math.max(0, Math.floor(Number(r.stock) || 0)),
            sku: r.sku.trim() || null,
          })),
      );
      const result = await saveFn({
        data: {
          id: isNew ? null : productId,
          name: name.trim(),
          brand: brand.trim() || null,
          category_id: categoryId || null,
          subcategory: subcategory.trim() || null,
          description: description.trim() || null,
          base_price: Number(price) || 0,
          stock_quantity: Math.max(0, Math.floor(Number(stock) || 0)),
          is_featured: featured,
          is_best_seller: badge === "best_seller",
          status,
          variants,
          images,
        },
      });
      toast.success("Product saved");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      if (isNew) navigate({ to: "/admin/products/$productId", params: { productId: result.productId }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!isNew && !data?.product) return <p className="text-sm text-muted-foreground">Product not found.</p>;

  return (
    <form onSubmit={submit}>
      <Link to="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All products
      </Link>
      <PageHeading
        title={isNew ? "Add product" : name || "Edit product"}
        action={<Button type="submit" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : null}Save changes</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminCard className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="name">Name</Label><Input id="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="brand">Brand</Label><Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <select id="category" className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="sub">Subcategory</Label><Input id="sub" placeholder="e.g. Fabric softener" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="price">Base price (KSh)</Label><Input id="price" type="number" min={0} step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="desc">Description</Label><Textarea id="desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </AdminCard>

          <AdminCard className="space-y-3">
            <h2 className="text-base font-bold">Photos</h2>
            <ImageUploader value={images} onChange={setImages} folder="products" hint="Select one or more photos from your device." />
          </AdminCard>

          <AdminCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Variants</h2>
                <p className="text-xs text-muted-foreground">Groups like “Scent” or “Pack size”, each value with its own stock and optional price.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setGroups((g) => [...g, { key: uid(), type: g.length ? "Pack size" : "Scent", rows: [{ key: uid(), id: null, value: "", price: "", stock: "0", sku: "" }] }])}>
                <Plus className="size-4" /> Add group
              </Button>
            </div>
            {groups.map((group) => (
              <div key={group.key} className="rounded-md border border-border p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Input aria-label="Group name" className="max-w-56 font-semibold" value={group.type} onChange={(e) => updateGroup(group.key, (g) => ({ ...g, type: e.target.value }))} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove group" onClick={() => setGroups((gs) => gs.filter((g) => g.key !== group.key))}><Trash2 className="size-4" /></Button>
                </div>
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <span>Value</span><span>Price</span><span>Stock</span><span>SKU</span><span />
                </div>
                {group.rows.map((row) => {
                  const set = (patch: Partial<VariantRow>) => updateGroup(group.key, (g) => ({ ...g, rows: g.rows.map((r) => (r.key === row.key ? { ...r, ...patch } : r)) }));
                  return (
                    <div key={row.key} className="mt-2 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2">
                      <Input placeholder="e.g. Spring awakening" value={row.value} onChange={(e) => set({ value: e.target.value })} />
                      <Input type="number" min={0} placeholder="Base" value={row.price} onChange={(e) => set({ price: e.target.value })} />
                      <Input type="number" min={0} value={row.stock} onChange={(e) => set({ stock: e.target.value })} />
                      <Input value={row.sku} onChange={(e) => set({ sku: e.target.value })} />
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove value" onClick={() => updateGroup(group.key, (g) => ({ ...g, rows: g.rows.filter((r) => r.key !== row.key) }))}><Trash2 className="size-4" /></Button>
                    </div>
                  );
                })}
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => updateGroup(group.key, (g) => ({ ...g, rows: [...g.rows, { key: uid(), id: null, value: "", price: "", stock: "0", sku: "" }] }))}>
                  <Plus className="size-4" /> Add value
                </Button>
              </div>
            ))}
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as "active" | "draft")}>
                <option value="active">Active — visible in shop</option>
                <option value="draft">Draft — hidden</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock">Stock {groups.length ? "(main product's own stock)" : ""}</Label>
              <Input id="stock" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="badge">Badge</Label>
              <select id="badge" className={selectClass} value={badge} onChange={(e) => setBadge(e.target.value as "none" | "best_seller")}>
                <option value="none">None</option>
                <option value="best_seller">Best seller</option>
              </select>
              <p className="text-xs text-muted-foreground">“Low stock” appears automatically when stock runs low.</p>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Featured product
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </label>
          </AdminCard>
        </div>
      </div>
    </form>
  );
}
