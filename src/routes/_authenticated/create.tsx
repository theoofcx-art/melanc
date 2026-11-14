import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Flame, ImagePlus, Link2, Music, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { useMe } from "@/lib/auth";
import { Sticker, StickerPicker } from "@/components/melan/Stickers";
import { uploadMedia } from "@/lib/media";
import { extractHashtags, spotifyEmbedUrl } from "@/lib/hashtags";
import { cleanPollOptions } from "@/lib/poll";
import { BOOST_PRICE_PER_DAY, FILTERS, boostWhatsAppUrl } from "@/lib/feed";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Criar publicação — Melan" }, { name: "description", content: "Publique fotos, vídeos, carrosséis ou textos no Melan." }] }),
  component: Create,
});

function Create() {
  const { user } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [spotify, setSpotify] = useState("");
  const [showSpotify, setShowSpotify] = useState(false);
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [filter, setFilter] = useState("none");
  const [collabInput, setCollabInput] = useState("");
  const [showCollab, setShowCollab] = useState(false);
  const [sticker, setSticker] = useState<string | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOpts, setPollOpts] = useState<string[]>(["", ""]);
  const [pollMulti, setPollMulti] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boostFor, setBoostFor] = useState<string | null>(null);
  const [days, setDays] = useState(1);

  const publish = async () => {
    if (!user) return;
    const opts = showPoll ? cleanPollOptions(pollOpts) : [];
    if (showPoll && opts.length < 2) return toast.error("A enquete precisa de pelo menos 2 opções");
    if (showPoll && !text.trim()) return toast.error("Escreva a pergunta da enquete");
    if (!text.trim() && files.length === 0 && !sticker) return toast.error("Escreva algo, adicione mídia ou uma figurinha");
    if (spotify && !spotifyEmbedUrl(spotify)) return toast.error("Link do Spotify inválido");
    let linkUrl: string | null = null;
    if (link.trim()) {
      try {
        const u = new URL(/^https?:\/\//.test(link.trim()) ? link.trim() : `https://${link.trim()}`);
        linkUrl = u.toString();
      } catch {
        return toast.error("Link inválido");
      }
    }
    setBusy(true);
    try {
      const names = [...new Set(collabInput.split(/[\s,]+/).map((n) => n.replace(/^@/, "").toLowerCase()).filter(Boolean))].slice(0, 5);
      if (names.length) {
        const { data } = await supabase.from("profiles").select("id,username").in("username", names);
        const missing = names.filter((n) => !data?.some((d) => d.username.toLowerCase() === n));
        if (missing.length) throw new Error(`Usuário não encontrado: @${missing.join(", @")}`);
      }
      const paths: string[] = [];
      const types: string[] = [];
      for (const f of files) {
        paths.push(await uploadMedia(user.id, f));
        types.push(f.type.startsWith("video") ? "video" : "image");
      }
      const kind = showPoll ? "poll" : files.length === 0 ? "text" : files.length > 1 ? "carousel" : types[0] ?? "image";
      const { data, error } = await supabase.from("posts").insert({
        author_id: user.id,
        kind,
        content: text.trim().slice(0, 3000),
        media_urls: paths,
        media_types: types,
        hashtags: extractHashtags(text),
        spotify_url: spotify || null,
        link_url: linkUrl,
        filter: filter === "none" ? null : filter,
        sticker,
        poll_multi: showPoll && pollMulti,
      }).select("id").single();
      if (error) throw error;
      if (showPoll) {
        const { error: pe } = await supabase.from("poll_options").insert(opts.map((label, position) => ({ post_id: data.id, label, position })));
        if (pe) throw pe;
      }
      if (names.length) {
        const { error: ie } = await supabase.rpc("invite_collabs", { _post_id: data.id, _usernames: names });
        if (ie) toast.error(ie.message);
        else toast("Convites de colab enviados — aparece quando aceitarem");
      }
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Publicado! 🍉");
      setBoostFor(data.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4 px-4">
        <h1 className="font-display text-2xl font-bold">Nova publicação</h1>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} placeholder="O que está acontecendo? Use #hashtags…" className="min-h-36 w-full rounded-3xl bg-card p-4 outline-none" />
        {sticker && (
          <div className="relative w-fit">
            <Sticker value={sticker} className="h-28 w-28" />
            <button aria-label="Tirar figurinha" onClick={() => setSticker(null)} className="absolute -right-2 -top-2 rounded-full bg-secondary p-1"><X className="h-3 w-3" /></button>
          </div>
        )}
        {files.length > 0 && (
          <>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {files.map((f, i) => (
                <div key={i} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-bar">
                  {f.type.startsWith("video") ? <video src={URL.createObjectURL(f)} style={{ filter: FILTERS[filter].css }} className="h-full w-full object-cover" /> : <img src={URL.createObjectURL(f)} alt="" style={{ filter: FILTERS[filter].css }} className="h-full w-full object-cover" />}
                  <button aria-label="Remover" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-bar/80 p-1"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {Object.entries(FILTERS).map(([k, f]) => (
                <button key={k} onClick={() => setFilter(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${filter === k ? "bg-melon text-primary-foreground" : "bg-secondary"}`}>{f.label}</button>
              ))}
            </div>
          </>
        )}
        {showSpotify && <input value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="Cole o link de uma música do Spotify" className="h-12 w-full rounded-2xl bg-card px-4 text-sm outline-none" />}
        {spotifyEmbedUrl(spotify) && <iframe title="Spotify" src={spotifyEmbedUrl(spotify)!} className="h-20 w-full rounded-xl" />}
        {showLink && <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link do botão “Saiba mais” (ex: seusite.com)" className="h-12 w-full rounded-2xl bg-card px-4 text-sm outline-none" />}
        {showCollab && <input value={collabInput} onChange={(e) => setCollabInput(e.target.value)} placeholder="Colab: @usuario1 @usuario2 (até 5)" className="h-12 w-full rounded-2xl bg-card px-4 text-sm outline-none" />}
        {showPoll && (
          <div className="space-y-2 rounded-3xl bg-card p-4">
            <p className="text-sm font-semibold">Enquete — a pergunta é o texto acima</p>
            {pollOpts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o} maxLength={80} onChange={(e) => setPollOpts(pollOpts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Opção ${i + 1}`} className="h-11 flex-1 rounded-2xl bg-secondary px-4 text-sm outline-none" />
                {pollOpts.length > 2 && <button aria-label="Remover opção" onClick={() => setPollOpts(pollOpts.filter((_, j) => j !== i))} className="rounded-full bg-secondary p-3"><X className="h-3 w-3" /></button>}
              </div>
            ))}
            {pollOpts.length < 6 && <button onClick={() => setPollOpts([...pollOpts, ""])} className="text-sm text-melon">+ Adicionar opção</button>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pollMulti} onChange={(e) => setPollMulti(e.target.checked)} /> Permitir várias respostas</label>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm">
            <ImagePlus className="h-4 w-4" /> Fotos / vídeos
            <input type="file" accept="image/*,video/*" multiple hidden onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 10))} />
          </label>
          <button onClick={() => setShowSpotify((s) => !s)} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm"><Music className="h-4 w-4" /> Spotify</button>
          <button onClick={() => setShowLink((s) => !s)} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm"><Link2 className="h-4 w-4" /> Link</button>
          <StickerPicker onPick={setSticker} />
          <button onClick={() => setShowPoll((s) => !s)} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm"><BarChart3 className="h-4 w-4" /> Enquete</button>
          <button onClick={() => setShowCollab((s) => !s)} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm"><Users className="h-4 w-4" /> Colab</button>
        </div>
        <button disabled={busy} onClick={publish} className="h-12 w-full rounded-full bg-melon font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Publicando…" : "Publicar"}</button>
      </div>

      {boostFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 sm:items-center">
          <div className="relative w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 shadow-float">
            <button aria-label="Fechar" onClick={() => navigate({ to: "/feed" })} className="absolute right-4 top-4 rounded-full bg-secondary p-1.5"><X className="h-4 w-4" /></button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-melon text-primary-foreground"><Flame className="h-6 w-6" /></div>
            <h2 className="font-display text-xl font-bold">Deseja turbmels?</h2>
            <p className="text-sm text-muted-foreground">Seu mel aparece várias vezes no feed para muito mais pessoas. R$ {BOOST_PRICE_PER_DAY},00 por dia.</p>
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-2">
              <button onClick={() => setDays((d) => Math.max(1, d - 1))} className="h-9 w-9 rounded-full bg-card text-lg">−</button>
              <span className="text-sm font-semibold">{days} dia(s) · R$ {days * BOOST_PRICE_PER_DAY},00</span>
              <button onClick={() => setDays((d) => Math.min(30, d + 1))} className="h-9 w-9 rounded-full bg-card text-lg">+</button>
            </div>
            <a href={boostWhatsAppUrl(boostFor, days)} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => navigate({ to: "/feed" }), 300)} className="flex h-12 w-full items-center justify-center rounded-full bg-melon font-semibold text-primary-foreground">Quero turbmels</a>
          </div>
        </div>
      )}
    </AppShell>
  );
}
