import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyBearer, GATEWAY } from "@/lib/wyp.server";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).min(1).max(60),
});

const SYSTEM = `Você é a Wyp, a assistente de IA da rede social Melan 🍉🎄. Responda em português do Brasil (ou no idioma do usuário), de forma simpática, clara e direta. Ajude com dúvidas gerais, estudos (explique passo a passo), conversas e pesquisas. Use a busca na web para informações atuais e cite os links quando usar. Formate com markdown leve.`;

export const Route = createFileRoute("/api/wyp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await verifyBearer(request);
        if (!uid) return new Response("Unauthorized", { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const res = await fetch(`${GATEWAY}/v1/chat/completions`, {
          method: "POST",
          signal: request.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            stream: true,
            tools: [{ type: "google_search" }],
            messages: [{ role: "system", content: SYSTEM }, ...parsed.data.messages],
          }),
        });
        if (!res.ok || !res.body) {
          const msg = res.status === 429 ? "Muitas mensagens agora, tente em instantes." : res.status === 402 ? "Créditos de IA esgotados." : "A Wyp não conseguiu responder.";
          return Response.json({ error: msg }, { status: res.status });
        }
        return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
      },
    },
  },
});
