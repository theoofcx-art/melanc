import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { UserAvatar, Verified } from "@/components/melan/Avatar";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Direct — Melan" }, { name: "description", content: "Suas conversas privadas no Melan." }] }),
  component: Inbox,
});

function Inbox() {
  const { user } = useMe();
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
      return ids.map((id) => ({ last: seen.get(id)!, p: profs?.find((x) => x.id === id) }));
    },
  });
  return (
    <AppShell>
      <h1 className="mb-3 px-4 font-display text-2xl font-bold">Direct</h1>
      <div className="space-y-2 px-3">
        {q.data?.length === 0 && <p className="py-10 text-center text-muted-foreground">Nenhuma conversa. Abra um perfil e toque em ✈️ para começar.</p>}
        {q.data?.map(({ last, p }) => (
          <Link key={p?.id ?? last.id} to="/messages/$userId" params={{ userId: p?.id ?? "" }} className="flex items-center gap-3 rounded-2xl bg-card p-3">
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
