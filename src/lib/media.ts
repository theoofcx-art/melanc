import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Shrink photos to max 800px wide WebP (q 0.7) before upload. GIFs/videos untouched. */
export async function compressImage(file: File | Blob): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || typeof createImageBitmap === "undefined") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 800 / bmp.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.7));
    return out && out.type === "image/webp" && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

export async function uploadMedia(userId: string, file: File | Blob, ext?: string): Promise<string> {
  const body = await compressImage(file);
  const e = body.type === "image/webp" && body !== file ? "webp" : (ext ?? (file instanceof File ? file.name.split(".").pop() : "png") ?? "bin");
  const path = `${userId}/${crypto.randomUUID()}.${e}`;
  const { error } = await supabase.storage.from("media").upload(path, body, {
    contentType: body.type || undefined,
  });
  if (error) throw error;
  return path;
}

/** Resolve a stored path (or absolute URL) to a viewable URL. */
export function useMediaUrl(path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["media-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      if (!path) return null;
      if (/^(https?:|data:|blob:)/.test(path)) return path;
      const { data, error } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24);
      if (error) return null;
      return data.signedUrl;
    },
  });
  return data ?? null;
}
