import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Lock, MapPin, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SECTION_LABEL, formatEGP, type Section } from "@/lib/app-content";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/listings/$section")({
  head: () => ({
    meta: [
      { title: "الوحدات المتاحة | عقارات منيا القمح الجديدة" },
      { name: "description", content: "تصفح الوحدات المعروضة للتمليك أو الإيجار مع بيانات أساسية آمنة." },
      { property: "og:title", content: "الوحدات المتاحة | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "وحدات مراجعة من الإدارة، والتفاصيل الكاملة للمشتركين." },
    ],
  }),
  component: Listings,
});

function Listings() {
  const { section } = Route.useParams();
  const sec = (section === "rent" ? "rent" : "sale") as Section;
  const { user, roles, subscribed } = useAuth();
  const canPublish = roles.includes("seller") || roles.includes("landlord") || roles.includes("admin");

  const { data, isLoading } = useQuery({
    queryKey: ["properties", sec, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id,title,price,city,district,area_m2,rooms,bathrooms,status,section")
        .eq("section", sec)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <AppShell>
        <EmptyAuth />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{SECTION_LABEL[sec]}</h1>
          {canPublish && (
            <Button asChild size="sm">
              <Link to="/new-listing" search={{ section: sec }}>
                <Plus className="size-4" /> إضافة وحدة
              </Link>
            </Button>
          )}
        </div>

        {!subscribed && (
          <Link
            to="/subscribe"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/40 bg-card p-4 text-xs"
          >
            <Lock className="size-5 text-primary" />
            <span>
              أنت تشاهد بيانات أساسية فقط. اشترك شهريًا لعرض الصور والفيديوهات وطلب التواصل.
            </span>
          </Link>
        )}

        <div className="mt-5 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
          {data?.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              لا توجد وحدات معروضة في هذا القسم حتى الآن.
            </p>
          )}
          {data?.map((p) => (
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
                {p.area_m2 && <span>{p.area_m2} م²</span>}
                {p.rooms != null && <span>{p.rooms} غرف</span>}
                {p.bathrooms != null && <span>{p.bathrooms} حمام</span>}
                {p.status !== "approved" && (
                  <span className="text-primary">
                    {p.status === "pending" ? "بانتظار مراجعة الإدارة" : "مرفوض"}
                  </span>
                )}
              </div>
              <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="size-3" /> العنوان التفصيلي ورقم التواصل محجوبان
              </p>
            </Link>
          ))}
        </div>
      </main>
    </AppShell>
  );
}

function EmptyAuth() {
  return (
    <main className="mt-16 text-center">
      <Building2 className="mx-auto size-10 text-primary" />
      <h1 className="mt-4 text-xl font-bold">سجّل الدخول لعرض الوحدات</h1>
      <Button asChild className="mt-5">
        <Link to="/auth">تسجيل الدخول</Link>
      </Button>
    </main>
  );
}
