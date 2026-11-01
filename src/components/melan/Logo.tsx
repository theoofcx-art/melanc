import logo from "@/assets/melan-logo.jpg.asset.json";

function SantaHat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} aria-hidden>
      <path d="M4 26C8 12 18 4 30 6c-4 3-5 8-4 14z" fill="hsl(0 75% 50%)" />
      <rect x="2" y="24" width="28" height="6" rx="3" fill="hsl(0 0% 96%)" />
      <circle cx="33" cy="7" r="4" fill="hsl(0 0% 96%)" />
    </svg>
  );
}

function Snowflake({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 2v20M4 6l16 12M20 6L4 18M9 3l3 3 3-3M9 21l3-3 3 3" />
    </svg>
  );
}

export function MelanLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="relative inline-flex items-center gap-1.5 select-none">
      <Snowflake className={`bat-flap absolute -top-3 -left-4 text-foreground/70 ${big ? "w-6" : "w-4"}`} />
      <div className="relative">
        <img src={logo.url} alt="" className={`${big ? "h-12 w-12" : "h-8 w-8"} rounded-full object-cover ring-2 ring-rind/60`} />
        <SantaHat className={`absolute -rotate-12 ${big ? "-top-5 -left-2 w-10" : "-top-3.5 -left-1.5 w-7"}`} />
      </div>
      <span className={`font-display font-extrabold tracking-tight text-foreground ${big ? "text-5xl" : "text-2xl"}`}>
        Mel<span className="text-melon">a</span>n
      </span>
      <Snowflake className={`bat-flap absolute -top-2 -right-5 text-foreground/70 [animation-delay:0.6s] ${big ? "w-5" : "w-3.5"}`} />
    </div>
  );
}
