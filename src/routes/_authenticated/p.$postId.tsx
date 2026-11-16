import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { PostCard, POST_SELECT, type FeedPost } from "@/components/melan/PostCard";

export const Route = createFileRoute("/_authenticated/p/$postId")({
  head: () => ({ meta: [{ title: "Publicação — Melan" }, { name: "description", content: "Veja esta publicação na Melan." }, { property: "og:title", content: "Publicação — Melan" }, { property: "og:description", content: "Veja esta publicação na Melan." }] }),
  validateSearch: (s: Record<string, unknown>): { c?: number } => (s.c ? { c: 1 } : {}),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const { c } = Route.useSearch();
  const q = useQuery({
    queryKey: ["posts", "one", postId],
    queryFn: async () => (await supabase.from("posts").select(POST_SELECT).eq("id", postId).maybeSingle()).data as unknown as FeedPost | null,
  });
  return (
    <AppShell>
      <div className="px-3">
        {q.isLoading ? <p className="py-10 text-center text-muted-foreground">Carregando…</p> : q.data ? <PostCard post={q.data} openComments={!!c} /> : (
          <div className="py-16 text-center text-muted-foreground"><p>Esta publicação não existe mais.</p><Link to="/feed" className="mt-4 inline-block text-melon">Voltar ao início</Link></div>
        )}
      </div>
    </AppShell>
  );
}
