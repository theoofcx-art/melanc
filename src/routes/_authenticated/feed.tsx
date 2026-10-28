import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutList, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { PostCard, POST_SELECT, type FeedPost } from "@/components/melan/PostCard";
import { useMe } from "@/lib/auth";
import { rankByInterests } from "@/lib/hashtags";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed — Melan" }, { name: "description", content: "Seu feed Melan, filtrado pelas hashtags que você curte." }] }),
  component: Feed,
});

function Feed() {
  const { profile } = useMe();
  const [vertical, setVertical] = useState(false);
  useEffect(() => setVertical(localStorage.getItem("melan-view") === "vertical"), []);
  const toggle = (v: boolean) => {
    setVertical(v);
    localStorage.setItem("melan-view", v ? "vertical" : "horizontal");
  };
  const interests = profile?.interests ?? [];

  const posts = useQuery({
    queryKey: ["posts", "feed", vertical],
    queryFn: async () => {
      let q = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(60);
      if (vertical) q = q.neq("kind", "text");
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as FeedPost[];
    },
  });
  const ranked = rankByInterests(posts.data ?? [], interests);

  return (
    <AppShell>
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {interests.length ? interests.map((t) => <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs">#{t}</span>) : <span className="text-xs text-muted-foreground">Adicione interesses (#) no seu perfil</span>}
        </div>
        <div className="flex shrink-0 rounded-full bg-secondary p-1">
          <button aria-label="Modo deitado" onClick={() => toggle(false)} className={`rounded-full p-2 ${!vertical ? "bg-primary" : ""}`}><LayoutList className="h-4 w-4" /></button>
          <button aria-label="Modo em pé" onClick={() => toggle(true)} className={`rounded-full p-2 ${vertical ? "bg-primary" : ""}`}><Smartphone className="h-4 w-4" /></button>
        </div>
      </div>
      <div className={vertical ? "no-scrollbar h-[calc(100vh-9rem)] snap-y snap-mandatory space-y-3 overflow-y-auto px-2" : "space-y-4 px-3"}>
        {posts.isLoading && <p className="py-10 text-center text-muted-foreground">Carregando…</p>}
        {!posts.isLoading && ranked.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-5xl">🍉</p>
            <p className="mt-3">Nada por aqui ainda. Seja o primeiro a postar!</p>
          </div>
        )}
        {ranked.map((p) => <PostCard key={p.id} post={p} vertical={vertical} />)}
      </div>
    </AppShell>
  );
}
