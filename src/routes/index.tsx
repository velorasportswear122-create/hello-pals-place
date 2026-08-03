import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Crown, ShieldCheck, BadgeCheck, Users, CalendarClock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import saleImg from "@/assets/sale.jpg";
import rentImg from "@/assets/rent.jpg";
import { SUBSCRIPTION_PRICE } from "@/lib/app-content";

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
      <main className="mt-8">
        <h1 className="text-center text-2xl font-bold">اختر نوع الخدمة</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          اختر القسم المناسب لاحتياجاتك
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <SectionCard
            to="sale"
            img={saleImg}
            title="تمليك"
            sub="بيع وشراء العقارات"
            tone="gold"
          />
          <SectionCard
            to="rent"
            img={rentImg}
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
      className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-3xl border border-border"
      style={{ backgroundImage: tone === "gold" ? "var(--gradient-gold)" : "var(--gradient-blue)" }}
    >
      <img
        src={img}
        alt={title}
        loading="lazy"
        width={800}
        height={1000}
        className="absolute inset-x-0 top-0 h-2/3 w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span className="absolute inset-x-0 top-1/3 bottom-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="relative z-10 p-4 text-center text-foreground">
        <p className="text-xl font-bold">{title}</p>
        <p className="mt-1 text-xs opacity-85">{sub}</p>
        <span
          className="mx-auto mt-3 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <ChevronLeft className="size-4" />
        </span>
      </div>
    </Link>
  );
}
