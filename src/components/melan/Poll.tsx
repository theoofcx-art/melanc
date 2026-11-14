import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { pollPercents } from "@/lib/poll";
import { UserAvatar } from "@/components/melan/Avatar";

export function Poll({ postId }: { postId: string }) {
  const { user } = useMe();
  const qc = useQueryClient();
  const [showVotes, setShowVotes] = useState(false);
  const key = ["poll", postId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [{ data: opts }, { data: votes }, { data: post }] = await Promise.all([
        supabase.from("poll_options").select("id,label,position").eq("post_id", postId).order("position"),
        supabase.from("poll_votes").select("option_id,user_id,user:profiles(username,display_name,avatar_url)").eq("post_id", postId),
        supabase.from("posts").select("poll_multi").eq("id", postId).maybeSingle(),
      ]);
      return { opts: opts ?? [], votes: votes ?? [], multi: !!post?.poll_multi };
    },
  });
  if (!q.data || q.data.opts.length === 0) return null;
  const { opts, votes, multi } = q.data;
  const voters = new Set(votes.map((v) => v.user_id)).size;
  const counts = opts.map((o) => votes.filter((v) => v.option_id === o.id).length);
  const pct = pollPercents(counts, voters);

  const vote = async (optionId: string) => {
    if (!user) return;
    const mine = votes.some((v) => v.option_id === optionId && v.user_id === user.id);
    const { error } = mine
      ? await supabase.from("poll_votes").delete().eq("option_id", optionId).eq("user_id", user.id)
      : await supabase.from("poll_votes").insert({ option_id: optionId, post_id: postId, user_id: user.id });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{multi ? "Escolha uma ou mais opções" : "Escolha uma opção"}</p>
      {opts.map((o, i) => {
        const mine = votes.some((v) => v.option_id === o.id && v.user_id === user?.id);
        return (
          <button key={o.id} onClick={() => vote(o.id)} className="relative block w-full overflow-hidden rounded-2xl bg-secondary px-4 py-3 text-left text-sm">
            <span className="absolute inset-y-0 left-0 bg-primary transition-all" style={{ width: `${pct[i]}%` }} />
            <span className="relative flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${mine ? "border-melon bg-melon text-primary-foreground" : "border-muted-foreground"}`}>{mine && <Check className="h-3 w-3" />}</span>
                {o.label}
              </span>
              <span className="font-semibold">{pct[i]}% · {counts[i]}</span>
            </span>
          </button>
        );
      })}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{voters} {voters === 1 ? "pessoa votou" : "pessoas votaram"}</span>
        {voters > 0 && <button onClick={() => setShowVotes((s) => !s)} className="font-semibold text-melon">{showVotes ? "Esconder votos" : "Ver votos"}</button>}
      </div>
      {showVotes && (
        <div className="space-y-3 rounded-2xl bg-card p-3">
          {opts.map((o) => (
            <div key={o.id}>
              <p className="mb-1 text-sm font-semibold">{o.label}</p>
              {votes.filter((v) => v.option_id === o.id).map((v) => (
                <div key={v.user_id} className="flex items-center gap-2 py-1 text-sm">
                  <UserAvatar path={v.user?.avatar_url} name={v.user?.display_name} className="h-6 w-6" />
                  {v.user?.display_name} <span className="text-xs text-muted-foreground">@{v.user?.username}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
