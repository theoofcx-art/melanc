import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { HardDrive } from "lucide-react";
import { adminRunCleanup, adminStorageReport } from "@/lib/admin.functions";

const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

export function StoragePanel() {
  const report = useServerFn(adminStorageReport);
  const clean = useServerFn(adminRunCleanup);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminStorageReport>> | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => { setBusy(true); try { setData(await report()); } catch (e) { toast.error((e as Error).message); } setBusy(false); };
  const run = async () => {
    if (!confirm("Apagar contas inativas há mais de 14 dias, mídia de posts com mais de 30 dias e arquivos soltos? Não dá para desfazer.")) return;
    setBusy(true);
    try { const r = await clean(); toast.success(`${r.deletedUsers} contas e ${r.deletedFiles} arquivos apagados (${mb(r.freedBytes)})`); await load(); } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  return (
    <details className="rounded-2xl bg-card p-3 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold" onClick={() => !data && load()}><HardDrive className="h-4 w-4" /> Armazenamento</summary>
      {busy && <p className="mt-2 text-muted-foreground">Carregando…</p>}
      {data && (
        <div className="mt-2 space-y-1">
          <p>Total: {data.totalFiles} arquivos · {mb(data.totalBytes)}</p>
          <p>Arquivos soltos: {data.orphanFiles} · {mb(data.orphanBytes)}</p>
          <p>Contas inativas (+14 dias): {data.inactiveUsers}</p>
          <p className="pt-1 text-xs text-muted-foreground">Maiores arquivos:</p>
          {data.biggest.map((f) => <p key={f.path} className="truncate text-xs">{mb(f.size)} · {f.path}</p>)}
        </div>
      )}
      <button disabled={busy} onClick={run} className="mt-3 h-10 w-full rounded-full bg-destructive font-semibold disabled:opacity-50">Limpar agora</button>
    </details>
  );
}
