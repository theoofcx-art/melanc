import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/melan/AppShell";

export const Route = createFileRoute("/_authenticated/wyp")({
  head: () => ({ meta: [{ title: "Wyp IA — Melan" }, { name: "description", content: "Converse com a Wyp: dúvidas, estudos, pesquisas na web e geração de imagens." }] }),
  component: Wyp,
});

type Msg = { role: "user" | "assistant"; content: string; image?: string };

async function token() {
  return (await supabase.auth.getSession()).data.session?.access_token ?? "";
}

async function readSSE(res: Response, onData: (json: any, event?: string) => void) {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let ev: string | undefined;
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) ev = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data || data === "[DONE]") continue;
      try { onData(JSON.parse(data), ev); } catch { /* ignore */ }
    }
  }
}

function Wyp() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const patchLast = (fn: (m: Msg) => Msg) => setMsgs((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);

  const send = async () => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setText("");
    const history: Msg[] = [...msgs, { role: "user", content: prompt }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` };
      if (imageMode) {
        const res = await fetch("/api/wyp-image", { method: "POST", headers, body: JSON.stringify({ prompt }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
        await readSSE(res, (j, ev) => {
          const type = ev || j.type;
          if (type === "error" || j.error) throw new Error(j.error?.message ?? "Erro na imagem");
          if (j.b64_json) patchLast((m) => ({ ...m, image: `data:image/png;base64,${j.b64_json}`, content: type?.includes("completed") ? "Aqui está sua imagem 🍉" : "Gerando…" }));
        });
      } else {
        const res = await fetch("/api/wyp", { method: "POST", headers, body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
        await readSSE(res, (j) => {
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) patchLast((m) => ({ ...m, content: m.content + delta }));
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
      patchLast((m) => ({ ...m, content: m.content || "⚠️ Não consegui responder agora." }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-12rem)] flex-col px-4">
        {msgs.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary font-display text-3xl font-bold">W</div>
            <h1 className="font-display text-3xl font-bold">Oi, eu sou a Wyp</h1>
            <p className="max-w-xs text-sm text-muted-foreground">Pergunte qualquer coisa, peça ajuda nos estudos, pesquise algo atual ou ative 🖼️ para gerar imagens.</p>
          </div>
        )}
        <div className="space-y-4 py-2">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <p className="max-w-[80%] rounded-3xl bg-primary px-4 py-2 text-sm">{m.content}</p>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed [&_a]:text-rind">
                  {m.image && <img src={m.image} alt="Imagem gerada" className={`mb-2 w-full rounded-2xl transition ${m.content === "Gerando…" ? "blur-md" : ""}`} />}
                  {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <span className="animate-pulse text-muted-foreground">Wyp está pensando…</span>}
                </div>
              )}
            </div>
          ))}
          <div ref={end} />
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-24 z-30 mx-auto max-w-xl px-3">
        <div className="flex items-center gap-2 rounded-full bg-card p-1.5 shadow-float">
          <button aria-label="Modo imagem" onClick={() => setImageMode((v) => !v)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${imageMode ? "bg-melon text-primary-foreground" : "bg-secondary"}`}><ImageIcon className="h-4 w-4" /></button>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={imageMode ? "Descreva a imagem…" : "Pergunte à Wyp…"} className="h-10 flex-1 bg-transparent px-2 text-sm outline-none" />
          <button aria-label="Enviar" disabled={busy} onClick={send} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </div>
      </div>
    </AppShell>
  );
}
