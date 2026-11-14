import { LabeledField } from "@/components/ui/labeled-field";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AdminCard, PageHeading, StatusBadge } from "@/components/admin/admin-shell";
import { ImageUploader, MediaUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LabeledSwitch } from "@/components/ui/labeled-switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Json } from "@/integrations/supabase/types";
import { getAdminSettings, saveDeliveryZone, saveSettings } from "@/lib/admin.functions";
import { money, parseCampaigns, type Campaign } from "@/lib/storefront";

export const Route = createFileRoute("/admin/settings")({ head: () => ({ meta: [{ title: "Settings — Scentlyn admin" }, { name: "description", content: "Manage Scentlyn store content and delivery settings." }, { property: "og:title", content: "Settings — Scentlyn admin" }, { property: "og:description", content: "Manage Scentlyn store content and delivery settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: SettingsPage });

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
  return <div className="space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</div>;
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
          <TabsTrigger value="zones">Delivery zones</TabsTrigger>
          <TabsTrigger value="store">Store info</TabsTrigger>
        </TabsList>
        <TabsContent value="homepage"><HomepageTab data={data} /></TabsContent>
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
  const [eyebrow, setEyebrow] = useState(text(s, "hero_eyebrow"));
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
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => parseCampaigns(s["campaigns"]));

  const productName = (id: string) => data.products.find((p) => p.id === id)?.name ?? "Unavailable product";
  const available = data.products.filter((p) => !featured.includes(p.id));

  return (
    <AdminCard className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Hero introduction"><LabeledField label="Hero introduction" hidden><Input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} /></LabeledField></Field>
        <Field label="Hero headline"><LabeledField label="Hero headline" hidden><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></LabeledField></Field>
        <Field label="Hero subtext"><LabeledField label="Hero subtext" hidden><Textarea rows={2} value={subtext} onChange={(e) => setSubtext(e.target.value)} /></LabeledField></Field>
      </div>
      <Field label="Hero image">
        <ImageUploader multiple={false} folder="site" label={hero ? "Change photo" : "Upload photo"} value={hero ? [{ id: null, url: hero }] : []} onChange={(next) => setHero(next[0]?.url ?? "")} />
      </Field>
      <Field label="Trust badges">
        <div className="grid gap-2 sm:grid-cols-2">
          {badges.map((badge, i) => (
            <LabeledField key={i} label="Trust badge" hidden><Input placeholder={`Badge ${i + 1}`} value={badge} onChange={(e) => setBadges(badges.map((b, j) => (j === i ? e.target.value : b)))} /></LabeledField>
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
          <LabeledField label="Choose product" hidden><select className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a product…</option>
            {available.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== "active" ? " (draft)" : ""}</option>)}
          </select></LabeledField>
          <Button type="button" variant="outline" disabled={!pick} onClick={() => { setFeatured((f) => [...f, pick]); setPick(""); }}><Plus className="size-4" /> Add</Button>
        </div>
      </Field>
      <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Promo banner text (optional one-line strip)"><LabeledField label="Promo banner text (optional one-line strip)" hidden><Input value={promoText} onChange={(e) => setPromoText(e.target.value)} /></LabeledField></Field>
        <div className="flex items-center gap-2 text-sm font-semibold">Show banner <LabeledSwitch checked={promoOn} onCheckedChange={setPromoOn}  label="Show banner" /></div>
      </div>
      <CampaignsEditor campaigns={campaigns} setCampaigns={setCampaigns} products={data.products} />
      <SaveBar
        saving={saving}
        savedAt={savedAt}
        onSave={() =>
          run(() =>
            saveFn({
              data: {
                entries: [
                  { key: "campaigns", value: campaigns as unknown as Json },
                  { key: "hero_eyebrow", value: eyebrow.trim() },
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
          <LabeledField label="Zone name" hidden><Input aria-label="Zone name" value={row.zone_name} onChange={(e) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, zone_name: e.target.value } : x)))} /></LabeledField>
          <LabeledField label="Delivery fee" hidden><Input aria-label="Delivery fee" type="number" min={0} value={row.fee} onChange={(e) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, fee: e.target.value } : x)))} /></LabeledField>
          <div className="flex items-center gap-2 text-sm">
            <LabeledSwitch checked={row.is_active} onCheckedChange={(v) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, is_active: v } : x)))}  label="Active" />
            <StatusBadge status={row.is_active ? "active" : "draft"} />
          </div>
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
  const [tillOn, setTillOn] = useState(data.settings["mpesa_till_enabled"] === true);
  const [tillNumber, setTillNumber] = useState(text(data.settings, "mpesa_till_number"));
  const [tillName, setTillName] = useState(text(data.settings, "mpesa_till_name"));
  return (
    <AdminCard className="space-y-4">
      <div className="space-y-3 rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">M-Pesa Till number</p>
            <p className="text-xs text-muted-foreground">When on, customers who choose M-Pesa can also pay to this Till. Switch it off once Pesapal is live. Paid orders still need to be marked as paid on the order page after you check your M-Pesa statement.</p>
          </div>
          <LabeledSwitch checked={tillOn} onCheckedChange={setTillOn} aria-label="Enable Till payments"  label="Enable Till payments" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Till number"><LabeledField label="Till number" hidden><Input inputMode="numeric" value={tillNumber} onChange={(e) => setTillNumber(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="e.g. 5123456" /></LabeledField></Field>
          <Field label="Name shown to customers (optional)"><LabeledField label="Name shown to customers (optional)" hidden><Input value={tillName} onChange={(e) => setTillName(e.target.value)} placeholder="Business name on the Till" /></LabeledField></Field>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {keys.map(([k, label]) => (
          <Field key={k} label={label}>
            <LabeledField label={label} hidden><Input value={values[k] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} /></LabeledField>
          </Field>
        ))}
      </div>
      <SaveBar saving={saving} savedAt={savedAt} onSave={() => run(() => saveFn({ data: { entries: [...keys.map(([k]) => ({ key: k, value: (values[k] ?? "").trim() })), { key: "mpesa_till_enabled", value: tillOn && tillNumber.length >= 5 }, { key: "mpesa_till_number", value: tillNumber }, { key: "mpesa_till_name", value: tillName.trim() }] } }))} />
    </AdminCard>
  );
}

