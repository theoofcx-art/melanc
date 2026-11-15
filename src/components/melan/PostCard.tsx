import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, Flame, Heart, MessageCircle, MoreHorizontal, Pin, Repeat2, Reply, Trash2, Send, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useMediaUrl } from "@/lib/media";
import { spotifyEmbedUrl } from "@/lib/hashtags";
import { Poll } from "@/components/melan/Poll";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FILTERS, isBoosted } from "@/lib/feed";
import { shareLink } from "@/lib/share";
import { UserAvatar, Verified } from "./Avatar";
import { Sticker, StickerPicker } from "./Stickers";
import { RichText } from "./RichText";

export type FeedPost = {
  id: string;
  author_id: string;
  kind: string;
  content: string | null;
  media_urls: string[];
  media_types: string[];
  hashtags: string[];
  spotify_url: string | null;
  sticker?: string | null;
  link_url?: string | null;
  filter?: string | null;
  collaborators?: string[];
  boosted_until?: string | null;
  created_at: string;
  author: { username: string; display_name: string; avatar_url: string | null; is_verified: boolean; frame?: string | null } | null;
  post_views?: { count: number }[];
  view_count?: number;
  likes: { user_id: string }[];
  reposts?: { user_id: string; user: { username: string; display_name: string; avatar_url: string | null } | null }[];
  comments: { count: number }[];
};

export const POST_SELECT =
  "*, author:profiles!posts_author_id_fkey(username,display_name,avatar_url,is_verified,frame), likes(user_id), reposts(user_id, user:profiles!reposts_user_id_fkey(username,display_name,avatar_url)), comments(count)";

function Media({ path, type, vertical, filter }: { path: string; type: string; vertical: boolean; filter?: string | null }) {
  const url = useMediaUrl(path);
  const style = { filter: FILTERS[filter ?? "none"]?.css ?? "none" };
  const cls = `w-full shrink-0 snap-center bg-bar ${vertical ? "h-[72vh] object-cover" : "h-auto max-h-[85vh] object-contain"}`;
  if (!url) return <div className={`${cls} ${vertical ? "" : "aspect-square"}`} />;
  return type === "video" ? (
    <AutoVideo src={url} style={style} className={cls} />
  ) : (
    <img src={url} alt="" style={style} className={cls} loading="lazy" />
  );
}

// Plays when the video reaches the middle of the screen, pauses when scrolled away; one tap pauses/plays.
function AutoVideo({ src, style, className }: { src: string; style: React.CSSProperties; className: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !userPaused.current) {
          v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
        } else if (!e.isIntersecting) {
          v.pause();
          userPaused.current = false;
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    if (v.paused) { userPaused.current = false; v.play().catch(() => {}); }
    else { userPaused.current = true; v.pause(); }
  };
  return <video ref={ref} src={src} style={style} className={className} onClick={toggle} playsInline loop preload="metadata" />;
}

declare global {
  interface Window { onSpotifyIframeApiReady?: (api: any) => void; __spotifyApi?: Promise<any> }
}
function spotifyApi(): Promise<any> {
  if (!window.__spotifyApi) {
    window.__spotifyApi = new Promise((resolve) => {
      window.onSpotifyIframeApiReady = resolve;
      const sc = document.createElement("script");
      sc.src = "https://open.spotify.com/embed/iframe-api/v1";
      sc.async = true;
      document.body.appendChild(sc);
    });
  }
  return window.__spotifyApi;
}

// Spotify player that starts in the middle of the screen and pauses when scrolled away.
function AutoSpotify({ url }: { url: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let ctrl: any;
    let io: IntersectionObserver | undefined;
    let dead = false;
    const target = document.createElement("div");
    el.appendChild(target);
    spotifyApi().then((api) => {
      if (dead) return;
      api.createController(target, { uri: url, height: 80, width: "100%" }, (c: any) => {
        ctrl = c;
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? c.resume() : c.pause()), { rootMargin: "-45% 0px -45% 0px" });
        io.observe(el);
      });
    });
    return () => { dead = true; io?.disconnect(); ctrl?.destroy?.(); el.innerHTML = ""; };
  }, [url]);
  return <div ref={box} className="h-20 w-full overflow-hidden rounded-xl" />;
}

function Content({ text }: { text: string }) {
  return <RichText text={text} className="text-[15px] leading-relaxed" />;
}

type CommentRow = {
  id: string; post_id: string; author_id: string; content: string | null; sticker: string | null; created_at: string;
  parent_id: string | null; pinned: boolean;
  author: { username: string; display_name: string; avatar_url: string | null; is_verified: boolean } | null;
  comment_likes: { user_id: string }[];
};

