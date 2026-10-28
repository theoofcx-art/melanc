import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Melan" },
      { name: "description", content: "Defina uma nova senha para sua conta Melan." },
      { property: "og:title", content: "Nova senha — Melan" },
      { property: "og:description", content: "Redefina sua senha do Melan." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const save = async () => {
    if (pw.length < 8) return toast.error("Mínimo de 8 caracteres");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    navigate({ to: "/feed" });
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold">Definir nova senha</h1>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nova senha" className="h-12 rounded-2xl bg-secondary px-4 outline-none" />
      <button onClick={save} className="h-12 rounded-full bg-melon font-semibold text-primary-foreground">Salvar</button>
    </div>
  );
}
