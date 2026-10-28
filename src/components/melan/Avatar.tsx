import { useMediaUrl } from "@/lib/media";
import { BadgeCheck } from "lucide-react";

export function UserAvatar({ path, name, className = "h-10 w-10" }: { path?: string | null; name?: string; className?: string }) {
  const url = useMediaUrl(path);
  return url ? (
    <img src={url} alt={name ?? ""} className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-full bg-primary font-display text-primary-foreground`}>
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function Verified({ show, className = "h-4 w-4" }: { show?: boolean; className?: string }) {
  if (!show) return null;
  return <BadgeCheck aria-label="Verificado" className={`${className} inline fill-verified text-background`} />;
}
