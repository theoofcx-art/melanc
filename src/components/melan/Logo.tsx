import logo from "@/assets/melan-logo.jpg.asset.json";

function Bat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} fill="currentColor" aria-hidden>
      <path d="M32 10c2-4 3-6 3-8 1 2 1 4 0 6 4-1 9-1 13 2 3-3 9-4 16-2-5 1-8 4-9 8-3-2-6-1-8 2-2-2-5-2-7 0-2 2-4 4-8 6-4-2-6-4-8-6-2-2-5-2-7 0-2-3-5-4-8-2-1-4-4-7-9-8 7-2 13-1 16 2 4-3 9-3 13-2-1-2-1-4 0-6 0 2 1 4 3 8z" />
    </svg>
  );
}

export function MelanLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="relative inline-flex items-center gap-1.5 select-none">
      <Bat className={`bat-flap absolute -top-3 -left-4 text-foreground/60 ${big ? "w-8" : "w-5"}`} />
      <img
        src={logo.url}
        alt=""
        className={`${big ? "h-12 w-12" : "h-8 w-8"} rounded-full object-cover ring-2 ring-rind/60`}
      />
      <span className={`font-display font-extrabold tracking-tight text-foreground ${big ? "text-5xl" : "text-2xl"}`}>
        Mel<span className="text-melon">a</span>n
      </span>
      <Bat className={`bat-flap absolute -top-2 -right-5 text-foreground/60 [animation-delay:0.6s] ${big ? "w-7" : "w-4"}`} />
    </div>
  );
}
