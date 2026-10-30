import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { PostCard, POST_SELECT, type FeedPost } from "@/components/melan/PostCard";
import { useMe } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/communities")({
  validateSearch: (s: Record<string, unknown>) => ({ tag: typeof s.tag === "string" ? s.tag : undefined }),
  head: () => ({ meta: [{ title: "Comunidades — Melan" }, { name: "description", content: "Grupos do Melan organizados por hashtag." }] }),
  component: Communities,
});

function Communities() {
  const { tag } = Route.useSearch();
  const { user, profile } = useMe();
  const tags = useQuery({
    queryKey: ["posts", "tags"],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("hashtags").order("created_at", { ascending: false }).limit(500);
      const counts = new Map<string, number>();
      (data ?? []).forEach((p) => p.hashtags.forEach((h) => counts.set(h, (counts.get(h) ?? 0) + 1)));
      return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    },
  });
  const posts = useQuery({
    queryKey: ["posts", "tag", tag],
    enabled: !!tag,
    queryFn: async () => {
      const { data } = await supabase.from("posts").select(POST_SELECT).contains("hashtags", [tag!]).order("created_at", { ascending: false });
      return (data ?? []) as unknown as FeedPost[];
    },
  });
  const joined = !!tag && profile?.interests.includes(tag);
  const toggleJoin = async () => {
    if (!user || !profile || !tag) return;
    const next = joined ? profile.interests.filter((i) => i !== tag) : [...profile.interests, tag];
    await supabase.from("profiles").update({ interests: next }).eq("id", user.id);
    toast.success(joined ? "Você saiu da comunidade" : "Você entrou na comunidade");
    location.reload();
  };

  return (
    <AppShell>
      <div className="px-4">
        <h1 className="mb-3 font-display text-2xl font-bold">{tag ? `#${tag}` : "Comunidades"}</h1>
        {tag ? (
          <div className="mb-4 flex gap-2">
            <Link to="/communities" search={{ tag: undefined }} className="rounded-full bg-secondary px-4 py-2 text-sm">← Todas</Link>
            <button onClick={toggleJoin} className={`rounded-full px-4 py-2 text-sm font-medium ${joined ? "bg-secondary" : "bg-melon text-primary-foreground"}`}>{joined ? "Participando" : "Participar"}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(tags.data ?? []).map(([t, n]) => (
              <Link key={t} to="/communities" search={{ tag: t }} className="rounded-3xl bg-card p-4">
                <p className="font-display text-lg font-semibold">#{t}</p>
                <p className="text-xs text-muted-foreground">{n} publicações</p>
              </Link>
            ))}
            {tags.data?.length === 0 && <p className="col-span-2 py-10 text-center text-muted-foreground">Use #hashtags nos posts para criar comunidades.</p>}
          </div>
        )}
      </div>
      {tag && <div className="space-y-4 px-3">{(posts.data ?? []).map((p) => <PostCard key={p.id} post={p} />)}</div>}
    </AppShell>
  );
}
