import { createFileRoute, Link } from "@tanstack/react-router";
// أضف نظام مراقبة للأخطاء مثل Sentry لمتابعة الاستثناءات والأعطال في الإنتاج.
import { ChevronLeft, Crown, ShieldCheck, BadgeCheck, Users, CalendarClock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import saleDesign from "@/assets/sale-design.jpg";
import rentDesign from "@/assets/rent-design.jpg";
import logo from "@/assets/logo-minya.png";
import heroBg from "@/assets/hero-bg.jpg";
import bgPattern from "@/assets/bg-pattern.png";
import { COMMISSION, SUBSCRIPTION_PRICE } from "@/lib/app-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عقارات منيا القمح الجديدة | تمليك وإيجار العقارات" },
      {
        name: "description",
        content:
          "اختر بين قسم التمليك وقسم الإيجار، اعرض وحدتك بالصور والفيديو، وتواصل بأمان عبر إدارة المنصة.",
      },
      { property: "og:title", content: "عقارات منيا القمح الجديدة | تمليك وإيجار العقارات" },
      {
        property: "og:description",
        content: "منصة تسويق عقاري موثوقة: بيانات محمية، إعلانات مراجعة، وتواصل آمن عبر الإدارة.",
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: ShieldCheck, title: "خصوصية وأمان", sub: "بياناتك محمية" },
  { icon: BadgeCheck, title: "إعلانات موثوقة", sub: "مراجعة دقيقة" },
  { icon: Users, title: "تواصل آمن", sub: "عبر الإدارة فقط" },
  { icon: CalendarClock, title: "اشتراك شهري", sub: `${SUBSCRIPTION_PRICE} جنيه فقط` },
];

function Index() {
  return (
    <AppShell>
      <main className="relative min-h-screen">
        {/* Background Image Wrapper */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none"
          style={{ 
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        />
        
        {/* Content Wrapper */}
        <div className="relative z-10 pt-8 px-4">
          <div className="mb-6">
            <h1 className="text-center text-3xl font-bold text-primary drop-shadow-sm">
              عقارات منيا القمح الجديدة
            </h1>
            <p className="text-center text-sm text-muted-foreground mt-2">
              وجهتك الأولى للتمليك والإيجار في منيا القمح
            </p>
          </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <SectionCard
            to="sale"
            img={saleDesign}
            title="تمليك"
            sub="بيع وشراء العقارات"
            tone="gold"
          />
          <SectionCard
            to="rent"
            img={rentDesign}
            title="إيجار"
            sub="تأجير واستئجار العقارات"
            tone="blue"
          />
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <h2 className="text-center text-base font-bold">لماذا تختار منصتنا ؟</h2>
          <ul className="mt-5 grid grid-cols-4 gap-2">
            {features.map((f) => (
              <li key={f.title} className="flex flex-col items-center gap-2 text-center">
                <span className="rounded-full border border-primary/40 p-2 text-primary">
                  <f.icon className="size-5" />
                </span>
                <span className="text-[11px] font-semibold leading-tight">{f.title}</span>
                <span className="text-[10px] text-muted-foreground">{f.sub}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-3xl border border-primary/40 bg-card p-5 text-center">
          <h2 className="text-base font-bold text-primary">عمولة المنصة</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-secondary p-3">
              <p className="font-bold">تمليك</p>
              <p className="mt-1 text-muted-foreground">{COMMISSION.saleLabel}</p>
            </div>
            <div className="rounded-2xl bg-secondary p-3">
              <p className="font-bold">إيجار</p>
              <p className="mt-1 text-muted-foreground">{COMMISSION.rentLabel}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            العمولة تُحصّل عبر الإدارة بعد إتمام الصفقة فقط.
          </p>
        </section>

        <Link
          to="/subscribe"
          className="mt-6 flex items-center justify-between rounded-2xl px-6 py-4 text-primary-foreground shadow-[var(--shadow-soft)]"
          style={{ backgroundImage: "var(--gradient-gold)" }}
        >
          <Crown className="size-6" />
          <span className="flex-1 text-center">
            <span className="block text-lg font-bold">اشترك الآن</span>
            <span className="block text-xs opacity-80">لمعرفة التفاصيل والتواصل</span>
          </span>
          <span className="size-6" />
        </Link>
        </div>
      </main>
    </AppShell>
  );
}

function SectionCard({
  to,
  img,
  title,
  sub,
  tone,
}: {
  to: "sale" | "rent";
  img: string;
  title: string;
  sub: string;
  tone: "gold" | "blue";
}) {
  return (
    <Link
      to="/account"
      search={{ section: to }}
      className="group relative flex h-72 flex-col justify-end overflow-hidden rounded-3xl border border-border shadow-lg"
      style={{ backgroundImage: tone === "gold" ? "var(--gradient-gold)" : "var(--gradient-blue)" }}
    >
      <div className="absolute inset-0 z-0">
        <img
          src={img}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>
      
      {/* Logo Overlay */}
      <div className="absolute top-3 right-3 z-10 size-10 rounded-full bg-white/10 p-1.5 backdrop-blur-md border border-white/20">
        <img src={logo} alt="Logo" className="h-full w-full object-contain opacity-90" />
      </div>

      <div className="relative z-10 p-4 text-center text-foreground">
        <p className="text-2xl font-black tracking-tight drop-shadow-md">{title}</p>
        <p className="mt-1 text-[11px] font-medium opacity-90">{sub}</p>
        <span
          className="mx-auto mt-3 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <ChevronLeft className="size-4" />
        </span>
      </div>
    </Link>
  );
}
