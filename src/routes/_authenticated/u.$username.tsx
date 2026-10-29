import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, Image as ImageIcon, Film, AlignLeft, Lock, LogOut, Send } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { UserAvatar, Verified } from "@/components/melan/Avatar";
import { PostCard, POST_SELECT, type FeedPost } from "@/components/melan/PostCard";
import { useMe, type Profile } from "@/lib/auth";
import { useMediaUrl } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} — Melan` }, { name: "description", content: `Perfil de @${params.username} no Melan.` }] }),
  component: ProfilePage,
});

function Thumb({ post }: { post: FeedPost }) {
  const url = useMediaUrl(post.media_urls[0]);
  const isVideo = post.media_types[0] === "video";
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-xl bg-card">
      {url && (isVideo ? <video src={url} className="h-full w-full object-cover" muted /> : <img src={url} alt="" className="h-full w-full object-cover" />)}
    </div>
  );
}

function ProfilePage() {
  const { username } = Route.useParams();
  const { user, profile: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"media" | "video" | "text">("media");
  const uname = username === "me" ? me?.username : username;

  const prof = useQuery({
    queryKey: ["profile", uname],
    enabled: !!uname,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", uname!).maybeSingle();
      return data as Profile | null;
    },
  });
  const p = prof.data;
  const isMe = !!p && p.id === user?.id;

  const stats = useQuery({
    queryKey: ["profile-stats", p?.id],
    enabled: !!p,
    queryFn: async () => {
      const [followers, following, posts] = await Promise.all([
        supabase.from("follows").select("follower_id, follower:profiles!follows_follower_id_fkey(avatar_url,display_name)").eq("following_id", p!.id),
        supabase.from("follows").select("following_id").eq("follower_id", p!.id),
        supabase.from("posts").select(POST_SELECT).eq("author_id", p!.id).order("created_at", { ascending: false }),
      ]);
      const fs = new Set((following.data ?? []).map((f) => f.following_id));
      const connections = (followers.data ?? []).filter((f) => fs.has(f.follower_id)).length;
      const postsData = (posts.data ?? []) as unknown as FeedPost[];
      const hearts = postsData.reduce((n, x) => n + x.likes.length, 0);
      return { followers: followers.data ?? [], connections, hearts, posts: postsData, amFollowing: (followers.data ?? []).some((f) => f.follower_id === user?.id) };
    },
  });
  const banner = useMediaUrl(p?.banner_url);

  if (prof.isLoading || !uname) return <AppShell hideHeader><p className="p-10 text-center text-muted-foreground">Carregando…</p></AppShell>;
  if (!p) return <AppShell><p className="p-10 text-center text-muted-foreground">Perfil não encontrado.</p></AppShell>;

  const s = stats.data;
  const locked = p.is_private && !isMe && !s?.amFollowing;
  const follow = async () => {
    if (!user) return;
    if (s?.amFollowing) await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", p.id);
    else await supabase.from("follows").insert({ follower_id: user.id, following_id: p.id });
    qc.invalidateQueries({ queryKey: ["profile-stats", p.id] });
  };
  const shown = (s?.posts ?? []).filter((x) => (tab === "text" ? x.kind === "text" : tab === "video" ? x.media_types.includes("video") : x.media_urls.length > 0 && !x.media_types.every((t) => t === "video")));

  return (
    <AppShell hideHeader>
      <div className="relative">
        <div className="absolute inset-0 h-[26rem] overflow-hidden">
          {banner ? <img src={banner} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-primary" />}
          <div className="banner-fade absolute inset-0" />
        </div>
        <div className="relative px-4 pt-16">
          {isMe && (
            <button aria-label="Sair" onClick={async () => { qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", search: { mode: "signin" }, replace: true }); }} className="absolute right-4 top-4 rounded-full bg-bar/60 p-2.5"><LogOut className="h-5 w-5" /></button>
          )}
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar path={p.avatar_url} name={p.display_name} className="h-28 w-28 ring-4 ring-background/40" />
              {isMe && <Link to="/create" aria-label="Novo" className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-verified ring-2 ring-background"><Plus className="h-5 w-5" /></Link>}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-semibold italic">{p.display_name} <Verified show={p.is_verified} className="h-6 w-6" /></h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-bar/50 px-3 py-1 text-muted-foreground">@{p.username}</span>
                {p.pronouns && <span className="text-muted-foreground">{p.pronouns}</span>}
                {p.is_private && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </div>
          {p.bio && <p className="mt-4 text-sm">{p.bio}</p>}
          <div className="mt-4 flex items-center justify-between gap-3">
            {p.link ? (
              <a href={p.link.startsWith("http") ? p.link : `https://${p.link}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 truncate text-lg"><Link2 className="h-5 w-5" />{p.link.replace(/^https?:\/\//, "")}</a>
            ) : <span />}
            {isMe ? (
              <Link to="/profile/edit" className="rounded-full bg-primary px-7 py-2.5 text-lg">Editar</Link>
            ) : (
              <div className="flex gap-2">
                <Link to="/messages/$userId" params={{ userId: p.id }} aria-label="Mensagem" className="rounded-full bg-secondary p-3"><Send className="h-5 w-5" /></Link>
                <button onClick={follow} className={`rounded-full px-6 py-2.5 ${s?.amFollowing ? "bg-secondary" : "bg-melon text-primary-foreground"}`}>{s?.amFollowing ? "Admirando" : "Admirar"}</button>
              </div>
            )}
          </div>
          <div className="mt-8 grid grid-cols-3 text-center">
            <Stat n={s?.connections ?? 0} label="Conexões" />
            <Stat n={s?.hearts ?? 0} label="Corações" wide />
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center -space-x-3">
                {(s?.followers ?? []).slice(0, 3).map((f) => <UserAvatar key={f.follower_id} path={f.follower?.avatar_url} name={f.follower?.display_name} className="h-12 w-12 ring-2 ring-background" />)}
                <span className="flex h-12 min-w-12 items-center justify-center rounded-full bg-secondary px-3 text-xl font-semibold">{s?.followers.length ?? 0}</span>
              </div>
              <span className="text-base">Admiradores</span>
            </div>
          </div>
          {isMe && (
            <Link to="/create" className="mx-auto mt-6 flex w-fit flex-col items-center gap-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary"><Plus className="h-7 w-7" /></span>
              <span>Novo</span>
            </Link>
          )}
        </div>
      </div>

      {locked ? (
        <div className="py-16 text-center text-muted-foreground"><Lock className="mx-auto mb-2 h-8 w-8" />Esta conta é privada</div>
      ) : (
        <>
          <div className="mt-6 flex justify-center gap-3 px-4">
            {([["media", ImageIcon], ["video", Film], ["text", AlignLeft]] as const).map(([k, I]) => (
              <button key={k} aria-label={k} onClick={() => setTab(k)} className={`flex h-14 flex-1 items-center justify-center rounded-full ${tab === k ? "bg-primary" : "bg-secondary"}`}><I className="h-6 w-6" /></button>
            ))}
          </div>
          {tab === "text" ? (
            <div className="mt-3 space-y-3 px-3">{shown.map((x) => <PostCard key={x.id} post={x} />)}</div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-1 px-1">{shown.map((x) => <Thumb key={x.id} post={x} />)}</div>
          )}
          {shown.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nada aqui ainda</p>}
        </>
      )}
    </AppShell>
  );
}

function Stat({ n, label, wide }: { n: number; label: string; wide?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`flex h-12 items-center justify-center rounded-full bg-secondary text-2xl font-semibold ${wide ? "px-8" : "w-12"}`}>{n}</span>
      <span className="text-base">{label}</span>
    </div>
  );
}
