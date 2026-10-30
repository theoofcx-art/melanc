import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Music, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";
import { useMe } from "@/lib/auth";
import { uploadMedia } from "@/lib/media";
import { extractHashtags, spotifyEmbedUrl } from "@/lib/hashtags";

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
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    if (!user) return;
    if (!text.trim() && files.length === 0) return toast.error("Escreva algo ou adicione mídia");
    if (spotify && !spotifyEmbedUrl(spotify)) return toast.error("Link do Spotify inválido");
    setBusy(true);
    try {
      const paths: string[] = [];
      const types: string[] = [];
      for (const f of files) {
        paths.push(await uploadMedia(user.id, f));
        types.push(f.type.startsWith("video") ? "video" : "image");
      }
      const kind = files.length === 0 ? "text" : files.length > 1 ? "carousel" : types[0] ?? "image";
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        kind,
        content: text.trim().slice(0, 3000),
        media_urls: paths,
        media_types: types,
        hashtags: extractHashtags(text),
        spotify_url: spotify || null,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Publicado! 🍉");
      navigate({ to: "/feed" });
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
        {files.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {files.map((f, i) => (
              <div key={i} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-bar">
                {f.type.startsWith("video") ? <video src={URL.createObjectURL(f)} className="h-full w-full object-cover" /> : <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />}
                <button aria-label="Remover" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-bar/80 p-1"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
        {showSpotify && (
          <input value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="Cole o link de uma música do Spotify" className="h-12 w-full rounded-2xl bg-card px-4 text-sm outline-none" />
        )}
        {spotifyEmbedUrl(spotify) && <iframe title="Spotify" src={spotifyEmbedUrl(spotify)!} className="h-20 w-full rounded-xl" />}
        <div className="flex gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm">
            <ImagePlus className="h-4 w-4" /> Fotos / vídeos
            <input type="file" accept="image/*,video/*" multiple hidden onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 10))} />
          </label>
          <button onClick={() => setShowSpotify((s) => !s)} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm"><Music className="h-4 w-4" /> Spotify</button>
        </div>
        <button disabled={busy} onClick={publish} className="h-12 w-full rounded-full bg-melon font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Publicando…" : "Publicar"}</button>
      </div>
    </AppShell>
  );
}
