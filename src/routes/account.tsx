import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, ChevronLeft, Lock, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import cityImg from "@/assets/city.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { SECTION_LABEL, type Section } from "@/lib/app-content";

type Search = { section: Section };

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    section: search['section'] === "rent" ? "rent" : "sale",
  }),
  head: () => ({
    meta: [
      { title: "اختر نوع الحساب | عقارات منيا القمح الجديدة" },
      { name: "description", content: "اختر نوع حسابك المناسب: بائع، مشتري، مؤجر، مستأجر أو أدمن." },
      { property: "og:title", content: "اختر نوع الحساب | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "حدد دورك داخل قسم التمليك أو قسم الإيجار وابدأ فورًا." },
    ],
  }),
  component: AccountPage,
});

const OPTIONS: Record<Section, { role: AppRole; title: string; sub: string; color: string }[]> = {
  sale: [
    { role: "seller", title: "بائع", sub: "أضف وحدتك العقارية للبيع وأوصلها للمشترين", color: "bg-emerald-600" },
    { role: "buyer", title: "مشتري", sub: "ابحث عن العقارات المناسبة وتواصل بأمان", color: "bg-blue-600" },
  ],
  rent: [
    { role: "landlord", title: "مؤجر", sub: "أضف وحدتك للإيجار وأوصلها للمستأجرين", color: "bg-emerald-600" },
    { role: "tenant", title: "مستأجر", sub: "ابحث عن وحدة للإيجار وتواصل بأمان", color: "bg-blue-600" },
  ],
};

function AccountPage() {
  const search = Route.useSearch();
  const section: Section = search.section === "rent" ? "rent" : "sale";
  const navigate = useNavigate();
  const { user, roles, refresh } = useAuth();

  const choose = async (role: AppRole) => {
    if (!user) {
      void navigate({ to: "/auth", search: { section, role } });
      return;
    }
    if (!roles.includes(role)) {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
      if (error && !error.message.includes("duplicate")) {
        toast.error("تعذر حفظ نوع الحساب");
        return;
      }
      await refresh();
    }
    void navigate({ to: "/listings/$section", params: { section } });
  };

  return (
    <div className="min-h-screen bg-background pb-0">
      <div className="mx-auto w-full max-w-md sm:max-w-2xl">
        <header className="relative">
          <div className="flex items-center justify-between px-5 pt-6">
            <Link to="/" aria-label="رجوع" className="text-primary">
              <ArrowRight className="size-6" />
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-bold">اختر نوع الحساب</h1>
              <p className="text-xs text-muted-foreground">اختر نوع الحساب المناسب لك</p>
            </div>
            <Building2 className="size-6 text-primary" />
          </div>

          <img
            src={cityImg}
            alt="أفق المدينة"
            width={1200}
            height={700}
            className="mt-4 h-44 w-full object-cover"
          />

          <div className="grid grid-cols-2 gap-2 px-4">
            {(["sale", "rent"] as Section[]).map((s) => {
              const active = s === section;
              return (
                <Link
                  key={s}
                  to="/account"
                  search={{ section: s }}
                  className={`-mt-6 flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-bold ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "bg-card text-foreground"
                  }`}
                >
                  <Building2 className="size-4" />
                  {SECTION_LABEL[s]}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="mt-6 min-h-[60vh] rounded-t-[2rem] bg-panel px-4 pb-20 pt-6 text-panel-foreground">
          <div className="space-y-3">
            {OPTIONS[section].map((o: (typeof OPTIONS)["sale"][number]) => (
              <button
                key={o.role}
                type="button"
                onClick={() => void choose(o.role)}
                className="flex w-full items-center gap-4 rounded-2xl bg-card-foreground/0 bg-[oklch(1_0_0)] p-4 text-right shadow-sm"
              >
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${o.color}`}>
                  <User className="size-6 text-[oklch(1_0_0)]" />
                </span>
                <span className="flex-1">
                  <span className="block text-base font-bold">{o.title}</span>
                  <span className="block text-xs text-panel-foreground/70">{o.sub}</span>
                </span>
                <ChevronLeft className="size-5 text-panel-foreground/50" />
              </button>
            ))}

            <Link
              to="/admin"
              className="flex w-full items-center gap-4 rounded-2xl bg-[oklch(1_0_0)] p-4 text-right shadow-sm"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet-600">
                <ShieldCheck className="size-6 text-[oklch(1_0_0)]" />
              </span>
              <span className="flex-1">
                <span className="block text-base font-bold">أدمن</span>
                <span className="block text-xs text-panel-foreground/70">
                  إدارة الإعلانات والمستخدمين ومتابعة الطلبات
                </span>
              </span>
              <ChevronLeft className="size-5 text-panel-foreground/50" />
            </Link>
          </div>

          <p className="mt-6 flex items-center gap-3 rounded-2xl bg-black/5 p-4 text-xs text-panel-foreground/70">
            <Lock className="size-5 shrink-0" />
            <span>
              العنوان ورقم الهاتف لا يظهران إلا للإدارة
              <span className="block opacity-70">خصوصيتك وأمانك أولويتنا</span>
            </span>
          </p>
        </main>
      </div>
    </div>
  );
}
