import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import type { Section } from "@/lib/app-content";

type Search = { section?: Section; role?: AppRole };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    section: s['section'] === "rent" ? "rent" : s['section'] === "sale" ? "sale" : undefined,
    role: typeof s['role'] === "string" ? (s['role'] as AppRole) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | دارك العقارية" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابًا جديدًا لعرض وحدتك أو البحث عن عقار." },
      { property: "og:title", content: "تسجيل الدخول | دارك العقارية" },
      { property: "og:description", content: "حساب واحد يفتح لك قسمي التمليك والإيجار." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { section, role } = Route.useSearch();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const afterAuth = async (uid?: string) => {
    if (uid && role) {
      await supabase.from("user_roles").insert({ user_id: uid, role });
    }
    await refresh();
    void navigate({ to: section ? "/listings/$section" : "/", params: { section: section ?? "sale" } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب بنجاح");
        await afterAuth(data.user?.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("أهلًا بعودتك");
        await afterAuth(data.user?.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <main className="mt-8">
        <h1 className="text-center text-2xl font-bold">
          {mode === "signup" ? "إنشاء حساب جديد" : "تسجيل الدخول"}
        </h1>
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5">
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">الاسم بالكامل</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الموبايل</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <p className="text-[11px] text-muted-foreground">رقمك لا يظهر لأي مستخدم، الإدارة فقط تراه.</p>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {mode === "signup" ? "إنشاء الحساب" : "دخول"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            className="w-full text-center text-xs text-primary underline-offset-4 hover:underline"
          >
            {mode === "signup" ? "لدي حساب بالفعل — تسجيل الدخول" : "ليس لدي حساب — إنشاء حساب"}
          </button>
        </form>
      </main>
    </AppShell>
  );
}
