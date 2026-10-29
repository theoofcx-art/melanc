import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyBearer, GATEWAY } from "@/lib/wyp.server";

export const Route = createFileRoute("/api/wyp-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await verifyBearer(request);
        if (!uid) return new Response("Unauthorized", { status: 401 });
        const parsed = z.object({ prompt: z.string().min(1).max(2000) }).safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const res = await fetch(`${GATEWAY}/v1/images/generations`, {
          method: "POST",
          signal: request.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}` },
          body: JSON.stringify({ model: "openai/gpt-image-2.5-flare", prompt: parsed.data.prompt, stream: true, partial_images: 1 }),
        });
        if (!res.ok || !res.body) {
          return Response.json({ error: res.status === 402 ? "Créditos de IA esgotados." : "Não foi possível gerar a imagem." }, { status: res.status });
        }
        return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
      },
    },
  },
});
