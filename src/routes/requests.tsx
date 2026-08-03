import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  REQUEST_STATUS_CLASS,
  REQUEST_STATUS_LABEL,
  REQUEST_STEPS,
  type RequestStatus,
} from "@/lib/requests";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "طلبات التواصل | عقارات منيا القمح الجديدة" },
      {
        name: "description",
        content: "تابع حالة طلبات التواصل مع الإدارة: مُرسل، قيد المراجعة، أو مقبول.",
      },
      { property: "og:title", content: "طلبات التواصل | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "متابعة لحظية لحالة طلبك مع إشعارات فورية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

const STEP_ICON = [Send, Clock, Check];

function RequestsPage() {
  const { user, loading } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("contact_requests")
        .select("id,property_id,message,status,admin_note,created_at")
        .order("created_at", { ascending: false });
      const ids = [...new Set((rows ?? []).map((r) => r.property_id))];
      const { data: props } = ids.length
        ? await supabase.from("properties").select("id,title").in("id", ids)
        : { data: [] };
      const titles = new Map((props ?? []).map((p) => [p.id, p.title]));
      return (rows ?? []).map((r) => ({ ...r, title: titles.get(r.property_id) ?? "وحدة عقارية" }));
    },
    enabled: Boolean(user),
    refetchInterval: 20000,
  });

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
          <h1 className="text-xl font-bold">طلبات التواصل</h1>
          <p className="mt-2 text-sm text-muted-foreground">سجّل الدخول لمتابعة طلباتك.</p>
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
        <h1 className="text-xl font-bold">طلبات التواصل</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تابع حالة كل طلب أرسلته للإدارة، وهتوصلك إشعارات بأي تحديث.
        </p>

        <div className="mt-5 space-y-3">
          {data?.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              لا توجد طلبات بعد. افتح أي وحدة واطلب من الإدارة توصيلك بصاحبها.
            </p>
          )}

          {data?.map((r) => {
            const status = r.status as RequestStatus;
            const activeIndex = REQUEST_STEPS.indexOf(status === "rejected" ? "reviewing" : status);
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/property/$id"
                    params={{ id: r.property_id }}
                    className="font-bold text-primary"
                  >
                    {r.title}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${REQUEST_STATUS_CLASS[status]}`}
                  >
                    {REQUEST_STATUS_LABEL[status]}
                  </span>
                </div>

                {r.message && <p className="mt-2 text-sm text-muted-foreground">{r.message}</p>}

                <ol className="mt-4 flex items-center gap-1">
                  {REQUEST_STEPS.map((step, i) => {
                    const Icon = STEP_ICON[i]!;
                    const done = status !== "rejected" && i <= activeIndex;
                    return (
                      <li key={step} className="flex flex-1 items-center gap-1">
                        <span
                          className={`flex size-7 items-center justify-center rounded-full border ${
                            done
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {REQUEST_STATUS_LABEL[step]}
                        </span>
                        {i < REQUEST_STEPS.length - 1 && (
                          <span
                            className={`h-px flex-1 ${done ? "bg-primary" : "bg-border"}`}
                            aria-hidden
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>

                {r.admin_note && (
                  <p className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
                    رد الإدارة: {r.admin_note}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