function Comments({ postId, postAuthorId }: { postId: string; postAuthorId: string }) {
  const { user, isAdmin, profile } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const isOwner = user?.id === postAuthorId;
  const key = ["comments", postId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, author:profiles!comments_author_id_fkey(username,display_name,avatar_url,is_verified), comment_likes(user_id)")
        .eq("post_id", postId)
        .order("created_at");
      return (data ?? []) as unknown as CommentRow[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const send = async (sticker?: string) => {
    if (!user || (!text.trim() && !sticker)) return;
    const parent = replyTo ? replyTo.parent_id ?? replyTo.id : null;
    const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, parent_id: parent, content: sticker ? "" : text.trim().slice(0, 1000), sticker: sticker ?? null });
    if (error) return toast.error(error.message);
    setText(""); setReplyTo(null);
    refresh();
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const like = async (c: CommentRow) => {
    if (!user) return;
    const has = c.comment_likes.some((l) => l.user_id === user.id);
    if (has) await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
    else await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: user.id });
    refresh();
  };
  const pin = async (c: CommentRow) => {
    const { error } = await supabase.from("comments").update({ pinned: !c.pinned }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.pinned ? "Comentário desafixado" : "Comentário fixado");
    refresh();
  };
  const all = q.data ?? [];
  const tops = all.filter((c) => !c.parent_id).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const row = (c: CommentRow, reply: boolean) => {
    const liked = !!user && c.comment_likes.some((l) => l.user_id === user.id);
    return (
      <div key={c.id} className={`flex gap-2 ${reply ? "ml-9" : ""}`}>
        <UserAvatar path={c.author?.avatar_url} name={c.author?.display_name} className={reply ? "h-6 w-6" : "h-7 w-7"} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {c.pinned && <span className="mr-1 inline-flex items-center gap-0.5 text-melon"><Pin className="h-3 w-3" />Fixado ·</span>}
            <Link to="/u/$username" params={{ username: c.author?.username ?? "" }} className="font-semibold text-foreground">@{c.author?.username}</Link>{" "}
            <Verified show={c.author?.is_verified} className="h-3 w-3" />
          </p>
          {c.sticker ? <Sticker value={c.sticker} className="h-20 w-20" saveable /> : <RichText text={c.content ?? ""} className="text-sm" />}
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <button onClick={() => { setReplyTo(c); setText(`@${c.author?.username} `); }} className="flex items-center gap-1"><Reply className="h-3.5 w-3.5" />Responder</button>
            {isOwner && !reply && <button onClick={() => pin(c)} className="flex items-center gap-1"><Pin className="h-3.5 w-3.5" />{c.pinned ? "Desafixar" : "Fixar"}</button>}
            {(c.author_id === user?.id || isAdmin || isOwner) && (
              <button aria-label="Excluir comentário" onClick={async () => { await supabase.from("comments").delete().eq("id", c.id); refresh(); }}><Trash2 className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
        <button aria-label="Curtir comentário" onClick={() => like(c)} className="flex flex-col items-center text-[10px] text-muted-foreground">
          <Heart style={liked && profile?.like_color ? { color: profile.like_color, fill: profile.like_color } : undefined} className={`h-4 w-4 ${liked ? "fill-melon text-melon" : ""}`} />{c.comment_likes.length || ""}
        </button>
      </div>
    );
  };
  return (
    <div className="space-y-3 border-t border-border px-4 py-3">
      {tops.map((c) => (
        <div key={c.id} className="space-y-2">
          {row(c, false)}
          {all.filter((r) => r.parent_id === c.id).map((r) => row(r, true))}
        </div>
      ))}
      {user && (
        <div className="space-y-1">
          {replyTo && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">Respondendo @{replyTo.author?.username}
              <button aria-label="Cancelar resposta" onClick={() => { setReplyTo(null); setText(""); }}><X className="h-3 w-3" /></button></p>
          )}
          <div className="flex items-center gap-2">
            <StickerPicker onPick={(s) => send(s)} />
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={replyTo ? "Responder…" : "Comentar…"} maxLength={1000} className="h-10 flex-1 rounded-full bg-secondary px-4 text-sm outline-none" />
            <button aria-label="Enviar" onClick={() => send()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function useCollabProfiles(ids: string[]) {
  return useQuery({
    queryKey: ["collab-profiles", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => (await supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified,frame").in("id", ids)).data ?? [],
  });
}

function Reposters({ list }: { list: NonNullable<FeedPost["reposts"]> }) {
  if (!list.length) return null;
  const first = list[0].user;
  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground" title={list.map((r) => "@" + r.user?.username).join(", ")}>
      <Repeat2 className="h-3 w-3 text-rind" />
      <span className="flex -space-x-2">
        {list.slice(0, 3).map((r) => <UserAvatar key={r.user_id} path={r.user?.avatar_url} name={r.user?.display_name} className="h-5 w-5 ring-1 ring-card" />)}
      </span>
      <span className="max-w-20 truncate">@{first?.username}{list.length > 1 ? ` +${list.length - 1}` : ""}</span>
    </span>
  );
}

export function PostCard({ post, vertical = false }: { post: FeedPost; vertical?: boolean }) {
  const { user, isAdmin, profile } = useMe();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const liked = !!user && post.likes.some((l) => l.user_id === user.id);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const isLiked = optimistic ?? liked;
  const likeCount = post.likes.length + (optimistic === null ? 0 : optimistic === liked ? 0 : optimistic ? 1 : -1);
  const embed = spotifyEmbedUrl(post.spotify_url);
  const canDelete = user && (user.id === post.author_id || isAdmin);
  const collabIds = post.collaborators ?? [];
  const collabs = useCollabProfiles(collabIds).data ?? [];
  const reposts = post.reposts ?? [];
  const reposted = !!user && reposts.some((r) => r.user_id === user.id);
  const toggleRepost = async () => {
    if (!user) return;
    const { error } = reposted
      ? await supabase.from("reposts").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("reposts").insert({ post_id: post.id, user_id: user.id });
    if (error) return toast.error(error.message);
    if (!reposted) toast.success("Republicado para seus seguidores");
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const card = useRef<HTMLElement>(null);
  const [viewed, setViewed] = useState(false);
  // Counts one view per person: the database keeps only one row per post and user.
  useEffect(() => {
    const el = card.current;
    if (!el || !user || viewed) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setViewed(true);
      supabase.from("post_views").upsert({ post_id: post.id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true }).then(() => {});
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [user, post.id, viewed]);

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
    <article ref={card} className={`overflow-hidden bg-card ${vertical ? "snap-start rounded-3xl" : "rounded-3xl"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex shrink-0 -space-x-3">
          <UserAvatar path={post.author?.avatar_url} name={post.author?.display_name} frame={collabs.length ? null : post.author?.frame} className="h-10 w-10 ring-2 ring-card" />
          {collabs.slice(0, 2).map((c) => <UserAvatar key={c.id} path={c.avatar_url} name={c.display_name} className="h-10 w-10 ring-2 ring-card" />)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            <Link to="/u/$username" params={{ username: post.author?.username ?? "" }}>{post.author?.display_name}</Link> <Verified show={post.author?.is_verified} />
            {collabs.map((c, i) => (
              <span key={c.id}>{i === collabs.length - 1 ? " e " : ", "}<Link to="/u/$username" params={{ username: c.username }}>{c.display_name}</Link> <Verified show={c.is_verified} /></span>
            ))}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {isBoosted(post) ? <span className="mr-1 inline-flex items-center gap-0.5 text-melon"><Flame className="h-3 w-3" />Turbmels ·</span> : null}
            @{post.author?.username}{collabs.map((c) => ` · @${c.username}`).join("")} · {formatDistanceToNow(new Date(post.created_at), { locale: ptBR })}
          </p>
        </div>
        <Reposters list={reposts} />
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
          <div className="no-scrollbar flex items-center snap-x snap-mandatory overflow-x-auto">
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
        {post.content && <Content text={post.content} />}
        {post.sticker && <Sticker value={post.sticker} className="h-32 w-32" saveable />}
        {post.kind === "poll" && <Poll postId={post.id} />}
        {embed && <AutoSpotify url={embed.replace(/^https:\/\/open\.spotify\.com\/embed\/(\w+)\/([A-Za-z0-9]+).*$/, "spotify:$1:$2")} />}
        <div className="flex items-center gap-5 text-muted-foreground">
          <button onClick={toggleLike} className="flex items-center gap-1.5" aria-label="Curtir">
            <Heart style={isLiked && profile?.like_color ? { color: profile.like_color, fill: profile.like_color } : undefined} className={`h-6 w-6 transition ${isLiked ? "fill-melon text-melon" : ""}`} /> <span className="text-sm">{likeCount}</span>
          </button>
          <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5" aria-label="Comentários">
            <MessageCircle className="h-6 w-6" /> <span className="text-sm">{post.comments[0]?.count ?? 0}</span>
          </button>
          <button onClick={toggleRepost} className={`flex items-center gap-1.5 ${reposted ? "text-rind" : ""}`} aria-label="Republicar">
            <Repeat2 className="h-6 w-6" /> <span className="text-sm">{reposts.length}</span>
          </button>
          <button onClick={() => shareLink(`/p/${post.id}`, `Publicação de @${post.author?.username} na Melan`)} className="flex items-center gap-1.5" aria-label="Compartilhar">
            <Share2 className="h-6 w-6" />
          </button>
          <span className="ml-auto flex items-center gap-1.5 text-sm" aria-label="Visualizações"><Eye className="h-5 w-5" />{post.view_count ?? 0}</span>
        </div>
      </div>
      {showComments && <Comments postId={post.id} postAuthorId={post.author_id} />}
    </article>
  );
}
