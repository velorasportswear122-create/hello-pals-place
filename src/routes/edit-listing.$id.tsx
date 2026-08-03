import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FINISHING_TYPES, LAND_TYPES, PROPERTY_TYPES } from "@/lib/app-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/edit-listing/$id")({
  head: () => ({
    meta: [
      { title: "تعديل الوحدة | عقارات منيا القمح الجديدة" },
      { name: "description", content: "عدّل تفاصيل وحدتك العقارية وسعرها وبيانات التواصل المحجوبة." },
      { property: "og:title", content: "تعديل الوحدة | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "حدّث بيانات وحدتك في أي وقت." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditListing,
});

const empty = {
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
};

function EditListing() {
  const { id } = Route.useParams();
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["edit-property", id],
    queryFn: async () => {
      const [{ data: prop }, { data: priv }] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).maybeSingle(),
        supabase.from("property_private").select("address,contact_phone").eq("property_id", id).maybeSingle(),
      ]);
      return { prop, priv };
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    const p = data?.prop;
    if (!p) return;
    setForm({
      title: p.title ?? "",
      description: p.description ?? "",
      price: String(p.price ?? ""),
      area_m2: p.area_m2 != null ? String(p.area_m2) : "",
      rooms: p.rooms != null ? String(p.rooms) : "",
      bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
      city: p.city ?? "",
      district: p.district ?? "",
      address: data?.priv?.address ?? "",
      contact_phone: data?.priv?.contact_phone ?? "",
      property_type: p.property_type ?? "apartment",
      floor: p.floor ?? "",
      finishing: p.finishing ?? "",
      features: p.features ?? "",
      land_type: p.land_type ?? "building",
      in_cordon: p.in_cordon ? "yes" : "no",
    });
  }, [data]);

  const isLand = form.property_type === "land";
  const canEdit = Boolean(data?.prop) && (isAdmin || data?.prop?.owner_id === user?.id);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({
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
        .eq("id", id);
      if (error) throw error;

      const { error: privError } = await supabase
        .from("property_private")
        .upsert(
          { property_id: id, address: form.address, contact_phone: form.contact_phone },
          { onConflict: "property_id" },
        );
      if (privError) throw privError;

      toast.success("تم حفظ التعديلات");
      void navigate({ to: "/property/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر حفظ التعديلات");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <AppShell>
        <main className="mt-16 text-center text-sm text-muted-foreground">
          <p>سجّل الدخول أولًا</p>
          <Button asChild className="mt-4">
            <Link to="/auth">تسجيل الدخول</Link>
          </Button>
        </main>
      </AppShell>
    );
  }

  if (data && !canEdit) {
    return (
      <AppShell>
        <main className="mt-16 text-center text-sm text-muted-foreground">
          التعديل متاح لصاحب الإعلان أو الإدارة فقط.
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mt-8">
        <h1 className="text-xl font-bold">تعديل الوحدة</h1>
        <form onSubmit={submit} className="mt-5 space-y-4 rounded-3xl border border-border bg-card p-5">
          <Field label="عنوان الإعلان"><Input value={form.title} onChange={set("title")} required /></Field>
          <Field label="الوصف"><Textarea value={form.description} onChange={set("description")} rows={4} /></Field>
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
                <Field label="الدور"><Input value={form.floor} onChange={set("floor")} /></Field>
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

          <Field label="المميزات"><Textarea value={form.features} onChange={set("features")} rows={2} /></Field>

          <div className="rounded-2xl border border-primary/40 p-4">
            <p className="text-xs text-primary">بيانات محجوبة — الإدارة فقط (وتُشارك مع المشترك بعد قبول طلب المعاينة)</p>
            <div className="mt-3 space-y-3">
              <Field label="العنوان التفصيلي"><Input value={form.address} onChange={set("address")} /></Field>
              <Field label="رقم الموبايل للتواصل"><Input value={form.contact_phone} onChange={set("contact_phone")} /></Field>
            </div>
          </div>

          <p className="rounded-2xl bg-secondary p-3 text-[11px] text-muted-foreground">
            ملاحظة: تخفيض السعر يُرسل إشعارًا تلقائيًا للمشتركين.
          </p>

          <Button type="submit" disabled={busy} className="w-full">
            <Save className="size-4" /> حفظ التعديلات
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