function CampaignsEditor({ campaigns, setCampaigns, products }: { campaigns: Campaign[]; setCampaigns: (next: Campaign[]) => void; products: Data["products"] }) {
  const update = (id: string, patch: Partial<Campaign>) => setCampaigns(campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const add = () => setCampaigns([...campaigns, { id: crypto.randomUUID().slice(0, 8), title: "", media_type: "image", media_url: "", poster_url: "", product_ids: [], enabled: true, ends_at: "" }]);
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Campaigns</p>
          <p className="text-xs text-muted-foreground">Poster, image or short video shown on the homepage. Link each one to the products it promotes. Remember to press Save changes.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="size-4" /> Add campaign</Button>
      </div>
      {!campaigns.length ? <p className="text-sm text-muted-foreground">No campaigns yet.</p> : null}
      {campaigns.map((c, index) => {
        const available = products.filter((p) => !c.product_ids.includes(p.id));
        return (
          <div key={c.id} className="space-y-3 rounded-md border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <LabeledField label="Campaign title" hidden><Input placeholder="Campaign title, e.g. Laundry Pods offer" value={c.title} onChange={(e) => update(c.id, { title: e.target.value })} /></LabeledField>
              <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => { const n = [...campaigns]; [n[index - 1], n[index]] = [n[index]!, n[index - 1]!]; setCampaigns(n); }}><ArrowUp className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Delete campaign" onClick={() => setCampaigns(campaigns.filter((x) => x.id !== c.id))}><Trash2 className="size-4" /></Button>
            </div>
            <MediaUploader url={c.media_url} type={c.media_type} onChange={(url, type) => update(c.id, { media_url: url, media_type: type, ...(type === "image" ? { poster_url: "" } : {}) })} />
            {c.media_type === "video" && c.media_url ? (
              <Field label="Video cover image (optional — shown while the video loads)">
                <ImageUploader multiple={false} folder="campaigns" label={c.poster_url ? "Change cover" : "Upload cover"} value={c.poster_url ? [{ id: null, url: c.poster_url }] : []} onChange={(next) => update(c.id, { poster_url: next[0]?.url ?? "" })} />
              </Field>
            ) : null}
            <Field label="Linked products">
              <ul className="space-y-1.5">
                {c.product_ids.map((id) => (
                  <li key={id} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                    <span className="flex-1 truncate">{products.find((p) => p.id === id)?.name ?? "Unavailable product"}</span>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => update(c.id, { product_ids: c.product_ids.filter((x) => x !== id) })}><X className="size-4" /></Button>
                  </li>
                ))}
                {!c.product_ids.length ? <li className="text-sm text-muted-foreground">No products linked — the campaign will display without a link. One product opens its page; several open an offer page listing them.</li> : null}
              </ul>
              <LabeledField label="Choose product" hidden><select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value="" onChange={(e) => e.target.value && update(c.id, { product_ids: [...c.product_ids, e.target.value] })}>
                <option value="">Add a product…</option>
                {available.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== "active" ? " (draft)" : ""}</option>)}
              </select></LabeledField>
            </Field>
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Ends on (optional)"><LabeledField label="Campaign end date" hidden><Input type="date" value={c.ends_at} onChange={(e) => update(c.id, { ends_at: e.target.value })} /></LabeledField></Field>
              <div className="flex items-center gap-2 pb-2 text-sm font-semibold">Show on homepage <LabeledSwitch checked={c.enabled} onCheckedChange={(v) => update(c.id, { enabled: v })}  label="Show on homepage" /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
