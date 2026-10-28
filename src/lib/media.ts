import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function uploadMedia(userId: string, file: File | Blob, ext?: string): Promise<string> {
  const e = ext ?? (file instanceof File ? file.name.split(".").pop() : "png") ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${e}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || undefined,
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
