import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AdminCard, PageHeading, StatusBadge } from "@/components/admin/admin-shell";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Json } from "@/integrations/supabase/types";
import { getAdminSettings, saveCategories, saveDeliveryZone, saveSettings } from "@/lib/admin.functions";
import { money } from "@/lib/storefront";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

const text = (s: Record<string, Json>, k: string) => (typeof s[k] === "string" ? (s[k] as string) : "");
const list = (s: Record<string, Json>, k: string) => (Array.isArray(s[k]) ? (s[k] as Json[]).filter((x): x is string => typeof x === "string") : []);

function SaveBar({ saving, savedAt, onSave }: { saving: boolean; savedAt: number | null; onSave: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
      {savedAt && !saving ? (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-status-paid">
          <CheckCircle2 className="size-4" /> Saved — live on the store
        </span>
      ) : null}
      <Button type="button" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}Save changes
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function useSaver() {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const queryClient = useQueryClient();
  async function run(fn: () => Promise<unknown>) {
    setSaving(true);
    try {
      await fn();
      setSavedAt(Date.now());
      toast.success("Changes saved");
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }
  return { saving, savedAt, run };
}

function SettingsPage() {
  const settingsFn = useServerFn(getAdminSettings);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => settingsFn() });
  if (isLoading || !data) return <Skeleton className="h-[600px] w-full" />;
  return (
    <>
      <PageHeading title="Settings" description="Changes go live on the storefront as soon as you save." />
      <Tabs defaultValue="homepage">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="zones">Delivery zones</TabsTrigger>
          <TabsTrigger value="store">Store info</TabsTrigger>
        </TabsList>
        <TabsContent value="homepage"><HomepageTab data={data} /></TabsContent>
        <TabsContent value="categories"><CategoriesTab data={data} /></TabsContent>
        <TabsContent value="zones"><ZonesTab data={data} /></TabsContent>
        <TabsContent value="store"><StoreTab data={data} /></TabsContent>
      </Tabs>
    </>
  );
}

type Data = Awaited<ReturnType<typeof getAdminSettings>>;

function HomepageTab({ data }: { data: Data }) {
  const saveFn = useServerFn(saveSettings);
  const { saving, savedAt, run } = useSaver();
  const s = data.settings;
  const [headline, setHeadline] = useState(text(s, "hero_headline"));
  const [subtext, setSubtext] = useState(text(s, "hero_subtext"));
  const [hero, setHero] = useState(text(s, "hero_image_url"));
  const [badges, setBadges] = useState(() => {
    const b = list(s, "trust_badges");
    return [0, 1, 2, 3].map((i) => b[i] ?? "");
  });
  const [featured, setFeatured] = useState<string[]>(list(s, "featured_product_ids"));
  const [promoText, setPromoText] = useState(text(s, "promo_banner_text"));
  const [promoOn, setPromoOn] = useState(s["promo_banner_enabled"] === true);
  const [pick, setPick] = useState("");

  const productName = (id: string) => data.products.find((p) => p.id === id)?.name ?? "Unavailable product";
  const available = data.products.filter((p) => !featured.includes(p.id));

  return (
    <AdminCard className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Hero headline"><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
        <Field label="Hero subtext"><Textarea rows={2} value={subtext} onChange={(e) => setSubtext(e.target.value)} /></Field>
      </div>
      <Field label="Hero image">
        <ImageUploader multiple={false} folder="site" label={hero ? "Change photo" : "Upload photo"} value={hero ? [{ id: null, url: hero }] : []} onChange={(next) => setHero(next[0]?.url ?? "")} />
      </Field>
      <Field label="Trust badges">
        <div className="grid gap-2 sm:grid-cols-2">
          {badges.map((badge, i) => (
            <Input key={i} placeholder={`Badge ${i + 1}`} value={badge} onChange={(e) => setBadges(badges.map((b, j) => (j === i ? e.target.value : b)))} />
          ))}
        </div>
      </Field>
      <Field label="Featured products (“Our favourites”)">
        <ul className="space-y-1.5">
          {featured.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
              <span className="flex-1 truncate">{productName(id)}</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => setFeatured((f) => { const n = [...f]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; return n; })}><ArrowUp className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => setFeatured((f) => f.filter((x) => x !== id))}><X className="size-4" /></Button>
            </li>
          ))}
          {!featured.length ? <li className="text-sm text-muted-foreground">No products picked — products marked “Featured” are shown instead.</li> : null}
        </ul>
        <div className="flex gap-2 pt-2">
          <select className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a product…</option>
            {available.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== "active" ? " (draft)" : ""}</option>)}
          </select>
          <Button type="button" variant="outline" disabled={!pick} onClick={() => { setFeatured((f) => [...f, pick]); setPick(""); }}><Plus className="size-4" /> Add</Button>
        </div>
      </Field>
      <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Promo banner text"><Input value={promoText} onChange={(e) => setPromoText(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold">Show banner <Switch checked={promoOn} onCheckedChange={setPromoOn} /></label>
      </div>
      <SaveBar
        saving={saving}
        savedAt={savedAt}
        onSave={() =>
          run(() =>
            saveFn({
              data: {
                entries: [
                  { key: "hero_headline", value: headline.trim() },
                  { key: "hero_subtext", value: subtext.trim() },
                  { key: "hero_image_url", value: hero },
                  { key: "trust_badges", value: badges.map((b) => b.trim()).filter(Boolean) },
                  { key: "featured_product_ids", value: featured },
                  { key: "promo_banner_text", value: promoText.trim() },
                  { key: "promo_banner_enabled", value: promoOn },
                ],
              },
            }),
          )
        }
      />
    </AdminCard>
  );
}

