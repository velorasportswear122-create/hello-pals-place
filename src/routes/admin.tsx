import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatEGP } from "@/lib/app-content";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الأدمن | دارك العقارية" },
      { name: "description", content: "مراجعة الإعلانات، تفعيل الاشتراكات، ومتابعة طلبات التواصل." },
      { property: "og:title", content: "لوحة الأدمن | دارك العقارية" },
      { property: "og:description", content: "إدارة كاملة للإعلانات والمستخدمين والطلبات." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, roles, loading } = useAuth();
  const isAdmin = roles.includes("admin");

  const props = useQuery({
    queryKey: ["admin-props"],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id,title,price,city,status,section,created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const subs = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id,user_id,status,payment_note,created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const reqs = useQuery({
    queryKey: ["admin-reqs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_requests")
        .select("id,property_id,requester_id,message,handled,created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("properties").update({ status }).eq("id", id);
    if (error) {
      toast.error("تعذر التحديث");
      return;
    }
    toast.success("تم التحديث");
    void props.refetch();
  };

  const activate = async (id: string) => {
    const ends = new Date();
    ends.setMonth(ends.getMonth() + 1);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "active", starts_at: new Date().toISOString(), ends_at: ends.toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("تعذر التفعيل");
      return;
    }
    toast.success("تم تفعيل الاشتراك");
    void subs.refetch();
  };

  if (loading) {
    return (
      <AppShell>
        <p className="mt-16 text-center text-sm text-muted-foreground">جارٍ التحميل…</p>
      </AppShell>
    );
  }

  if (!user || !isAdmin) {
    return (
      <AppShell>
        <main className="mt-16 text-center">
          <h1 className="text-xl font-bold">لوحة الأدمن</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            هذه اللوحة مخصصة للإدارة فقط. يتم منح صلاحية الأدمن من قبل إدارة المنصة.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mt-8">
        <h1 className="text-xl font-bold">لوحة الأدمن</h1>
        <Tabs defaultValue="props" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="props" className="flex-1">الإعلانات</TabsTrigger>
            <TabsTrigger value="subs" className="flex-1">الاشتراكات</TabsTrigger>
            <TabsTrigger value="reqs" className="flex-1">طلبات التواصل</TabsTrigger>
          </TabsList>

          <TabsContent value="props" className="space-y-3">
            {props.data?.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <Link to="/property/$id" params={{ id: p.id }} className="font-bold">
                    {p.title}
                  </Link>
                  <span className="text-xs text-primary">{formatEGP(Number(p.price))}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.city} — {p.section === "sale" ? "تمليك" : "إيجار"} — {p.status}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => void setStatus(p.id, "approved")}>قبول</Button>
                  <Button size="sm" variant="secondary" onClick={() => void setStatus(p.id, "rejected")}>
                    رفض
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="subs" className="space-y-3">
            {subs.data?.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <p>الحالة: {s.status}</p>
                <p className="text-xs text-muted-foreground">{s.payment_note || "بدون ملاحظة دفع"}</p>
                {s.status !== "active" && (
                  <Button size="sm" className="mt-3" onClick={() => void activate(s.id)}>
                    تفعيل الاشتراك
                  </Button>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="reqs" className="space-y-3">
            {reqs.data?.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <Link to="/property/$id" params={{ id: r.property_id }} className="font-bold text-primary">
                  عرض الوحدة
                </Link>
                <p className="mt-1">{r.message || "بدون رسالة"}</p>
                <p className="text-xs text-muted-foreground">{r.handled ? "تمت المتابعة" : "جديد"}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}
