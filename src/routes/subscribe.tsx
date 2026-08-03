import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SUBSCRIPTION_PRICE } from "@/lib/app-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "الاشتراك الشهري 200 جنيه | دارك العقارية" },
      { name: "description", content: "اشترك بـ200 جنيه شهريًا لعرض تفاصيل الوحدات والتواصل عبر الإدارة." },
      { property: "og:title", content: "الاشتراك الشهري 200 جنيه | دارك العقارية" },
      { property: "og:description", content: "صور وفيديوهات وتفاصيل كاملة وطلبات تواصل غير محدودة." },
    ],
  }),
  component: SubscribePage,
});

const perks = [
  "مشاهدة كل صور وفيديوهات الوحدات",
  "الاطلاع على التفاصيل الكاملة للوحدة",
  "إرسال طلب تواصل للإدارة لتوصيلك بالطرف الآخر",
  "أولوية في متابعة طلباتك",
];

function SubscribePage() {
  const { user, subscribed, refresh } = useAuth();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: request, refetch } = useQuery({
    queryKey: ["my-sub", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id,status,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
    enabled: Boolean(user),
  });

  const requestSub = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("subscriptions")
      .insert({ user_id: user.id, payment_note: note, amount_egp: SUBSCRIPTION_PRICE });
    setBusy(false);
    if (error) {
      toast.error("تعذر إرسال طلب الاشتراك");
      return;
    }
    toast.success("تم إرسال طلب الاشتراك للإدارة");
    await refetch();
    await refresh();
  };

  return (
    <AppShell>
      <main className="mt-8">
        <div
          className="rounded-3xl p-6 text-center text-primary-foreground"
          style={{ backgroundImage: "var(--gradient-gold)" }}
        >
          <Crown className="mx-auto size-8" />
          <h1 className="mt-3 text-2xl font-bold">الاشتراك الشهري</h1>
          <p className="mt-1 text-3xl font-black">{SUBSCRIPTION_PRICE} جنيه / شهريًا</p>
        </div>

        <ul className="mt-5 space-y-2">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <Check className="size-4 text-primary" /> {p}
            </li>
          ))}
        </ul>

        {!user ? (
          <Button asChild className="mt-6 w-full">
            <Link to="/auth">سجّل الدخول للاشتراك</Link>
          </Button>
        ) : subscribed ? (
          <p className="mt-6 rounded-2xl border border-primary/40 bg-card p-4 text-center text-sm text-primary">
            اشتراكك مفعّل — استمتع بكل المزايا.
          </p>
        ) : request?.status === "pending" ? (
          <p className="mt-6 rounded-2xl border border-border bg-card p-4 text-center text-sm">
            طلب اشتراكك قيد المراجعة من الإدارة.
          </p>
        ) : (
          <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="طريقة الدفع أو رقم التحويل (اختياري)"
            />
            <Button onClick={() => void requestSub()} disabled={busy} className="w-full">
              إرسال طلب الاشتراك
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              تراجع الإدارة الدفع وتفعّل اشتراكك خلال وقت قصير.
            </p>
          </div>
        )}
      </main>
    </AppShell>
  );
}
