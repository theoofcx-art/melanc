import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { MelanLogo } from "@/components/melan/Logo";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: s.mode === "signup" ? "signup" : "signin" }) as { mode: "signin" | "signup" },
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Melan" },
      { name: "description", content: "Entre na sua conta Melan ou crie uma nova com email e verificação." },
      { property: "og:title", content: "Entrar no Melan" },
      { property: "og:description", content: "Crie sua conta Melan em segundos." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
  display_name: z.string().trim().min(1, "Informe seu nome").max(50),
  username: z.string().trim().regex(/^[a-zA-Z0-9_.]{3,24}$/, "3–24 letras, números, _ ou ."),
  bio: z.string().max(160),
});

const field = "h-12 w-full rounded-2xl bg-secondary px-4 text-sm outline-none ring-ring focus:ring-2";

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", display_name: "", username: "", bio: "" });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [forgot, setForgot] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const signUp = async () => {
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/feed`,
        data: { display_name: parsed.data.display_name, username: parsed.data.username, bio: parsed.data.bio, ref: localStorage.getItem("melan-ref") ?? "" },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (avatar) sessionStorage.setItem("melan-pending-avatar", "1");
    setVerifyEmail(parsed.data.email);
    toast.success("Enviamos um código de verificação para o seu email");
  };

  const verify = async () => {
    if (!verifyEmail || code.length < 6) return;
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: verifyEmail, token: code, type: "signup" });
    if (error) {
      setBusy(false);
      return toast.error("Código inválido ou expirado");
    }
    if (avatar && data.user) {
      const path = `${data.user.id}/${crypto.randomUUID()}.${avatar.name.split(".").pop()}`;
      const up = await supabase.storage.from("media").upload(path, avatar);
      if (!up.error) await supabase.from("profiles").update({ avatar_url: path }).eq("id", data.user.id);
    }
    setBusy(false);
    navigate({ to: "/feed" });
  };

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (error) return toast.error(error.message === "Email not confirmed" ? "Confirme seu email primeiro" : "Email ou senha incorretos");
    navigate({ to: "/feed" });
  };

  const sendReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return toast.error(error.message);
    toast.success("Link de redefinição enviado");
    setForgot(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Não foi possível entrar com Google");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center"><MelanLogo size="lg" /></div>

      {verifyEmail ? (
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-semibold">Verifique seu email</h1>
          <p className="text-sm text-muted-foreground">Digite o código de 6 dígitos enviado para {verifyEmail}, ou toque no link do email.</p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
            </InputOTP>
          </div>
          <button disabled={busy} onClick={verify} className="h-12 w-full rounded-full bg-melon font-semibold text-primary-foreground disabled:opacity-50">Confirmar</button>
          <button onClick={() => supabase.auth.resend({ type: "signup", email: verifyEmail }).then(() => toast.success("Código reenviado"))} className="text-sm text-muted-foreground underline">Reenviar código</button>
        </div>
      ) : forgot ? (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">Recuperar senha</h1>
          <input className={field} type="email" placeholder="Email" value={form.email} onChange={set("email")} />
          <button onClick={sendReset} className="h-12 w-full rounded-full bg-melon font-semibold text-primary-foreground">Enviar link</button>
          <button onClick={() => setForgot(false)} className="w-full text-sm text-muted-foreground">Voltar</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 rounded-full bg-secondary p-1 text-sm">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} onClick={() => navigate({ to: "/auth", search: { mode: m } })} className={`rounded-full py-2 ${mode === m ? "bg-primary font-semibold" : "text-muted-foreground"}`}>
                {m === "signin" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
          {mode === "signup" && (
            <>
              <label className="flex items-center gap-3 rounded-2xl bg-secondary p-3 text-sm">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary">
                  {avatar ? <img src={URL.createObjectURL(avatar)} alt="" className="h-full w-full object-cover" /> : "🍉"}
                </div>
                <span className="text-muted-foreground">Foto de perfil (opcional)</span>
                <input type="file" accept="image/*" hidden onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} />
              </label>
              <input className={field} placeholder="Nome de exibição" value={form.display_name} onChange={set("display_name")} maxLength={50} />
              <input className={field} placeholder="Nome de utilizador (@)" value={form.username} onChange={set("username")} maxLength={24} />
              <textarea className={`${field} h-20 py-3`} placeholder="Bio" value={form.bio} onChange={set("bio")} maxLength={160} />
            </>
          )}
          <input className={field} type="email" placeholder="Email" value={form.email} onChange={set("email")} autoComplete="email" />
          <input className={field} type="password" placeholder="Palavra-passe" value={form.password} onChange={set("password")} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          <button disabled={busy} onClick={mode === "signup" ? signUp : signIn} className="h-12 w-full rounded-full bg-melon font-semibold text-primary-foreground disabled:opacity-50">
            {mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
          {mode === "signin" && <button onClick={() => setForgot(true)} className="w-full text-sm text-muted-foreground">Esqueci a senha</button>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" /></div>
          <button onClick={google} className="h-12 w-full rounded-full bg-secondary font-medium">Continuar com Google</button>
        </div>
      )}
    </div>
  );
}
