import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Heart, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { UserAvatar } from "./Avatar";

type Prof = { id: string; username: string; display_name: string; avatar_url: string | null; frame: string | null };
type Status = { id: string; author_id: string; media_path: string | null; media_type: string; content: string; created_at: string; author: Prof | null };
const PROF = "id,username,display_name,avatar_url,frame";

export function StatusBar() {
  const { user, profile } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["statuses", user?.id],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      const since = new Date(Date.now() - 864e5).toISOString();
      const { data } = await supabase.from("statuses").select(`*, author:profiles!statuses_author_id_fkey(${PROF})`).gte("created_at", since).order("created_at");
      const seen = await supabase.from("status_views").select("status_id").eq("user_id", user!.id);
      return { list: (data ?? []) as unknown as Status[], seen: new Set((seen.data ?? []).map((s) => s.status_id)) };
    },
  });
  const groups = new Map<string, Status[]>();
  for (const s of q.data?.list ?? []) groups.set(s.author_id, [...(groups.get(s.author_id) ?? []), s]);
  const order = [...groups.keys()].sort((a, b) => (a === user?.id ? -1 : b === user?.id ? 1 : 0));

  const add = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const path = await uploadMedia(user.id, file);
      const { error } = await supabase.from("statuses").insert({ author_id: user.id, media_path: path, media_type: file.type.startsWith("video") ? "video" : "image" });
      if (error) throw error;
      toast.success("Status publicado por 24h");
      qc.invalidateQueries({ queryKey: ["statuses"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-3">
        {!groups.has(user?.id ?? "") && (
          <label className="flex w-16 shrink-0 cursor-pointer flex-col items-center gap-1">
            <span className="relative">
              <UserAvatar path={profile?.avatar_url} name={profile?.display_name} className="h-16 w-16 opacity-80" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-melon ring-2 ring-background"><Plus className="h-4 w-4" /></span>
            </span>
            <span className="truncate text-[11px] text-muted-foreground">{busy ? "Enviando…" : "Seu status"}</span>
            <input type="file" accept="image/*,video/*" hidden disabled={busy} onChange={(e) => e.target.files?.[0] && add(e.target.files[0])} />
          </label>
        )}
        {order.map((uid) => {
          const list = groups.get(uid)!;
          const a = list[0].author;
          const unseen = list.some((s) => !q.data?.seen.has(s.id)) && uid !== user?.id;
          return (
            <button key={uid} onClick={() => setOpen(uid)} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <span className={`rounded-full p-[3px] ${unseen ? "bg-gradient-to-tr from-melon to-rind" : "bg-secondary"}`}>
                <span className="block rounded-full bg-background p-[2px]"><UserAvatar path={a?.avatar_url} name={a?.display_name} className="h-14 w-14" /></span>
              </span>
              <span className="w-full truncate text-center text-[11px]">{uid === user?.id ? "Você" : a?.username}</span>
            </button>
          );
        })}
      </div>
      {open && groups.get(open) && (
        <Viewer list={groups.get(open)!} onClose={() => { setOpen(null); qc.invalidateQueries({ queryKey: ["statuses"] }); }} onAdd={add} />
      )}
    </>
  );
}

function Viewer({ list, onClose, onAdd }: { list: Status[]; onClose: () => void; onAdd: (f: File) => void }) {
  const { user } = useMe();
  const qc = useQueryClient();
  const [i, setI] = useState(0);
  const [showWho, setShowWho] = useState(false);
  const s = list[Math.min(i, list.length - 1)];
  const mine = s.author_id === user?.id;
  const url = useMediaUrl(s.media_path);

  useEffect(() => {
    if (!user || mine) return;
    supabase.from("status_views").upsert({ status_id: s.id, user_id: user.id }, { onConflict: "status_id,user_id", ignoreDuplicates: true }).then(() => {});
  }, [s.id, user, mine]);
  useEffect(() => {
    if (s.media_type === "video") return;
    const t = setTimeout(() => (i < list.length - 1 ? setI(i + 1) : onClose()), 6000);
    return () => clearTimeout(t);
  }, [i, s.media_type, list.length, onClose]);

  const info = useQuery({
    queryKey: ["status-info", s.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [v, l] = await Promise.all([
        supabase.from("status_views").select(`user:profiles!status_views_user_id_fkey(${PROF})`).eq("status_id", s.id),
        supabase.from("status_likes").select(`user_id, user:profiles!status_likes_user_id_fkey(${PROF})`).eq("status_id", s.id),
      ]);
      return { views: (v.data ?? []).map((x) => x.user as unknown as Prof), likes: (l.data ?? []).map((x) => x.user as unknown as Prof), iLiked: (l.data ?? []).some((x) => x.user_id === user!.id) };
    },
  });
  const like = async () => {
    if (!user) return;
    if (info.data?.iLiked) await supabase.from("status_likes").delete().eq("status_id", s.id).eq("user_id", user.id);
    else await supabase.from("status_likes").insert({ status_id: s.id, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["status-info", s.id] });
  };
  const del = async () => {
    await supabase.from("statuses").delete().eq("id", s.id);
    onClose();
  };
  const likedIds = new Set((info.data?.likes ?? []).map((p) => p?.id));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex gap-1 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        {list.map((x, k) => <span key={x.id} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-foreground" : "bg-foreground/25"}`} />)}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <UserAvatar path={s.author?.avatar_url} name={s.author?.display_name} className="h-9 w-9" />
        <p className="flex-1 truncate font-semibold">@{s.author?.username}</p>
        {mine && <button aria-label="Excluir status" onClick={del} className="p-2"><Trash2 className="h-5 w-5" /></button>}
        <button aria-label="Fechar" onClick={onClose} className="p-2"><X className="h-6 w-6" /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {url && (s.media_type === "video"
          ? <video src={url} autoPlay playsInline onEnded={() => (i < list.length - 1 ? setI(i + 1) : onClose())} className="max-h-full w-full object-contain" />
          : <img src={url} alt="" className="max-h-full w-full object-contain" />)}
        {s.content && <p className="absolute inset-x-6 bottom-6 text-center text-lg font-semibold">{s.content}</p>}
        <button aria-label="Anterior" onClick={() => setI(Math.max(0, i - 1))} className="absolute inset-y-0 left-0 w-1/3" />
        <button aria-label="Próximo" onClick={() => (i < list.length - 1 ? setI(i + 1) : onClose())} className="absolute inset-y-0 right-0 w-1/3" />
      </div>
      <div className="flex items-center justify-between px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {mine ? (
          <>
            <button onClick={() => setShowWho(true)} className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5"><Eye className="h-5 w-5" />{info.data?.views.length ?? 0}</span>
              <span className="flex items-center gap-1.5"><Heart className="h-5 w-5 fill-melon text-melon" />{info.data?.likes.length ?? 0}</span>
              <span className="text-muted-foreground">Ver quem viu</span>
            </button>
            <label className="cursor-pointer rounded-full bg-secondary px-4 py-2 text-sm">+ Adicionar<input type="file" accept="image/*,video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { onAdd(f); onClose(); } }} /></label>
          </>
        ) : (
          <button aria-label="Curtir status" onClick={like} className="ml-auto"><Heart className={`h-8 w-8 ${info.data?.iLiked ? "fill-melon text-melon" : ""}`} /></button>
        )}
      </div>
      {showWho && (
        <div className="absolute inset-x-0 bottom-0 max-h-[60vh] overflow-y-auto rounded-t-3xl bg-card p-4">
          <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Visualizações</p><button aria-label="Fechar lista" onClick={() => setShowWho(false)}><X className="h-5 w-5" /></button></div>
          {(info.data?.views ?? []).length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Ninguém viu ainda.</p>}
          {(info.data?.views ?? []).filter(Boolean).map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2">
              <UserAvatar path={p.avatar_url} name={p.display_name} frame={p.frame} className="h-9 w-9" />
              <p className="flex-1 text-sm">@{p.username}</p>
              {likedIds.has(p.id) && <Heart className="h-4 w-4 fill-melon text-melon" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
