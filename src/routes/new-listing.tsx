import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SECTION_LABEL, type Section } from "@/lib/app-content";
import {
  COMMISSION,
  FINISHING_TYPES,
  LAND_TYPES,
  PROPERTY_TYPES,
} from "@/lib/app-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/new-listing")({
  validateSearch: (s: Record<string, unknown>): { section: Section } => ({
    section: s['section'] === "rent" ? "rent" : "sale",
  }),
  head: () => ({
    meta: [
      { title: "إضافة وحدة عقارية | عقارات منيا القمح الجديدة" },
      { name: "description", content: "ارفع صور وفيديوهات وحدتك واكتب تفاصيلها، والعنوان يظل محجوبًا." },
      { property: "og:title", content: "إضافة وحدة عقارية | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "اعرض وحدتك للبيع أو الإيجار في دقائق." },
    ],
  }),
  component: NewListing,
});

function NewListing() {
  const search = Route.useSearch();
  const section: Section = search.section === "rent" ? "rent" : "sale";
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    area_m2: "",
    rooms: "",
    bathrooms: "",
    city: "",
    district: "",
    address: "",
    contact_phone: "",
    property_type: "apartment",
    floor: "",
    finishing: "",
    features: "",
    land_type: "building",
    in_cordon: "yes",
  });

  const canPublish = roles.includes("seller") || roles.includes("landlord") || roles.includes("admin");
  const isLand = form.property_type === "land";

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 20) {
      toast.error("الحد الأقصى ٢٠ صورة");
      setImages(picked.slice(0, 20));
      return;
    }
    setImages(picked);
  };

  const pickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setVideo(null);
      return;
    }
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      const d = el.duration;
      if (Number.isFinite(d) && (d < 30 || d > 60)) {
        toast.error("مدة الفيديو يجب أن تكون بين ٣٠ و٦٠ ثانية");
        setVideo(null);
        return;
      }
      setVideo(file);
    };
    el.src = URL.createObjectURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { data: prop, error } = await supabase
        .from("properties")
        .insert({
          owner_id: user.id,
          section,
          title: form.title,
          description: form.description,
          price: Number(form.price || 0),
          area_m2: form.area_m2 ? Number(form.area_m2) : null,
          rooms: !isLand && form.rooms ? Number(form.rooms) : null,
          bathrooms: !isLand && form.bathrooms ? Number(form.bathrooms) : null,
          city: form.city,
          district: form.district || null,
          property_type: form.property_type,
          floor: isLand ? null : form.floor || null,
          finishing: isLand ? null : form.finishing || null,
          features: form.features,
          land_type: isLand ? form.land_type : null,
          in_cordon: isLand ? form.in_cordon === "yes" : null,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("property_private").insert({
        property_id: prop.id,
        address: form.address,
        contact_phone: form.contact_phone,
      });

      const uploads = video ? [...images, video] : images;
      for (const [i, file] of uploads.entries()) {
        const path = `${user.id}/${prop.id}/${Date.now()}-${i}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from("property-media").upload(path, file);
        if (up.error) continue;
        await supabase.from("property_media").insert({
          property_id: prop.id,
          url: path,
          media_type: file.type.startsWith("video") ? "video" : "image",
          sort_order: i,
        });
      }

      toast.success("تم إرسال الوحدة لمراجعة الإدارة");
      void navigate({ to: "/listings/$section", params: { section } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر حفظ الوحدة");
    } finally {
      setBusy(false);
    }
  };

  if (!user || !canPublish) {
    return (
      <AppShell>
        <main className="mt-16 text-center text-sm text-muted-foreground">
          <p>هذه الصفحة للبائع أو المؤجر فقط.</p>
          <Button asChild className="mt-4">
            <Link to="/account" search={{ section }}>اختر نوع الحساب</Link>
          </Button>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mt-8">
        <h1 className="text-xl font-bold">إضافة وحدة — {SECTION_LABEL[section]}</h1>
        <form onSubmit={submit} className="mt-5 space-y-4 rounded-3xl border border-border bg-card p-5">
          <Field label="عنوان الإعلان"><Input value={form.title} onChange={set("title")} required /></Field>
          <Field label="الوصف">
            <Textarea value={form.description} onChange={set("description")} rows={4} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع العقار">
              <select
                value={form.property_type}
                onChange={set("property_type")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="السعر (جنيه)"><Input type="number" value={form.price} onChange={set("price")} required /></Field>
            <Field label="المساحة (م²)"><Input type="number" value={form.area_m2} onChange={set("area_m2")} /></Field>
            {!isLand && (
              <>
                <Field label="عدد الغرف"><Input type="number" value={form.rooms} onChange={set("rooms")} /></Field>
                <Field label="عدد الحمامات"><Input type="number" value={form.bathrooms} onChange={set("bathrooms")} /></Field>
                <Field label="الدور"><Input value={form.floor} onChange={set("floor")} placeholder="مثال: الثالث" /></Field>
                <Field label="التشطيب">
                  <select
                    value={form.finishing}
                    onChange={set("finishing")}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">غير محدد</option>
                    {FINISHING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            {isLand && (
              <>
                <Field label="نوع الأرض">
                  <select
                    value={form.land_type}
                    onChange={set("land_type")}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {LAND_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="داخل الكردون؟">
                  <select
                    value={form.in_cordon}
                    onChange={set("in_cordon")}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="yes">داخل الكردون</option>
                    <option value="no">خارج الكردون</option>
                  </select>
                </Field>
              </>
            )}
            <Field label="المدينة"><Input value={form.city} onChange={set("city")} required /></Field>
            <Field label="المنطقة"><Input value={form.district} onChange={set("district")} /></Field>
          </div>

          <Field label="المميزات">
            <Textarea
              value={form.features}
              onChange={set("features")}
              rows={2}
              placeholder="مثال: أسانسير، جراج، تكييفات، إطلالة"
            />
          </Field>

          <p className="rounded-2xl bg-secondary p-3 text-[11px] text-muted-foreground">
            عمولة المنصة: {section === "sale" ? COMMISSION.saleLabel : COMMISSION.rentLabel} — تُحصّل بعد إتمام
            الصفقة عن طريق الإدارة.
          </p>

          <div className="rounded-2xl border border-primary/40 p-4">
            <p className="text-xs text-primary">هذه البيانات لا تظهر لأي مستخدم — الإدارة فقط</p>
            <div className="mt-3 space-y-3">
              <Field label="العنوان التفصيلي"><Input value={form.address} onChange={set("address")} required /></Field>
              <Field label="رقم الموبايل للتواصل"><Input value={form.contact_phone} onChange={set("contact_phone")} required /></Field>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">صور الوحدة (حتى ٢٠ صورة)</Label>
            <Input id="images" type="file" multiple accept="image/*" onChange={pickImages} />
            {images.length > 0 && (
              <p className="text-[11px] text-muted-foreground">تم اختيار {images.length} صورة</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">فيديو للوحدة (٣٠ - ٦٠ ثانية)</Label>
            <Input id="video" type="file" accept="video/*" onChange={pickVideo} />
            {video && <p className="text-[11px] text-muted-foreground">تم اختيار فيديو: {video.name}</p>}
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            <Upload className="size-4" /> نشر الوحدة
          </Button>
        </form>
      </main>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
