import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Flame, Heart, MessageCircle, MoreHorizontal, Trash2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useMediaUrl } from "@/lib/media";
import { spotifyEmbedUrl } from "@/lib/hashtags";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FILTERS, isBoosted } from "@/lib/feed";
import { UserAvatar, Verified } from "./Avatar";
import { Sticker, StickerPicker } from "./Stickers";

export type FeedPost = {
  id: string;
  author_id: string;
  kind: string;
  content: string | null;
  media_urls: string[];
  media_types: string[];
  hashtags: string[];
  spotify_url: string | null;
  link_url?: string | null;
  filter?: string | null;
  collaborators?: string[];
  boosted_until?: string | null;
  created_at: string;
  author: { username: string; display_name: string; avatar_url: string | null; is_verified: boolean } | null;
  likes: { user_id: string }[];
  comments: { count: number }[];
};

export const POST_SELECT =
  "*, author:profiles!posts_author_id_fkey(username,display_name,avatar_url,is_verified), likes(user_id), comments(count)";

function Media({ path, type, vertical, filter }: { path: string; type: string; vertical: boolean; filter?: string | null }) {
  const url = useMediaUrl(path);
  const style = { filter: FILTERS[filter ?? "none"]?.css ?? "none" };
  const cls = `w-full shrink-0 snap-center bg-bar ${vertical ? "h-[72vh] object-cover" : "h-auto max-h-[85vh] object-contain"}`;
  if (!url) return <div className={cls} />;
  return type === "video" ? (
    <video src={url} style={style} className={cls} controls playsInline loop muted={false} preload="metadata" />
  ) : (
    <img src={url} alt="" style={style} className={cls} loading="lazy" />
  );
}

function Content({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
      {text.split(/(#[\p{L}\p{N}_]+)/u).map((part, i) =>
        part.startsWith("#") ? (
          <Link key={i} to="/communities" search={{ tag: part.slice(1).toLowerCase() }} className="font-medium text-rind">
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function Comments({ postId }: { postId: string }) {
  const { user, isAdmin } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const q = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, author:profiles!comments_author_id_fkey(username,display_name,avatar_url,is_verified)")
        .eq("post_id", postId)
        .order("created_at");
      return data ?? [];
    },
  });
  const send = async (sticker?: string) => {
    if (!user || (!text.trim() && !sticker)) return;
    const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, content: sticker ? "" : text.trim().slice(0, 1000), sticker: sticker ?? null });
    if (error) return toast.error(error.message);
    setText("");
    qc.invalidateQueries({ queryKey: ["comments", postId] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  return (
    <div className="space-y-3 border-t border-border px-4 py-3">
      {(q.data ?? []).map((c) => (
        <div key={c.id} className="flex gap-2">
          <UserAvatar path={c.author?.avatar_url} name={c.author?.display_name} className="h-7 w-7" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              <Link to="/u/$username" params={{ username: c.author?.username ?? "" }} className="font-semibold text-foreground">@{c.author?.username}</Link>{" "}
              <Verified show={c.author?.is_verified} className="h-3 w-3" />
            </p>
            {c.sticker ? <Sticker value={c.sticker} className="h-20 w-20" /> : <p className="text-sm">{c.content}</p>}
          </div>
          {(c.author_id === user?.id || isAdmin) && (
            <button aria-label="Excluir comentário" onClick={async () => { await supabase.from("comments").delete().eq("id", c.id); qc.invalidateQueries({ queryKey: ["comments", postId] }); }} className="text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {user && (
        <div className="flex items-center gap-2">
          <StickerPicker onPick={(s) => send(s)} />
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Comentar…" maxLength={1000} className="h-10 flex-1 rounded-full bg-secondary px-4 text-sm outline-none" />
          <button aria-label="Enviar" onClick={() => send()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary"><Send className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

function Collabs({ ids }: { ids: string[] }) {
  const q = useQuery({
    queryKey: ["collab-profiles", ids.join(",")],
    queryFn: async () => (await supabase.from("profiles").select("id,username").in("id", ids)).data ?? [],
  });
  if (!q.data?.length) return null;
  return (
    <span className="text-xs text-muted-foreground">
      <span className="mr-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-foreground">met</span>
      {q.data.map((p, i) => (
        <span key={p.id}>{i > 0 && ", "}<Link to="/u/$username" params={{ username: p.username }} className="font-semibold text-foreground">@{p.username}</Link></span>
      ))}
    </span>
  );
}

export function PostCard({ post, vertical = false }: { post: FeedPost; vertical?: boolean }) {
  const { user, isAdmin } = useMe();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const liked = !!user && post.likes.some((l) => l.user_id === user.id);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const isLiked = optimistic ?? liked;
  const likeCount = post.likes.length + (optimistic === null ? 0 : optimistic === liked ? 0 : optimistic ? 1 : -1);
  const embed = spotifyEmbedUrl(post.spotify_url);
  const canDelete = user && (user.id === post.author_id || isAdmin);

  const toggleLike = async () => {
    if (!user) return toast("Entre para curtir");
    const next = !isLiked;
    setOptimistic(next);
    if (next) await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
    else await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const del = async () => {
    if (!confirm("Excluir esta publicação?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Publicação excluída");
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  return (
    <article className={`overflow-hidden bg-card ${vertical ? "snap-start rounded-3xl" : "rounded-3xl"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <UserAvatar path={post.author?.avatar_url} name={post.author?.display_name} />
        <Link to="/u/$username" params={{ username: post.author?.username ?? "" }} className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {post.author?.display_name} <Verified show={post.author?.is_verified} />
          </p>
          <p className="text-xs text-muted-foreground">
            {isBoosted(post) ? <span className="mr-1 inline-flex items-center gap-0.5 text-melon"><Flame className="h-3 w-3" />Turbmels ·</span> : null}
            @{post.author?.username} · {formatDistanceToNow(new Date(post.created_at), { locale: ptBR })}
          </p>
        </Link>
        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Opções" className="rounded-full p-2 hover:bg-secondary"><MoreHorizontal className="h-5 w-5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={del} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir publicação
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {post.media_urls.length > 0 && (
        <div className="relative">
          <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
            {post.media_urls.map((m, i) => (
              <Media key={m} path={m} type={post.media_types[i] ?? "image"} vertical={vertical} filter={post.filter} />
            ))}
          </div>
          {post.media_urls.length > 1 && (
            <span className="absolute right-3 top-3 rounded-full bg-bar/80 px-2 py-0.5 text-xs">1/{post.media_urls.length} ⇆</span>
          )}
        </div>
      )}

      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-primary px-4 py-3 text-sm font-semibold">
          Saiba mais <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <div className="space-y-3 px-4 py-3">
        {!!post.collaborators?.length && <Collabs ids={post.collaborators} />}
        {post.content && <Content text={post.content} />}
        {embed && <iframe title="Spotify" src={embed} className="h-20 w-full rounded-xl" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />}
        <div className="flex items-center gap-5 text-muted-foreground">
          <button onClick={toggleLike} className="flex items-center gap-1.5" aria-label="Curtir">
            <Heart className={`h-6 w-6 transition ${isLiked ? "fill-melon text-melon" : ""}`} /> <span className="text-sm">{likeCount}</span>
          </button>
          <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5" aria-label="Comentários">
            <MessageCircle className="h-6 w-6" /> <span className="text-sm">{post.comments[0]?.count ?? 0}</span>
          </button>
        </div>
      </div>
      {showComments && <Comments postId={post.id} />}
    </article>
  );
}
