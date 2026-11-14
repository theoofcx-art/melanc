import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar, Verified } from "@/components/melan/Avatar";
import { Sticker, StickerPicker } from "@/components/melan/Stickers";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/direct/$userId")({
  head: () => ({ meta: [{ title: "Conversa — Melan" }, { name: "description", content: "Conversa privada no Direct do Melan." }] }),
  component: Chat,
});

function Chat() {
  const { userId } = Route.useParams();
  const { user } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const other = useQuery({
    queryKey: ["profile-id", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });
  const msgs = useQuery({
    queryKey: ["dm", userId, user?.id],
    enabled: !!user,
    refetchInterval: 4000,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user!.id})`)
        .order("created_at");
      return data ?? [];
    },
  });
  useEffect(() => {
    const ch = supabase.channel(`dm-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => qc.invalidateQueries({ queryKey: ["dm", userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, userId]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs.data?.length]);

  const send = async (sticker?: string) => {
    if (!user || (!text.trim() && !sticker)) return;
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: userId, content: sticker ? "" : text.trim().slice(0, 2000), sticker: sticker ?? null });
    if (error) return toast.error(error.message);
    setText("");
    qc.invalidateQueries({ queryKey: ["dm", userId] });
  };

  if (other.isSuccess && !other.data) return (
    <div className="mx-auto max-w-xl p-6 text-center"><p className="mb-4 text-muted-foreground">Essa conta não existe mais.</p><Link to="/direct" className="rounded-full bg-melon px-5 py-2.5 font-semibold text-primary-foreground">Voltar ao Direct</Link></div>
  );

  return (
    <div className="mx-auto flex h-screen max-w-xl flex-col">
      <header className="flex items-center gap-3 bg-card px-4 py-3">
        <Link to="/direct" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Link>
        <UserAvatar path={other.data?.avatar_url} name={other.data?.display_name} />
        <Link to="/u/$username" params={{ username: other.data?.username ?? "" }} className="font-semibold">{other.data?.display_name} <Verified show={other.data?.is_verified} /></Link>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.data?.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              {m.sticker ? <Sticker value={m.sticker} saveable={!mine} /> : <p className={`max-w-[75%] rounded-3xl px-4 py-2 text-sm ${mine ? "bg-primary" : "bg-card"}`}>{m.content}</p>}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <StickerPicker onPick={(s) => send(s)} />
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Mensagem…" className="h-11 flex-1 rounded-full bg-card px-4 text-sm outline-none" />
        <button aria-label="Enviar" onClick={() => send()} className="flex h-11 w-11 items-center justify-center rounded-full bg-melon"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
