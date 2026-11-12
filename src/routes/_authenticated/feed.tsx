import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutList, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { PostCard, POST_SELECT, type FeedPost } from "@/components/melan/PostCard";
import { useMe } from "@/lib/auth";
import { rankFeed, type Signals } from "@/lib/feed";
import { SuggestFollow } from "@/components/melan/SuggestFollow";
import { StatusBar } from "@/components/melan/StatusBar";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed — Melan" }, { name: "description", content: "Seu feed Melan, que aprende com o que você curte e segue." }] }),
  component: Feed,
});

function Feed() {
  const { user, profile } = useMe();
  const [vertical, setVertical] = useState(false);
  useEffect(() => setVertical(localStorage.getItem("melan-view") === "vertical"), []);
  const toggle = (v: boolean) => {
    setVertical(v);
    localStorage.setItem("melan-view", v ? "vertical" : "horizontal");
  };

  const signals = useQuery({
    queryKey: ["posts", "signals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Signals> => {
      const [f, l, v] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user!.id),
        supabase.from("likes").select("post:posts(author_id,hashtags)").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("post_views").select("post_id").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(2000),
      ]);
      const likedAuthors = new Map<string, number>();
      const likedTags = new Map<string, number>();
      for (const row of (l.data ?? []) as unknown as { post: { author_id: string; hashtags: string[] } | null }[]) {
        if (!row.post) continue;
        likedAuthors.set(row.post.author_id, (likedAuthors.get(row.post.author_id) ?? 0) + 1);
        for (const t of row.post.hashtags) likedTags.set(t.toLowerCase(), (likedTags.get(t.toLowerCase()) ?? 0) + 1);
      }
      return { followed: new Set((f.data ?? []).map((x) => x.following_id)), likedAuthors, likedTags, interests: new Set((profile?.interests ?? []).map((i) => i.toLowerCase())), seen: new Set((v.data ?? []).map((x) => x.post_id)) };
    },
  });

  const posts = useQuery({
    queryKey: ["posts", "feed", vertical],
    queryFn: async () => {
      let q = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(100);
      if (vertical) q = q.neq("kind", "text");
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as FeedPost[];
    },
  });
  // Seen set is frozen per visit so posts don't jump around while you scroll.
  const [seenAtOpen, setSeenAtOpen] = useState<Set<string> | null>(null);
  useEffect(() => { if (signals.data && !seenAtOpen) setSeenAtOpen(signals.data.seen ?? new Set()); }, [signals.data, seenAtOpen]);
  const ranked = useMemo(() => {
    if (!signals.data) return posts.data ?? [];
    const repostedByFollowed = new Map<string, number>();
    for (const p of posts.data ?? []) {
      const n = (p.reposts ?? []).filter((r) => signals.data!.followed.has(r.user_id)).length;
      if (n) repostedByFollowed.set(p.id, n);
    }
    return rankFeed(posts.data ?? [], { ...signals.data, seen: seenAtOpen ?? signals.data.seen, repostedByFollowed });
  }, [posts.data, signals.data, seenAtOpen]);

  return (
    <AppShell>
      <div className="flex items-center justify-between px-4 pb-3">
        <p className="text-xs text-muted-foreground">Para você · aprende com o que você curte e segue</p>
        <div className="flex shrink-0 rounded-full bg-secondary p-1">
          <button aria-label="Modo deitado" onClick={() => toggle(false)} className={`rounded-full p-2 ${!vertical ? "bg-primary" : ""}`}><LayoutList className="h-4 w-4" /></button>
          <button aria-label="Modo em pé" onClick={() => toggle(true)} className={`rounded-full p-2 ${vertical ? "bg-primary" : ""}`}><Smartphone className="h-4 w-4" /></button>
        </div>
      </div>
      <StatusBar />
      <SuggestFollow />
      <div className={vertical ? "no-scrollbar h-[calc(100vh-9rem)] snap-y snap-mandatory space-y-3 overflow-y-auto px-2" : "space-y-4 px-3"}>
        {posts.isLoading && <p className="py-10 text-center text-muted-foreground">Carregando…</p>}
        {!posts.isLoading && ranked.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-5xl">🍉</p>
            <p className="mt-3">Nada por aqui ainda. Seja o primeiro a postar!</p>
          </div>
        )}
        {ranked.map((p, i) => <PostCard key={`${p.id}-${i}`} post={p} vertical={vertical} />)}
      </div>
    </AppShell>
  );
}
