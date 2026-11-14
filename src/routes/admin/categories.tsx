import { LabeledField } from "@/components/ui/labeled-field";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, CheckCircle2, Eye, EyeOff, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminCard, PageHeading } from "@/components/admin/admin-shell";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LabeledSwitch } from "@/components/ui/labeled-switch";
import { deleteCategory, getAdminCategories, saveCategory, saveProductTypes } from "@/lib/admin.functions";
import { slugify } from "@/lib/storefront";

export const Route = createFileRoute("/admin/categories")({ head: () => ({ meta: [{ title: "Categories — Scentlyn admin" }, { name: "description", content: "Manage Scentlyn collections and product types." }, { property: "og:title", content: "Categories — Scentlyn admin" }, { property: "og:description", content: "Manage Scentlyn collections and product types." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: CategoriesPage });

type CatRow = { key: string; id: string | null; name: string; slug: string; slugEdited: boolean; icon_url: string; is_active: boolean };
const uid = () => crypto.randomUUID();

function CategoriesPage() {
  const fn = useServerFn(getAdminCategories);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "categories"], queryFn: () => fn() });
  if (isLoading || !data) return <Skeleton className="h-[600px] w-full" />;
  return <CategoriesView data={data} />;
}

type Data = Awaited<ReturnType<typeof getAdminCategories>>;

function CategoriesView({ data }: { data: Data }) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveCategory);
  const typesFn = useServerFn(saveProductTypes);
  const deleteFn = useServerFn(deleteCategory);

  const [rows, setRows] = useState<CatRow[]>(() =>
    data.categories.map((c) => ({ key: c.id, id: c.id, name: c.name, slug: c.slug, slugEdited: true, icon_url: c.icon_url ?? "", is_active: c.is_active })),
  );
  const [types, setTypes] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const c of data.categories) {
      map[c.id] = data.types
        .filter((t) => t.category_id === c.id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((t) => t.name);
    }
    return map;
  });
  const [newType, setNewType] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatRow | null>(null);

  const update = (key: string, patch: Partial<CatRow>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const move = (index: number, direction: -1 | 1) =>
    setRows((r) => {
      const next = [...r];
      const j = index + direction;
      if (j < 0 || j >= next.length) return r;
      [next[index], next[j]] = [next[j]!, next[index]!];
      return next;
    });

  const setTypesFor = (key: string, next: string[]) => setTypes((t) => ({ ...t, [key]: next }));
  const moveType = (key: string, index: number, direction: -1 | 1) => {
    const list = [...(types[key] ?? [])];
    const j = index + direction;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j]!, list[index]!];
    setTypesFor(key, list);
  };

  function addCategory() {
    setRows((r) => [...r, { key: uid(), id: null, name: "", slug: "", slugEdited: false, icon_url: "", is_active: true }]);
  }

  async function removeCategory(row: CatRow) {
    setConfirmDelete(null);
    if (!row.id) {
      setRows((r) => r.filter((x) => x.key !== row.key));
      return;
    }
    try {
      await deleteFn({ data: { categoryId: row.id } });
      setRows((r) => r.filter((x) => x.key !== row.key));
      toast.success("Category deleted");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const idByKey = new Map<string, string>();
      for (const [index, row] of rows.entries()) {
        if (row.name.trim().length < 2) throw new Error("Every category needs a name of at least 2 letters");
        const result = await saveFn({
          data: {
            id: row.id,
            name: row.name.trim(),
            slug: slugify(row.slug || row.name),
            display_order: index,
            icon_url: row.icon_url || null,
            is_active: row.is_active,
          },
        });
        idByKey.set(row.key, result.categoryId);
      }
      for (const [key, categoryId] of idByKey) {
        const list = (types[key] ?? []).map((n) => n.trim()).filter(Boolean);
        if (list.length || data.types.some((t) => t.category_id === categoryId)) {
          await typesFn({ data: { categoryId, types: list.map((name) => ({ name, display_order: 0 })) } });
        }
      }
      toast.success("Changes saved");
      setSavedAt(Date.now());
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save categories");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Categories"
        description="These collections appear in the header, menu, homepage, footer and shop filters as soon as you save."
        action={
          <div className="flex items-center gap-3">
            {savedAt && !saving ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-status-paid">
                <CheckCircle2 className="size-4" /> Saved — live on the store
              </span>
            ) : null}
            <Button type="button" variant="outline" onClick={addCategory}><Plus className="size-4" /> Add category</Button>
            <Button type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : null}Save changes</Button>
          </div>
        }
      />

      <div className="space-y-4">
        {rows.map((row, index) => {
          const count = row.id ? data.counts[row.id] ?? 0 : 0;
          const list = types[row.key] ?? [];
          return (
            <AdminCard key={row.key} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[auto_8rem_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                <div className="flex gap-1 md:flex-col">
                  <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={index === rows.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></Button>
                </div>
                <ImageUploader
                  multiple={false}
                  folder="categories"
                  label={row.icon_url ? "Change image" : "Upload image"}
                  value={row.icon_url ? [{ id: null, url: row.icon_url }] : []}
                  onChange={(next) => update(row.key, { icon_url: next[0]?.url ?? "" })}
                />
                <div className="space-y-1.5">
                  <LabeledField label="Name"><Input value={row.name} onChange={(e) => update(row.key, { name: e.target.value, slug: row.slugEdited ? row.slug : slugify(e.target.value) })} /></LabeledField>
                </div>
                <div className="space-y-1.5">
                  <LabeledField label="Link"><Input value={row.slug} placeholder={slugify(row.name) || "e.g. laundry"} onChange={(e) => update(row.key, { slug: slugify(e.target.value), slugEdited: e.target.value.length > 0 })} /></LabeledField>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <LabeledSwitch checked={row.is_active} onCheckedChange={(v) => update(row.key, { is_active: v })}  label="Active" />
                    {row.is_active ? <span className="flex items-center gap-1"><Eye className="size-4" /> Shown</span> : <span className="flex items-center gap-1 text-muted-foreground"><EyeOff className="size-4" /> Hidden</span>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${row.name || "category"}`} onClick={() => setConfirmDelete(row)}><Trash2 className="size-4" /></Button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">Product types</p>
                    <p className="text-xs text-muted-foreground">These fill the “Shop by type” filter for this category. {count} product{count === 1 ? "" : "s"} use this category.</p>
                  </div>
                  <div className="flex gap-2">
                    <LabeledField label="New product type" hidden><Input
                      aria-label="New product type"
                      placeholder="Add a type, e.g. Stain Removers"
                      className="h-9 w-56"
                      value={newType[row.key] ?? ""}
                      onChange={(e) => setNewType((t) => ({ ...t, [row.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (newType[row.key] ?? "").trim()) {
                          e.preventDefault();
                          setTypesFor(row.key, [...list, (newType[row.key] ?? "").trim()]);
                          setNewType((t) => ({ ...t, [row.key]: "" }));
                        }
                      }}
                    /></LabeledField>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!(newType[row.key] ?? "").trim()}
                      onClick={() => { setTypesFor(row.key, [...list, (newType[row.key] ?? "").trim()]); setNewType((t) => ({ ...t, [row.key]: "" })); }}
                    ><Plus className="size-4" /> Add</Button>
                  </div>
                </div>
                {list.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {list.map((name, i) => (
                      <li key={`${name}-${i}`} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                        <span className="flex-1">{name}</span>
                        <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => moveType(row.key, i, -1)}><ArrowUp className="size-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === list.length - 1} onClick={() => moveType(row.key, i, 1)}><ArrowDown className="size-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => setTypesFor(row.key, list.filter((_, j) => j !== i))}><X className="size-4" /></Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No product types yet — products still appear; the filter just stays empty.</p>
                )}
              </div>
            </AdminCard>
          );
        })}
      </div>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirmDelete?.name || "this category"}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the category and its product types from the store. It only works when no product still uses it, so move those products to another category first. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && removeCategory(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
