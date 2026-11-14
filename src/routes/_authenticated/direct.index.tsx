import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { UserAvatar, Verified } from "@/components/melan/Avatar";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/direct/")({
  head: () => ({ meta: [{ title: "Direct — Melan" }, { name: "description", content: "Suas conversas privadas no Melan." }] }),
  component: Inbox,
});

function Inbox() {
  const { user } = useMe();
  const [term, setTerm] = useState("");
  const found = useQuery({
    queryKey: ["dm-search", term],
    enabled: term.trim().length > 1,
    queryFn: async () => (await supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified").or(`username.ilike.%${term.trim().replace(/[%,()]/g, "")}%,display_name.ilike.%${term.trim().replace(/[%,()]/g, "")}%`).neq("id", user!.id).limit(8)).data ?? [],
  });
  const q = useQuery({
    queryKey: ["inbox", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(300);
      const seen = new Map<string, (typeof data extends (infer T)[] | null ? T : never)>();
      (data ?? []).forEach((m) => {
        const other = m.sender_id === user!.id ? m.recipient_id : m.sender_id;
        if (!seen.has(other)) seen.set(other, m);
      });
      const ids = [...seen.keys()];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified").in("id", ids) : { data: [] };
      return ids.map((id) => ({ last: seen.get(id)!, p: profs?.find((x) => x.id === id) })).filter((x) => x.p);
    },
  });
  return (
    <AppShell>
      <h1 className="mb-3 px-4 font-display text-2xl font-bold">Direct</h1>
      <div className="space-y-2 px-3">
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nova conversa: buscar @usuário" className="h-11 w-full rounded-full bg-card px-4 text-sm outline-none" />
        {found.data?.map((p) => (
          <Link key={p.id} to="/direct/$userId" params={{ userId: p.id }} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <UserAvatar path={p.avatar_url} name={p.display_name} />
            <p className="font-semibold">{p.display_name} <span className="text-xs text-muted-foreground">@{p.username}</span></p>
          </Link>
        ))}
        {q.data?.length === 0 && <p className="py-10 text-center text-muted-foreground">Nenhuma conversa ainda. Busque alguém acima para começar.</p>}
        {q.data?.map(({ last, p }) => (
          <Link key={p?.id ?? last.id} to="/direct/$userId" params={{ userId: p?.id ?? "" }} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <UserAvatar path={p?.avatar_url} name={p?.display_name} className="h-12 w-12" />
            <div className="min-w-0">
              <p className="font-semibold">{p?.display_name} <Verified show={p?.is_verified} /></p>
              <p className="truncate text-sm text-muted-foreground">{last.sticker ? "Figurinha" : last.content}</p>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
