import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, MapPin, SearchIcon, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FINISHING_TYPES, PROPERTY_TYPES, formatEGP } from "@/lib/app-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchFilters = {
  section: string;
  city: string;
  min: number;
  max: number;
  rooms: number;
  ptype: string;
  finishing: string;
  minArea: number;
};

const EMPTY: SearchFilters = {
  section: "",
  city: "",
  min: 0,
  max: 0,
  rooms: 0,
  ptype: "",
  finishing: "",
  minArea: 0,
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchFilters => ({
    section: search["section"] === "sale" || search["section"] === "rent" ? String(search["section"]) : "",
    city: typeof search["city"] === "string" ? search["city"].slice(0, 60) : "",
    min: Number(search["min"]) > 0 ? Number(search["min"]) : 0,
    max: Number(search["max"]) > 0 ? Number(search["max"]) : 0,
    rooms: Number(search["rooms"]) > 0 ? Number(search["rooms"]) : 0,
    ptype: typeof search["ptype"] === "string" ? search["ptype"].slice(0, 20) : "",
    finishing: typeof search["finishing"] === "string" ? search["finishing"].slice(0, 20) : "",
    minArea: Number(search["minArea"]) > 0 ? Number(search["minArea"]) : 0,
  }),
  head: () => ({
    meta: [
      { title: "بحث وتصفية الوحدات | عقارات منيا القمح الجديدة" },
      {
        name: "description",
        content: "ابحث عن وحدات التمليك والإيجار حسب المدينة والسعر وعدد الغرف في منيا القمح الجديدة.",
      },
      { property: "og:title", content: "بحث وتصفية الوحدات | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "فلترة سريعة للوحدات حسب المدينة والسعر وعدد الغرف ونوع الإعلان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const { user, subscribed } = useAuth();

  const set = (patch: Partial<SearchFilters>) =>
    void navigate({ search: (prev: SearchFilters) => ({ ...prev, ...patch }) });

  const { data = [], isLoading } = useQuery({
    queryKey: ["search", filters],
    queryFn: async () => {
      let q = supabase
        .from("properties")
        .select("id,title,price,city,district,area_m2,rooms,bathrooms,section")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(60);

      if (filters.section) q = q.eq("section", filters.section as "sale" | "rent");
      if (filters.city) q = q.ilike("city", `%${filters.city}%`);
      if (filters.min) q = q.gte("price", filters.min);
      if (filters.max) q = q.lte("price", filters.max);
      if (filters.rooms) q = q.gte("rooms", filters.rooms);
      if (filters.ptype) q = q.eq("property_type", filters.ptype);
      if (filters.finishing) q = q.eq("finishing", filters.finishing);
      if (filters.minArea) q = q.gte("area_m2", filters.minArea);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <AppShell>
        <main className="mt-16 text-center">
          <h1 className="text-xl font-bold">بحث الوحدات</h1>
          <p className="mt-2 text-sm text-muted-foreground">سجّل الدخول للبحث في الوحدات.</p>
          <Button asChild className="mt-4">
            <Link to="/auth">تسجيل الدخول</Link>
          </Button>
        </main>
      </AppShell>
    );
  }

  const hasFilters = Boolean(
    filters.section ||
      filters.city ||
      filters.min ||
      filters.max ||
      filters.rooms ||
      filters.ptype ||
      filters.finishing ||
      filters.minArea,
  );

  return (
    <AppShell>
      <main className="mt-8 space-y-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <SearchIcon className="size-5 text-primary" /> بحث وتصفية الوحدات
        </h1>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div>
            <Label className="text-xs">نوع الإعلان</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { v: "", l: "الكل" },
                { v: "sale", l: "تمليك" },
                { v: "rent", l: "إيجار" },
              ].map((o) => (
                <Button
                  key={o.l}
                  type="button"
                  size="sm"
                  variant={filters.section === o.v ? "default" : "secondary"}
                  onClick={() => set({ section: o.v })}
                >
                  {o.l}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs" htmlFor="city">
              المدينة أو المنطقة
            </Label>
            <Input
              id="city"
              className="mt-2"
              value={filters.city}
              placeholder="مثال: منيا القمح"
              onChange={(e) => set({ city: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs" htmlFor="min">
                السعر من
              </Label>
              <Input
                id="min"
                type="number"
                inputMode="numeric"
                className="mt-2"
                value={filters.min || ""}
                onChange={(e) => set({ min: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="max">
                السعر إلى
              </Label>
              <Input
                id="max"
                type="number"
                inputMode="numeric"
                className="mt-2"
                value={filters.max || ""}
                onChange={(e) => set({ max: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">عدد الغرف (أو أكثر)</Label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={filters.rooms === n ? "default" : "secondary"}
                  onClick={() => set({ rooms: n })}
                >
                  {n === 0 ? "الكل" : `${n}+`}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">نوع العقار</Label>
              <select
                value={filters.ptype}
                onChange={(e) => set({ ptype: e.target.value })}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">الكل</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">التشطيب</Label>
              <select
                value={filters.finishing}
                onChange={(e) => set({ finishing: e.target.value })}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">الكل</option>
                {FINISHING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs" htmlFor="minArea">المساحة من (م²)</Label>
              <Input
                id="minArea"
                type="number"
                inputMode="numeric"
                className="mt-2"
                value={filters.minArea || ""}
                onChange={(e) => set({ minArea: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => void navigate({ search: EMPTY })}
            >
              <X className="size-4" /> مسح الفلاتر
            </Button>
          )}
        </section>

        {!subscribed && (
          <Link
            to="/subscribe"
            className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-card p-4 text-xs"
          >
            <Lock className="size-5 text-primary" />
            <span>النتائج تعرض بيانات أساسية فقط. اشترك لعرض الصور والتفاصيل وطلب التواصل.</span>
          </Link>
        )}

        <section className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "جارٍ البحث…" : `عدد النتائج: ${data.length}`}
          </p>
          {!isLoading && data.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              لا توجد وحدات مطابقة لبحثك. جرّب توسيع نطاق السعر أو تغيير المدينة.
            </p>
          )}
          {data.map((p) => (
            <Link
              key={p.id}
              to="/property/$id"
              params={{ id: p.id }}
              className="block rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{p.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" /> {p.city}
                    {p.district ? ` - ${p.district}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                  {formatEGP(Number(p.price))}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span>{p.section === "rent" ? "إيجار" : "تمليك"}</span>
                {p.area_m2 && <span>{p.area_m2} م²</span>}
                {p.rooms != null && <span>{p.rooms} غرف</span>}
                {p.bathrooms != null && <span>{p.bathrooms} حمام</span>}
              </div>
            </Link>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