function CategoriesTab({ data }: { data: Data }) {
  const saveFn = useServerFn(saveCategories);
  const { saving, savedAt, run } = useSaver();
  const [rows, setRows] = useState(data.categories.map((c) => ({ id: c.id, name: c.name, icon_url: c.icon_url ?? "" })));

  function move(i: number, d: -1 | 1) {
    setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  }

  return (
    <AdminCard className="space-y-4">
      {rows.map((row, i) => (
        <div key={row.id} className="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex gap-1 md:flex-col">
            <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
          </div>
          <Field label={`Category ${i + 1}`}>
            <Input value={row.name} onChange={(e) => setRows((r) => r.map((x) => (x.id === row.id ? { ...x, name: e.target.value } : x)))} />
          </Field>
          <ImageUploader multiple={false} folder="categories" label={row.icon_url ? "Change image" : "Upload image"} value={row.icon_url ? [{ id: null, url: row.icon_url }] : []} onChange={(next) => setRows((r) => r.map((x) => (x.id === row.id ? { ...x, icon_url: next[0]?.url ?? "" } : x)))} />
        </div>
      ))}
      <SaveBar saving={saving} savedAt={savedAt} onSave={() => run(() => saveFn({ data: { categories: rows.map((r, i) => ({ id: r.id, name: r.name.trim(), display_order: i, icon_url: r.icon_url || null })) } }))} />
    </AdminCard>
  );
}

function ZonesTab({ data }: { data: Data }) {
  const saveFn = useServerFn(saveDeliveryZone);
  const { saving, savedAt, run } = useSaver();
  const [rows, setRows] = useState(data.zones.map((z) => ({ key: z.id, id: z.id as string | null, zone_name: z.zone_name, fee: String(z.delivery_fee), is_active: z.is_active })));
  useEffect(() => {
    setRows(data.zones.map((z) => ({ key: z.id, id: z.id as string | null, zone_name: z.zone_name, fee: String(z.delivery_fee), is_active: z.is_active })));
  }, [data.zones]);

  return (
    <AdminCard className="space-y-3">
      <div className="hidden grid-cols-[1fr_9rem_7rem] gap-3 text-xs font-bold uppercase text-muted-foreground md:grid">
        <span>Zone</span><span>Fee (KSh)</span><span>Active</span>
      </div>
      {rows.map((row) => (
        <div key={row.key} className="grid gap-3 md:grid-cols-[1fr_9rem_7rem] md:items-center">
          <Input aria-label="Zone name" value={row.zone_name} onChange={(e) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, zone_name: e.target.value } : x)))} />
          <Input aria-label="Delivery fee" type="number" min={0} value={row.fee} onChange={(e) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, fee: e.target.value } : x)))} />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={row.is_active} onCheckedChange={(v) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, is_active: v } : x)))} />
            <StatusBadge status={row.is_active ? "active" : "draft"} />
          </label>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setRows((r) => [...r, { key: crypto.randomUUID(), id: null, zone_name: "", fee: "0", is_active: true }])}>
        <Plus className="size-4" /> Add zone
      </Button>
      <p className="text-xs text-muted-foreground">Turn a zone off to hide it from checkout without losing past orders. Example: {money(250)} fee.</p>
      <SaveBar
        saving={saving}
        savedAt={savedAt}
        onSave={() =>
          run(async () => {
            for (const r of rows) {
              if (r.zone_name.trim().length < 2) throw new Error("Every zone needs a name");
              await saveFn({ data: { id: r.id, zone_name: r.zone_name.trim(), delivery_fee: Number(r.fee) || 0, is_active: r.is_active } });
            }
          })
        }
      />
    </AdminCard>
  );
}

function StoreTab({ data }: { data: Data }) {
  const saveFn = useServerFn(saveSettings);
  const { saving, savedAt, run } = useSaver();
  const keys = [
    ["store_phone", "Phone number"],
    ["store_whatsapp", "WhatsApp number"],
    ["store_email", "Email address"],
    ["store_hours", "Business hours"],
    ["store_address", "Physical address"],
    ["social_instagram", "Instagram link"],
    ["social_tiktok", "TikTok link"],
    ["social_facebook", "Facebook link"],
  ] as const;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(keys.map(([k]) => [k, text(data.settings, k)])));
  return (
    <AdminCard className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {keys.map(([k, label]) => (
          <Field key={k} label={label}>
            <Input value={values[k] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <SaveBar saving={saving} savedAt={savedAt} onSave={() => run(() => saveFn({ data: { entries: keys.map(([k]) => ({ key: k, value: (values[k] ?? "").trim() })) } }))} />
    </AdminCard>
  );
}
