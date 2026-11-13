import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Smile, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { useMe } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const BUILTIN_STICKERS = ["🍉", "🦇", "🎃", "👻", "🕸️", "🍬", "💀", "🌙", "🖤", "💚", "✨", "🫶", "😭", "🔥", "😈", "🍭"];

/** Sticker value format: "emoji:🍉" or "img:<storage path>" */
export function Sticker({ value, className = "h-24 w-24", saveable = false }: { value: string; className?: string; saveable?: boolean }) {
  const isImg = value.startsWith("img:");
  const url = useMediaUrl(isImg ? value.slice(4) : null);
  const { user } = useMe();
  const qc = useQueryClient();
  if (!isImg) return <span className="text-6xl leading-none">{value.replace(/^emoji:/, "")}</span>;
  const path = value.slice(4);
  const save = async () => {
    if (!user) return;
    const { data: has } = await supabase.from("stickers").select("id").eq("owner_id", user.id).eq("path", path).maybeSingle();
    if (has) return toast("Essa figurinha já está salva");
    const { error } = await supabase.from("stickers").insert({ owner_id: user.id, path });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["stickers"] });
    toast.success("Figurinha salva! 💚");
  };
  const img = url ? <img src={url} alt="figurinha" className={`${className} object-contain`} /> : <div className={className} />;
  if (!saveable) return img;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {img}
      <button type="button" onClick={save} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px]"><Download className="h-3 w-3" /> Salvar figurinha</button>
    </span>
  );
}

function CustomThumb({ path, onPick }: { path: string; onPick: () => void }) {
  const url = useMediaUrl(path);
  return (
    <button type="button" onClick={onPick} className="h-14 w-14 rounded-lg bg-muted p-1">
      {url && <img src={url} alt="" className="h-full w-full object-contain" />}
    </button>
  );
}

export function StickerPicker({ onPick }: { onPick: (value: string) => void }) {
  const { user } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const custom = useQuery({
    queryKey: ["stickers", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase.from("stickers").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const pick = (v: string) => {
    onPick(v);
    setOpen(false);
  };
  const onUpload = async (f: File) => {
    if (!user) return;
    try {
      const path = await uploadMedia(user.id, f);
      await supabase.from("stickers").insert({ owner_id: user.id, path });
      qc.invalidateQueries({ queryKey: ["stickers"] });
      toast.success("Figurinha criada!");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Figurinhas" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-2xl" align="start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Pacote Melan</p>
        <div className="grid grid-cols-6 gap-1">
          {BUILTIN_STICKERS.map((s) => (
            <button key={s} type="button" onClick={() => pick(`emoji:${s}`)} className="rounded-lg p-1 text-2xl hover:bg-muted">{s}</button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Minhas figurinhas</p>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-xs text-melon">
            <Upload className="h-3 w-3" /> Criar
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(custom.data ?? []).map((s) => (
            <CustomThumb key={s.id} path={s.path} onPick={() => pick(`img:${s.path}`)} />
          ))}
          {custom.data?.length === 0 && <p className="text-xs text-muted-foreground">Envie uma imagem para criar a sua.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
