import { Link } from "@tanstack/react-router";
import { Bell, Menu, LogOut, Shield, Building2 } from "lucide-react";
import logo from "@/assets/logo-minya.png";
import { useAuth } from "@/hooks/useAuth";
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-6 sm:max-w-2xl">
        <header className="flex items-center justify-between">
          <button
            type="button"
            aria-label="التنبيهات"
            className="rounded-full border border-border p-2 text-primary"
          >
            <Bell className="size-5" />
          </button>
          <Link to="/" className="flex flex-col items-center gap-1">
            <img src={logo} alt="شعار عقارات منيا القمح الجديدة" width={56} height={56} className="size-14" />
            <span className="text-lg font-bold text-primary">عقارات منيا القمح الجديدة</span>
            <span className="text-[11px] text-muted-foreground">منصة تسويق عقاري موثوقة</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="القائمة"
              className="rounded-full border border-border p-2 text-primary"
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
                <Link to="/subscribe">الاشتراك الشهري</Link>
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem asChild>
                  <Link to="/new-listing">
                    <Building2 className="ms-2 size-4" /> إضافة وحدة
                  </Link>
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
