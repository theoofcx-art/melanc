import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
      </div>
    </AppShell>
  );
}
