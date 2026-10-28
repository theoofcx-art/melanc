import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MelanLogo } from "@/components/melan/Logo";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Melan — a rede social doce e sombria" },
      { name: "description", content: "Poste fotos, vídeos e textos, converse no Direct com figurinhas e fale com a Wyp, a IA do Melan." },
      { property: "og:title", content: "Melan — a rede social doce e sombria" },
      { property: "og:description", content: "Fotos, vídeos, textos, figurinhas e a IA Wyp em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/feed", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <MelanLogo size="lg" />
      <p className="max-w-xs text-muted-foreground">Fotos, vídeos, textos, figurinhas e a Wyp — tudo com sabor de melancia 🍉🦇</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link to="/auth" search={{ mode: "signup" }} className="rounded-full bg-melon py-3 font-semibold text-primary-foreground">Criar conta</Link>
        <Link to="/auth" search={{ mode: "signin" }} className="rounded-full bg-primary py-3 font-semibold text-primary-foreground">Entrar</Link>
      </div>
    </div>
  );
}
