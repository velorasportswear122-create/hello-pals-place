import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import { formatEGP } from "@/lib/app-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/property/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل الوحدة | عقارات منيا القمح الجديدة" },
      { name: "description", content: "تفاصيل الوحدة العقارية مع صور وفيديوهات للمشتركين، والعنوان محجوب." },
      { property: "og:title", content: "تفاصيل الوحدة | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "اطلب من الإدارة توصيلك بصاحب الوحدة بأمان." },
    ],
  }),
  component: PropertyPage,
});

function PropertyPage() {
  const { id } = Route.useParams();
  const { user, roles, subscribed } = useAuth();
  const isAdmin = roles.includes("admin");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data: property } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
  });

  const isOwner = property?.owner_id === user?.id;

  const { data: media } = useQuery({
    queryKey: ["media", id, subscribed, isOwner],
    queryFn: async () => {
      const { data } = await supabase
        .from("property_media")
        .select("id,url,media_type")
        .eq("property_id", id)
        .order("sort_order");
      return Promise.all(
        (data ?? []).map(async (m) => ({ ...m, src: await signedUrl(m.url) })),
      );
    },
    enabled: Boolean(property) && (subscribed || isOwner || isAdmin),
  });

  const { data: privateInfo } = useQuery({
    queryKey: ["private", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("property_private")
        .select("address,contact_phone")
        .eq("property_id", id)
        .maybeSingle();
      return data;
    },
    enabled: Boolean(property) && (isAdmin || isOwner),
  });

  const sendRequest = async () => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase
      .from("contact_requests")
      .insert({ property_id: id, requester_id: user.id, message });
    setSending(false);
    if (error) {
      toast.error("لا يمكن إرسال الطلب. تأكد من تفعيل الاشتراك.");
      return;
    }
    setMessage("");
    toast.success("تم إرسال طلبك للإدارة وسيتم التواصل معك");
  };

  if (!user) {
    return (
      <AppShell>
        <main className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">سجّل الدخول أولًا</p>
          <Button asChild className="mt-4">
            <Link to="/auth">تسجيل الدخول</Link>
          </Button>
        </main>
      </AppShell>
    );
  }

  if (!property) {
    return (
      <AppShell>
        <p className="mt-16 text-center text-sm text-muted-foreground">جارٍ التحميل…</p>
      </AppShell>
    );
  }

  const canSeeDetails = subscribed || isOwner || isAdmin;

  return (
    <AppShell>
      <main className="mt-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold">{property.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> {property.city}
            {property.district ? ` - ${property.district}` : ""}
          </p>
          <p className="mt-2 text-lg font-bold text-primary">{formatEGP(Number(property.price))}</p>
        </div>

        {canSeeDetails ? (
          <>
            {media && media.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {media.map((m) =>
                  m.media_type === "video" ? (
                    <video key={m.id} src={m.src} controls className="h-40 w-full rounded-2xl object-cover" />
                  ) : (
                    <img
                      key={m.id}
                      src={m.src}
                      alt={property.title}
                      loading="lazy"
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                  ),
                )}
              </div>
            )}
            <p className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
              {property.description || "لا يوجد وصف إضافي."}
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-primary/40 bg-card p-5 text-center text-sm">
            <Lock className="mx-auto size-6 text-primary" />
            <p className="mt-3">الصور والفيديوهات والتفاصيل الكاملة للمشتركين فقط.</p>
            <Button asChild className="mt-4">
              <Link to="/subscribe">اشترك الآن</Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Info label="المساحة" value={property.area_m2 ? `${property.area_m2} م²` : "-"} />
          <Info label="الغرف" value={property.rooms != null ? String(property.rooms) : "-"} />
          <Info label="الحمامات" value={property.bathrooms != null ? String(property.bathrooms) : "-"} />
        </div>

        {isAdmin || isOwner ? (
          <div className="rounded-2xl border border-primary/40 bg-card p-4 text-sm">
            <p className="font-bold text-primary">بيانات محجوبة (الإدارة والمالك فقط)</p>
            <p className="mt-2 flex items-center gap-2">
              <MapPin className="size-4" /> {privateInfo?.address || "غير متاح"}
            </p>
            <p className="mt-1 flex items-center gap-2">
              <Phone className="size-4" /> {privateInfo?.contact_phone || "غير متاح"}
            </p>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl bg-secondary p-4 text-xs text-muted-foreground">
            <Lock className="size-4" /> العنوان ورقم الهاتف لا يظهران إلا للإدارة.
          </p>
        )}

        {subscribed && !isOwner && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">اطلب من الإدارة توصيلك بصاحب الوحدة</p>
            <Textarea
              className="mt-3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب استفسارك أو الوقت المناسب للتواصل"
            />
            <Button onClick={() => void sendRequest()} disabled={sending} className="mt-3 w-full">
              <Send className="size-4" /> إرسال الطلب للإدارة
            </Button>
          </div>
        )}
      </main>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
