import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { UserAvatar } from "@/components/melan/Avatar";
import { useMe } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notificações — Melan" }, { name: "description", content: "Curtidas, comentários e novos admiradores." }] }),
  component: Notifs,
});

const label: Record<string, string> = { like: "curtiu sua publicação ❤️", comment: "comentou na sua publicação", follow: "começou a seguir você 🍉", collab_invite: "convidou você para ser colaborador de uma publicação", collab_accepted: "aceitou ser colaborador da sua publicação 🤝" };

function Notifs() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*, actor:profiles!notifications_actor_id_fkey(username,display_name,avatar_url)").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });
  const { user } = useMe();
  const invites = useQuery({
    queryKey: ["collab-invites", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("collab_invites").select("post_id, post:posts(content, author:profiles!posts_author_id_fkey(username))").eq("user_id", user!.id).eq("status", "pending")).data ?? [],
  });
  const answer = async (postId: string, status: "accepted" | "declined") => {
    const { error } = await supabase.from("collab_invites").update({ status }).eq("post_id", postId).eq("user_id", user!.id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Agora você é colaborador!" : "Convite recusado");
    qc.invalidateQueries();
  };
  useEffect(() => {
    supabase.from("notifications").update({ read: true }).eq("read", false).then(() => qc.invalidateQueries({ queryKey: ["unread-notifs"] }));
  }, [qc]);
  return (
    <AppShell>
      <h1 className="mb-3 px-4 font-display text-2xl font-bold">Notificações</h1>
      <div className="space-y-2 px-3">
        {q.data?.length === 0 && <p className="py-10 text-center text-muted-foreground">Sem notificações por enquanto 🍉</p>}
        {invites.data?.map((i) => (
          <div key={i.post_id} className="space-y-2 rounded-2xl bg-card p-3">
            <p className="text-sm"><b>@{i.post?.author?.username}</b> quer você como colaborador{i.post?.content ? `: “${i.post.content.slice(0, 60)}”` : ""}</p>
            <div className="flex gap-2">
              <button onClick={() => answer(i.post_id, "accepted")} className="h-9 flex-1 rounded-full bg-melon text-sm font-semibold text-primary-foreground">Aceitar</button>
              <button onClick={() => answer(i.post_id, "declined")} className="h-9 flex-1 rounded-full bg-secondary text-sm">Recusar</button>
            </div>
          </div>
        ))}
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
