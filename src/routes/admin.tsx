import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatEGP } from "@/lib/app-content";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL, type RequestStatus } from "@/lib/requests";
import { ROLE_LABEL } from "@/lib/app-content";
import { Trash2, Ban, ShieldCheck, Pencil, Download, MessageSquare, ImageIcon, ExternalLink } from "lucide-react";
import { COMMISSION, SUBSCRIPTION_PRICE } from "@/lib/app-content";
import { ChatDialog } from "@/components/ChatDialog";
import { signedUrl } from "@/lib/media";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الأدمن | عقارات منيا القمح الجديدة" },
      { name: "description", content: "مراجعة الإعلانات، تفعيل الاشتراكات، ومتابعة طلبات التواصل." },
      { property: "og:title", content: "لوحة الأدمن | عقارات منيا القمح الجديدة" },
      { property: "og:description", content: "إدارة كاملة للإعلانات والمستخدمين والطلبات." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, roles, loading } = useAuth();
  const isAdmin = roles.includes("admin");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("");

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
        .select("id,user_id,status,payment_note,receipt_url,created_at")
        .order("created_at", { ascending: false });
      
      return Promise.all((data ?? []).map(async s => ({
        ...s,
        receiptSrc: s.receipt_url ? await signedUrl(s.receipt_url) : null
      })));
    },
    enabled: isAdmin,
  });

  const reqs = useQuery({
    queryKey: ["admin-reqs"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("contact_requests")
        .select("id,property_id,requester_id,message,status,admin_note,preferred_appointment,created_at")
        .order("created_at", { ascending: false });
      
      const ids = [...new Set((rows ?? []).map((r) => r.property_id))];
      const { data: props } = ids.length
        ? await supabase.from("properties").select("id,title").in("id", ids)
        : { data: [] };
      const titles = new Map((props ?? []).map((p) => [p.id, p.title]));
      
      return (rows ?? []).map((r) => ({ 
        ...r, 
        propertyTitle: titles.get(r.property_id) ?? "وحدة عقارية" 
      }));
    },
    enabled: isAdmin,
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: rolesRows }, { data: subsRows }, { data: propRows }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id,full_name,phone,banned,banned_reason,banned_at,created_at")
            .order("created_at", { ascending: false }),
          supabase.from("user_roles").select("user_id,role"),
          supabase.from("subscriptions").select("user_id,status,ends_at"),
          supabase.from("properties").select("id,owner_id"),
        ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (rolesRows ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
        subscribed: (subsRows ?? []).some(
          (s) => s.user_id === p.id && s.status === "active" && (!s.ends_at || new Date(s.ends_at) > new Date()),
        ),
        listings: (propRows ?? []).filter((r) => r.owner_id === p.id).length,
      }));
    },
    enabled: isAdmin,
  });

  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("id,property_id,reason,resolved,created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const resolveReport = async (id: string, resolved: boolean) => {
    const { error } = await supabase.from("reports").update({ resolved }).eq("id", id);
    if (error) {
      toast.error("تعذر تحديث البلاغ");
      return;
    }
    void reports.refetch();
  };

  const toggleBan = async (id: string, banned: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        banned: !banned,
        banned_reason: !banned ? notes[id] ?? "" : "",
        banned_at: !banned ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error("تعذر تحديث حالة المستخدم");
      return;
    }
    toast.success(!banned ? "تم حظر المستخدم" : "تم فك الحظر");
    void users.refetch();
  };

  const removeProperty = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      toast.error("تعذر حذف الإعلان");
      return;
    }
    toast.success("تم حذف الإعلان");
    void props.refetch();
  };

  const setRequestStatus = async (id: string, status: RequestStatus) => {
    const { error } = await supabase
      .from("contact_requests")
      .update({ status, admin_note: notes[id] ?? "", handled: status === "accepted" })
      .eq("id", id);
    if (error) {
      toast.error("تعذر تحديث الطلب");
      return;
    }
    toast.success("تم تحديث الطلب وإرسال إشعار لصاحبه");
    void reqs.refetch();
  };

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
        <Stats
          props={props.data ?? []}
          subs={subs.data ?? []}
          reqs={reqs.data ?? []}
          usersCount={users.data?.length ?? 0}
        />
        <Tabs defaultValue="props" className="mt-4">
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="props" className="flex-1">الإعلانات</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">المستخدمون</TabsTrigger>
            <TabsTrigger value="subs" className="flex-1">الاشتراكات</TabsTrigger>
            <TabsTrigger value="reqs" className="flex-1">طلبات التواصل</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1">البلاغات</TabsTrigger>
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
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/edit-listing/$id" params={{ id: p.id }}>
                      <Pencil className="size-4" /> تعديل
                    </Link>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void removeProperty(p.id)}>
                    <Trash2 className="size-4" /> حذف
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-3">
            {users.data?.map((u) => (
              <div key={u.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{u.full_name || "بدون اسم"}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      u.banned ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {u.banned ? "محظور" : "نشط"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">رقم الموبايل: {u.phone || "غير متاح"}</p>
                <p className="text-xs text-muted-foreground">
                  الأدوار: {u.roles.length ? u.roles.map((r) => ROLE_LABEL[r] ?? r).join("، ") : "بدون"}
                </p>
                <p className="text-xs text-muted-foreground">
                  الاشتراك: {u.subscribed ? "مشترك" : "غير مشترك"} — عدد إعلاناته: {u.listings}
                </p>
                <p className="text-xs text-muted-foreground">
                  تاريخ التسجيل: {new Date(u.created_at).toLocaleDateString("ar-EG")}
                </p>
                {u.banned && u.banned_reason && (
                  <p className="mt-1 text-xs text-destructive">سبب الحظر: {u.banned_reason}</p>
                )}
                {!u.banned && (
                  <Textarea
                    className="mt-3"
                    rows={2}
                    placeholder="سبب الحظر (اختياري)"
                    value={notes[u.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [u.id]: e.target.value }))}
                  />
                )}
                <Button
                  size="sm"
                  className="mt-3"
                  variant={u.banned ? "secondary" : "destructive"}
                  onClick={() => void toggleBan(u.id, u.banned)}
                >
                  {u.banned ? <ShieldCheck className="size-4" /> : <Ban className="size-4" />}
                  {u.banned ? "فك الحظر" : "حظر المستخدم"}
                </Button>
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
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to="/property/$id"
                    params={{ id: r.property_id }}
                    className="font-bold text-primary"
                  >
                    عرض الوحدة
                  </Link>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      REQUEST_STATUS_CLASS[r.status as RequestStatus]
                    }`}
                  >
                    {REQUEST_STATUS_LABEL[r.status as RequestStatus]}
                  </span>
                </div>
                <p className="mt-1">{r.message || "بدون رسالة"}</p>
                <Textarea
                  className="mt-3"
                  rows={2}
                  placeholder="ملاحظة للمستخدم (اختياري)"
                  value={notes[r.id] ?? r.admin_note ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void setRequestStatus(r.id, "reviewing")}>
                    قيد المراجعة
                  </Button>
                  <Button size="sm" onClick={() => void setRequestStatus(r.id, "accepted")}>
                    قبول وتوصيل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void setRequestStatus(r.id, "rejected")}>
                    رفض
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="reports" className="space-y-3">
            {reports.data?.length === 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">لا توجد بلاغات.</p>
            )}
            {reports.data?.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link to="/property/$id" params={{ id: r.property_id }} className="font-bold text-primary">
                    عرض الوحدة
                  </Link>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      r.resolved ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {r.resolved ? "تمت المعالجة" : "جديد"}
                  </span>
                </div>
                <p className="mt-2">{r.reason || "بدون سبب"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ar-EG")}
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  variant={r.resolved ? "secondary" : "default"}
                  onClick={() => void resolveReport(r.id, !r.resolved)}
                >
                  {r.resolved ? "إعادة فتح البلاغ" : "تمت المعالجة"}
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}

function Stats({
  props,
  subs,
  reqs,
  usersCount,
}: {
  props: { status: string; section: string; price: number | string }[];
  subs: { status: string }[];
  reqs: { status: string }[];
  usersCount: number;
}) {
  const approved = props.filter((p) => p.status === "approved");
  const pending = props.filter((p) => p.status === "pending");
  const activeSubs = subs.filter((s) => s.status === "active").length;
  const subsRevenue = activeSubs * SUBSCRIPTION_PRICE;
  const potentialCommission = approved.reduce(
    (sum, p) =>
      sum +
      (p.section === "sale" ? Number(p.price) * 0.01 : Number(p.price) / 2),
    0,
  );

  const items = [
    { label: "إجمالي الإعلانات", value: String(props.length) },
    { label: "بانتظار المراجعة", value: String(pending.length) },
    { label: "المستخدمون", value: String(usersCount) },
    { label: "اشتراكات نشطة", value: String(activeSubs) },
    { label: "طلبات قيد المراجعة", value: String(reqs.filter((r) => r.status !== "accepted" && r.status !== "rejected").length) },
    { label: "دخل الاشتراكات", value: formatEGP(subsRevenue) },
    { label: "عمولات متوقعة", value: formatEGP(Math.round(potentialCommission)) },
    { label: "نظام العمولة", value: `${COMMISSION.saleLabel} / ${COMMISSION.rentLabel}` },
  ];

  return (
    <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-[11px] text-muted-foreground">{i.label}</p>
          <p className="mt-1 text-sm font-bold text-primary">{i.value}</p>
        </div>
      ))}
    </section>
  );
}
