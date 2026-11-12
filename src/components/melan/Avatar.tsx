import { useMediaUrl } from "@/lib/media";
import { frameUrl } from "@/lib/frames";
import { BadgeCheck } from "lucide-react";

export function UserAvatar({ path, name, className = "h-10 w-10", frame }: { path?: string | null; name?: string; className?: string; frame?: string | null }) {
  const url = useMediaUrl(path);
  const f = frameUrl(frame);
  const inner = url ? (
    <img src={url} alt={name ?? ""} className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-full bg-primary font-display text-primary-foreground`}>
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
  if (!f) return inner;
  return (
    <span className="relative inline-flex shrink-0">
      {inner}
      <img src={f} alt="" aria-hidden className="pointer-events-none absolute -inset-[14%] h-[128%] w-[128%] max-w-none" />
    </span>
  );
}

export function Verified({ show, className = "h-4 w-4" }: { show?: boolean; className?: string }) {
  if (!show) return null;
  return <BadgeCheck aria-label="Verificado" className={`${className} inline fill-verified text-background`} />;
}
