import { Link } from "@tanstack/react-router";
import { Bell, Menu, LogOut, Shield, Building2, Search as SearchIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/logo-minya.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const isAdmin = roles.includes("admin");

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
    enabled: Boolean(user),
    refetchInterval: 20000,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-6 sm:max-w-2xl">
        <header className="sticky top-3 z-30 flex items-center justify-between rounded-3xl border border-primary/20 bg-background/70 px-3 py-2 shadow-[var(--shadow-lux)] backdrop-blur-xl">
          <Link
            to="/notifications"
            aria-label="التنبيهات"
            className="relative rounded-full border border-primary/30 bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link to="/" className="flex min-w-0 flex-col items-center gap-1 px-2 text-center">
            <img src={logo} alt="شعار عقارات منيا القمح الجديدة" width={56} height={56} className="size-14" />
            <span className="text-gold text-base font-bold leading-tight">
              عقارات منيا القمح الجديدة
            </span>
            <span className="text-[11px] text-muted-foreground">منصة تسويق عقاري موثوقة</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="القائمة"
              className="rounded-full border border-primary/30 bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
            >
              <Menu className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem asChild>
                <Link to="/listings/$section" params={{ section: "sale" }}>
                  عقارات التمليك
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/listings/$section" params={{ section: "rent" }}>
                  عقارات الإيجار
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/search" search={{ section: "", city: "", min: 0, max: 0, rooms: 0, ptype: "", finishing: "", minArea: 0 }}>
                  <SearchIcon className="ms-2 size-4" /> بحث وتصفية
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/subscribe">الاشتراك الشهري</Link>
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem asChild>
                  <Link to="/new-listing" search={{ section: "sale" }}>
                    <Building2 className="ms-2 size-4" /> إضافة وحدة
                  </Link>
                </DropdownMenuItem>
              )}
              {user && (
                <DropdownMenuItem asChild>
                  <Link to="/requests">طلبات التواصل</Link>
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <Shield className="ms-2 size-4" /> لوحة الأدمن
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="ms-2 size-4" /> تسجيل الخروج
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/auth">تسجيل الدخول</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {children}
      </div>
    </div>
  );
}
