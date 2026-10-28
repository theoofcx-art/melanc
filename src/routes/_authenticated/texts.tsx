import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { PostCard, POST_SELECT, type FeedPost } from "@/components/melan/PostCard";

export const Route = createFileRoute("/_authenticated/texts")({
  head: () => ({ meta: [{ title: "Textos — Melan" }, { name: "description", content: "Pensamentos e textos da comunidade Melan." }] }),
  component: Texts,
});

function Texts() {
  const posts = useQuery({
    queryKey: ["posts", "texts"],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select(POST_SELECT).eq("kind", "text").order("created_at", { ascending: false }).limit(80);
      return (data ?? []) as unknown as FeedPost[];
    },
  });
  return (
    <AppShell>
      <h1 className="mb-3 px-4 font-display text-2xl font-bold">Textos</h1>
      <div className="space-y-3 px-3">
        {posts.data?.length === 0 && <p className="py-10 text-center text-muted-foreground">Nenhum texto ainda.</p>}
        {(posts.data ?? []).map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </AppShell>
  );
}
