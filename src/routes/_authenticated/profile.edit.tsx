import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BADGES, FRAMES, WINNER_COLORS, availableFrames, type BadgeKey, type FrameKey } from "@/lib/frames";
import { shareLink } from "@/lib/share";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { UserAvatar } from "@/components/melan/Avatar";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/lib/auth";
import { uploadMedia, useMediaUrl } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({ meta: [{ title: "Editar perfil — Melan" }, { name: "description", content: "Altere banner, foto, nome, bio e privacidade." }] }),
  component: Edit,
});

const field = "h-12 w-full rounded-2xl bg-card px-4 text-sm outline-none";

function Edit() {
  const { user, profile } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ display_name: "", username: "", bio: "", pronouns: "", link: "", interests: "", is_private: false, avatar_url: null as string | null, banner_url: null as string | null });
  useEffect(() => {
    if (profile) setF({ display_name: profile.display_name, username: profile.username, bio: profile.bio ?? "", pronouns: profile.pronouns ?? "", link: profile.link ?? "", interests: profile.interests.join(" "), is_private: profile.is_private, avatar_url: profile.avatar_url, banner_url: profile.banner_url });
  }, [profile]);
  const banner = useMediaUrl(f.banner_url);
  const owned = useQuery({
    queryKey: ["my-frames", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("user_frames").select("frame").eq("user_id", user!.id)).data ?? []).map((r) => r.frame),
  });
  const followers = useQuery({
    queryKey: ["follower-count", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", user!.id)).count ?? 0,
  });
  const can = availableFrames(owned.data ?? [], followers.data ?? 0, !!profile?.is_mels_winner);
  const [refName, setRefName] = useState("");
  const [allFrames, setAllFrames] = useState(false);
  const claim = async () => {
    const { data, error } = await supabase.rpc("claim_referral", { _ref: refName });
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Não foi possível: confira o @ (vale só na primeira semana e uma vez)");
    toast.success("Moldura Arco-íris liberada para vocês dois! 🌈");
    qc.invalidateQueries();
  };
  const wear = async (key: FrameKey | null) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ frame: key }).eq("id", user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
    toast.success(key ? `Moldura ${FRAMES[key].label} aplicada` : "Moldura removida");
  };

  const setWinnerColor = async (col: "like_color" | "profile_bg", v: string | null) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ [col]: v }).eq("id", user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
  };

  const setBadge = async (key: BadgeKey | null) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ badge: key }).eq("id", user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
  };

  const up = async (file: File, key: "avatar_url" | "banner_url") => {
    if (!user) return;
    try { setF({ ...f, [key]: await uploadMedia(user.id, file) }); } catch (e) { toast.error((e as Error).message); }
  };
  const save = async () => {
    if (!user) return;
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(f.username)) return toast.error("Nome de utilizador inválido");
    const interests = f.interests.split(/[\s,#]+/).map((s) => s.toLowerCase()).filter(Boolean).slice(0, 20);
    const { error } = await supabase.from("profiles").update({
      display_name: f.display_name.slice(0, 50), username: f.username.toLowerCase(), bio: f.bio.slice(0, 160), pronouns: f.pronouns.slice(0, 30), link: f.link.slice(0, 200), interests, is_private: f.is_private, avatar_url: f.avatar_url, banner_url: f.banner_url,
    }).eq("id", user.id);
    if (error) return toast.error(error.message.includes("duplicate") ? "Esse @ já está em uso" : error.message);
    qc.invalidateQueries();
    toast.success("Perfil atualizado");
    navigate({ to: "/u/$username", params: { username: f.username.toLowerCase() } });
  };

  return (
    <AppShell hideHeader>
      <div className="space-y-4 p-4">
        <h1 className="font-display text-2xl font-bold">Editar perfil</h1>
        <label className="block h-36 cursor-pointer overflow-hidden rounded-3xl bg-primary">
          {banner ? <img src={banner} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-sm text-muted-foreground">Alterar banner</span>}
          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && up(e.target.files[0], "banner_url")} />
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <UserAvatar path={f.avatar_url} name={f.display_name} className="h-20 w-20" />
          <span className="text-sm text-melon">Alterar foto de perfil</span>
          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && up(e.target.files[0], "avatar_url")} />
        </label>
        <input className={field} placeholder="Nome" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
        <input className={field} placeholder="@utilizador" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <input className={field} placeholder="Pronomes (ex: He/him)" value={f.pronouns} onChange={(e) => setF({ ...f, pronouns: e.target.value })} />
        <textarea className={`${field} h-24 py-3`} placeholder="Bio" value={f.bio} maxLength={160} onChange={(e) => setF({ ...f, bio: e.target.value })} />
        <input className={field} placeholder="Link na bio" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
        <input className={field} placeholder="Interesses: #kpop #anime #música" value={f.interests} onChange={(e) => setF({ ...f, interests: e.target.value })} />
        <div className="flex items-center justify-between rounded-2xl bg-card p-4">
          <span className="text-sm">Conta privada</span>
          <Switch checked={f.is_private} onCheckedChange={(v) => setF({ ...f, is_private: v })} />
        </div>
        <button onClick={save} className="h-12 w-full rounded-full bg-melon font-semibold text-primary-foreground">Salvar</button>
        {profile?.is_mels_winner && (
          <section className="space-y-4 rounded-3xl bg-card p-4 aura-ring aura-vampiro">
            <h2 className="font-display text-xl font-bold text-melon">🏆 Vencedor do Mels</h2>
            {(["like_color", "profile_bg"] as const).map((col) => (
              <div key={col} className="space-y-2">
                <p className="text-sm">{col === "like_color" ? "Cor das suas curtidas" : "Cor do fundo do perfil"}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setWinnerColor(col, null)} className={`h-9 rounded-full bg-secondary px-3 text-xs ${!profile[col] ? "ring-2 ring-foreground" : ""}`}>Padrão</button>
                  {WINNER_COLORS.map((c) => (
                    <button key={c} aria-label={c} onClick={() => setWinnerColor(col, c)} style={{ backgroundColor: c }} className={`h-9 w-9 rounded-full ${profile[col] === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`} />
                  ))}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {(["mels_onda", "mels_dragao"] as FrameKey[]).map((k) => (
                <button key={k} onClick={() => wear(k)} className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${profile.frame === k ? "bg-primary" : "bg-secondary"}`}>
                  <UserAvatar path={f.avatar_url} name={f.display_name} frame={k} className="h-14 w-14" />
                  <span className="text-xs">{FRAMES[k].label}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        <section className="space-y-3 rounded-3xl bg-card p-4">
          <h2 className="font-display text-xl font-bold">Etiqueta</h2>
          <p className="text-xs text-muted-foreground">Aparece em cima da sua bio.</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(BADGES) as BadgeKey[]).map((k) => (
              <button key={k} onClick={() => setBadge(profile?.badge === k ? null : k)} className={`${BADGES[k].aura} flex items-center gap-2 rounded-2xl bg-secondary p-3 text-left text-xs ${profile?.badge === k ? "aura-ring" : ""}`}>
                <span className="text-2xl">{BADGES[k].emoji}</span>{BADGES[k].label}
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-3 rounded-3xl bg-card p-4">
          <h2 className="font-display text-xl font-bold">Molduras</h2>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => wear(null)} className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${!profile?.frame ? "bg-primary" : "bg-secondary"}`}>
              <UserAvatar path={f.avatar_url} name={f.display_name} className="h-14 w-14" />
              <span className="text-xs">Sem moldura</span>
            </button>
            {(Object.keys(FRAMES) as FrameKey[]).filter((k) => !FRAMES[k].winner).slice(0, allFrames ? undefined : 2).map((k) => {
              const ok = can.includes(k);
              return (
                <button key={k} disabled={!ok} onClick={() => wear(k)} className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${profile?.frame === k ? "bg-primary" : "bg-secondary"} ${ok ? "" : "opacity-50"}`}>
                  <UserAvatar path={f.avatar_url} name={f.display_name} frame={k} className="h-14 w-14" />
                  <span className="text-xs">{FRAMES[k].label}</span>
                  <span className="text-[10px] text-muted-foreground">{ok ? (FRAMES[k].free ? "Grátis" : "Desbloqueada") : "🔒 " + FRAMES[k].how}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setAllFrames((v) => !v)} className="h-10 w-full rounded-full bg-secondary text-sm">{allFrames ? "Ver menos" : "Ver mais"}</button>
          <button onClick={() => profile && shareLink(`/convite/${profile.username}`, "Entre na Melan comigo 🍉")} className="h-11 w-full rounded-full bg-melon text-sm font-semibold text-primary-foreground">Convidar amigo e ganhar a moldura Arco-íris</button>
          <p className="text-center text-xs text-muted-foreground">Quando alguém criar conta pelo seu link, vocês dois ganham a moldura.</p>
          {!owned.data?.includes("nyan") && (
            <div className="flex gap-2">
              <input value={refName} onChange={(e) => setRefName(e.target.value)} placeholder="Quem te convidou? @usuario" className="h-11 flex-1 rounded-full bg-secondary px-4 text-sm outline-none" />
              <button onClick={claim} className="h-11 rounded-full bg-primary px-4 text-sm font-semibold">Resgatar</button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
