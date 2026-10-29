import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { UserAvatar, Verified } from "@/components/melan/Avatar";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Pesquisar — Melan" }, { name: "description", content: "Encontre pessoas e hashtags no Melan." }] }),
  component: Search,
});

function Search() {
  const [q, setQ] = useState("");
  const term = q.trim().replace(/[%,()]/g, "");
  const res = useQuery({
    queryKey: ["search", term],
    enabled: term.length > 0,
    queryFn: async () => {
      if (term.startsWith("#")) return { tag: term.slice(1).toLowerCase(), users: [] };
      const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(20);
      return { tag: null, users: data ?? [] };
    },
  });
  return (
    <AppShell>
      <div className="space-y-3 px-4">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar pessoas ou #hashtags" className="h-12 w-full rounded-full bg-card px-5 outline-none" />
        {res.data?.tag && <Link to="/communities" search={{ tag: res.data.tag }} className="block rounded-2xl bg-card p-4">Ver comunidade #{res.data.tag}</Link>}
        {res.data?.users.map((u) => (
          <Link key={u.id} to="/u/$username" params={{ username: u.username }} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <UserAvatar path={u.avatar_url} name={u.display_name} />
            <div><p className="font-semibold">{u.display_name} <Verified show={u.is_verified} /></p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
