import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Search, Send, Users, Bot, Plus, AlignLeft, Home, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { MelanLogo } from "./Logo";
import { UserAvatar } from "./Avatar";

function HeaderIcon({ to, label, children, badge }: { to: string; label: string; children: ReactNode; badge?: number }) {
  return (
    <Link to={to} aria-label={label} className="relative flex h-10 w-10 items-center justify-center glass rounded-full text-foreground transition hover:bg-accent">
      {children}
      {!!badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-melon px-1 text-[10px] font-semibold text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children, hideHeader }: { children: ReactNode; hideHeader?: boolean }) {
  const { user, profile, isAdmin } = useMe();
  const loc = useLocation();
  const unread = useQuery({
    queryKey: ["unread-notifs", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
  });

  const tabs = [
    { to: "/communities", icon: Users, label: "Comunidades" },
    { to: "/wyp", icon: Bot, label: "Wyp IA" },
    { to: "/create", icon: Plus, label: "Criar", center: true },
    { to: "/feed", icon: Home, label: "Início" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-28">
      {!hideHeader && (
        <header className="sticky top-0 z-30 flex items-center justify-between glass rounded-b-3xl border-t-0 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.9rem)]">
          <HeaderIcon to="/search" label="Pesquisar"><Search className="h-5 w-5" /></HeaderIcon>
          <Link to="/feed" aria-label="Início"><MelanLogo /></Link>
          <div className="flex gap-2">
            <HeaderIcon to="/notifications" label="Notificações" badge={unread.data}><Bell className="h-5 w-5" /></HeaderIcon>
            <HeaderIcon to="/direct" label="Direct"><Send className="h-5 w-5" /></HeaderIcon>
          </div>
        </header>
      )}
      {isAdmin && !hideHeader && (
        <Link to="/admin" className="mx-4 mb-2 flex items-center gap-2 rounded-full bg-melon/15 px-4 py-2 text-xs font-medium text-melon">
          <Shield className="h-4 w-4" /> Painel administrativo
        </Link>
      )}
      <main>{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="flex items-center justify-around glass rounded-full px-2 py-2">
          {tabs.map((t) =>
            t.center ? (
              <Link key={t.to} to={t.to} aria-label={t.label} className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-melon text-primary-foreground shadow-float ring-4 ring-background transition active:scale-95">
                <t.icon className="h-7 w-7" />
              </Link>
            ) : (
              <Link
                key={t.to}
                to={t.to}
                aria-label={t.label}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${loc.pathname.startsWith(t.to) ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              >
                <t.icon className="h-6 w-6" />
              </Link>
            ),
          )}
          <Link
            to="/u/$username"
            params={{ username: profile?.username ?? "me" }}
            aria-label="Perfil"
            className={`flex h-12 w-14 items-center justify-center rounded-full ${loc.pathname.startsWith("/u/") ? "bg-secondary" : ""}`}
          >
            {profile ? <UserAvatar path={profile.avatar_url} name={profile.display_name} className="h-8 w-8" /> : <Home className="h-6 w-6" />}
          </Link>
        </div>
      </nav>
    </div>
  );
}
