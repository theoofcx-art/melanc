import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Trash2, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { UserAvatar, Verified } from "@/components/melan/Avatar";
import { useMe } from "@/lib/auth";
import { adminDeleteUser, adminSetVerified } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Melan" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

function Admin() {
  const { user, loading, isAdmin } = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"users" | "posts">("users");
  const del = useServerFn(adminDeleteUser);
  const verify = useServerFn(adminSetVerified);
  const roleCheck = useQuery({
    queryKey: ["is-admin-strict", user?.id],
    enabled: !!user,
    queryFn: async () => !!(await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" })).data,
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: !!roleCheck.data,
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const posts = useQuery({
    queryKey: ["posts", "admin"],
    enabled: !!roleCheck.data && tab === "posts",
    queryFn: async () => (await supabase.from("posts").select("id,content,kind,created_at,author:profiles!posts_author_id_fkey(username)").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  if (loading || !user || roleCheck.isPending) return <AppShell><p className="p-10 text-center text-muted-foreground">Verificando acesso…</p></AppShell>;
  if (!roleCheck.data) return <Navigate to="/feed" />;

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); qc.invalidateQueries(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <AppShell>
      <div className="space-y-3 px-4">
        <h1 className="font-display text-2xl font-bold text-melon">Painel administrativo</h1>
        <div className="grid grid-cols-2 rounded-full bg-secondary p-1 text-sm">
          <button onClick={() => setTab("users")} className={`rounded-full py-2 ${tab === "users" ? "bg-primary" : ""}`}>Contas ({users.data?.length ?? 0})</button>
          <button onClick={() => setTab("posts")} className={`rounded-full py-2 ${tab === "posts" ? "bg-primary" : ""}`}>Publicações</button>
        </div>
        {tab === "users" ? users.data?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <UserAvatar path={u.avatar_url} name={u.display_name} />
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{u.display_name} <Verified show={u.is_verified} /></p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
            <button aria-label="Verificar" onClick={() => run(() => verify({ data: { userId: u.id, verified: !u.is_verified } }), u.is_verified ? "Selo removido" : "Selo concedido")} className={`rounded-full p-2 ${u.is_verified ? "bg-verified" : "bg-secondary"}`}><BadgeCheck className="h-4 w-4" /></button>
            {u.id !== user?.id && (
              <button aria-label="Banir" onClick={() => confirm(`Banir e excluir @${u.username} permanentemente?`) && run(() => del({ data: { userId: u.id } }), "Conta excluída")} className="rounded-full bg-destructive p-2"><UserX className="h-4 w-4" /></button>
            )}
          </div>
        )) : posts.data?.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">@{p.author?.username} · {p.kind}</p><p className="truncate text-sm">{p.content || "(mídia)"}</p></div>
            <button aria-label="Remover" onClick={() => confirm("Remover publicação?") && run(async () => { const { error } = await supabase.from("posts").delete().eq("id", p.id); if (error) throw error; }, "Publicação removida")} className="rounded-full bg-destructive p-2"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
