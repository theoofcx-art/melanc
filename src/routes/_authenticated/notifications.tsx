import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { UserAvatar } from "@/components/melan/Avatar";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notificações — Melan" }, { name: "description", content: "Curtidas, comentários e novos admiradores." }] }),
  component: Notifs,
});

const label: Record<string, string> = { like: "curtiu sua publicação ❤️", comment: "comentou na sua publicação", follow: "começou a admirar você 🍉" };

function Notifs() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*, actor:profiles!notifications_actor_id_fkey(username,display_name,avatar_url)").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });
  useEffect(() => {
    supabase.from("notifications").update({ read: true }).eq("read", false).then(() => qc.invalidateQueries({ queryKey: ["unread-notifs"] }));
  }, [qc]);
  return (
    <AppShell>
      <h1 className="mb-3 px-4 font-display text-2xl font-bold">Notificações</h1>
      <div className="space-y-2 px-3">
        {q.data?.length === 0 && <p className="py-10 text-center text-muted-foreground">Sem notificações por enquanto 🦇</p>}
        {q.data?.map((n) => (
          <Link key={n.id} to="/u/$username" params={{ username: n.actor?.username ?? "" }} className={`flex items-center gap-3 rounded-2xl p-3 ${n.read ? "bg-card/60" : "bg-card"}`}>
            <UserAvatar path={n.actor?.avatar_url} name={n.actor?.display_name} />
            <p className="flex-1 text-sm"><b>@{n.actor?.username}</b> {label[n.kind] ?? n.kind}</p>
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { locale: ptBR })}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
