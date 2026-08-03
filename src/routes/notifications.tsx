import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "الإشعارات | عقارات منيا القمح الجديدة" },
      { name: "description", content: "كل إشعارات طلبات التواصل وتحديثات حالتها في مكان واحد." },
      { property: "og:title", content: "الإشعارات | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "تنبيهات فورية لكل تحديث في طلباتك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();

  const notifications = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,link,read,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: Boolean(user),
    refetchInterval: 20000,
  });

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    void notifications.refetch();
  };

  if (loading) {
    return (
      <AppShell>
        <p className="mt-16 text-center text-sm text-muted-foreground">جارٍ التحميل…</p>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <main className="mt-16 text-center">
          <h1 className="text-xl font-bold">الإشعارات</h1>
          <p className="mt-2 text-sm text-muted-foreground">سجّل الدخول لمتابعة إشعاراتك.</p>
          <Button asChild className="mt-5">
            <Link to="/auth">تسجيل الدخول</Link>
          </Button>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">الإشعارات</h1>
          <Button size="sm" variant="secondary" onClick={() => void markAllRead()}>
            تعليم الكل كمقروء
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {notifications.data?.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              لا توجد إشعارات حالياً.
            </p>
          )}

          {notifications.data?.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border p-4 ${
                n.read ? "border-border bg-card" : "border-primary/40 bg-primary/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <BellRing className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-bold">{n.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("ar-EG")}
                  </p>
                  {n.link === "/admin" ? (
                    <Link to="/admin" className="mt-2 inline-block text-xs text-primary">
                      فتح لوحة الأدمن
                    </Link>
                  ) : (
                    <Link to="/requests" className="mt-2 inline-block text-xs text-primary">
                      متابعة الطلب
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
