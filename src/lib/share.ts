import { toast } from "sonner";

export async function shareLink(path: string, title: string) {
  const url = `${window.location.origin}${path}`;
  try {
    if (navigator.share) return await navigator.share({ title, url });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
  }
  await navigator.clipboard.writeText(url).catch(() => {});
  toast.success("Link copiado!");
}
