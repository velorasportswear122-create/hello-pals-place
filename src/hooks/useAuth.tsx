import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "seller" | "buyer" | "landlord" | "tenant";

type AuthState = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  subscribed: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (uid: string | undefined) => {
    if (!uid) {
      setRoles([]);
      setSubscribed(false);
      return;
    }
    const [rolesRes, subRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase
        .from("subscriptions")
        .select("id,status,ends_at")
        .eq("user_id", uid)
        .eq("status", "active")
        .limit(1),
    ]);
    setRoles(((rolesRes.data ?? []) as { role: AppRole }[]).map((r) => r.role));
    const sub = subRes.data?.[0];
    setSubscribed(Boolean(sub && (!sub.ends_at || new Date(sub.ends_at) > new Date())));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => void loadExtras(s?.user?.id), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadExtras(data.session?.user?.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    user,
    session,
    roles,
    subscribed,
    loading,
    refresh: async () => loadExtras(user?.id),
    signOut: async () => {
      await supabase.auth.signOut();
      setRoles([]);
      setSubscribed(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
