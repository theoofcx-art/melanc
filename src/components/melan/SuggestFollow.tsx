import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { UserAvatar } from "./Avatar";

const SUGGESTED = ["theo", "melan"];

export function SuggestFollow() {
  const { user } = useMe();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["suggest-follow", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("username", SUGGESTED);
      const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", user!.id);
      const done = new Set((f ?? []).map((x) => x.following_id));
      return (profs ?? []).filter((p) => p.id !== user!.id && !done.has(p.id));
    },
  });
  if (!q.data?.length) return null;
  const follow = async (id: string) => {
    await supabase.from("follows").insert({ follower_id: user!.id, following_id: id });
    qc.invalidateQueries({ queryKey: ["suggest-follow"] });
  };
  return (
    <div className="mx-3 mb-4 rounded-3xl bg-card p-4">
      <p className="mb-3 text-sm font-semibold">🎄 A Melan sugere seguir</p>
      <div className="space-y-2">
        {q.data.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <Link to="/u/$username" params={{ username: p.username }} className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar path={p.avatar_url} name={p.display_name} className="h-10 w-10" />
              <span className="truncate text-sm"><b>{p.display_name}</b> <span className="text-muted-foreground">@{p.username}</span></span>
            </Link>
            <button onClick={() => follow(p.id)} className="rounded-full bg-melon px-4 py-1.5 text-sm text-primary-foreground">Seguir</button>
          </div>
        ))}
      </div>
    </div>
  );
}
