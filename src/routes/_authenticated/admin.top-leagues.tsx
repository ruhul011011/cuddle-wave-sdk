import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTopLeagues, addTopLeague, deleteTopLeague } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/top-leagues")({
  component: TopLeaguesPage,
});

function TopLeaguesPage() {
  const listFn = useServerFn(listTopLeagues);
  const addFn = useServerFn(addTopLeague);
  const delFn = useServerFn(deleteTopLeague);
  const q = useQuery({ queryKey: ["admin", "top-leagues"], queryFn: () => listFn() });
  const addM = useMutation({ mutationFn: (v: any) => addFn({ data: v }), onSuccess: () => { toast.success("Added"); q.refetch(); setForm({ league_id: "", name: "", country: "", logo: "" }); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  const delM = useMutation({ mutationFn: (id: string) => delFn({ data: { id } }), onSuccess: () => q.refetch() });
  const [form, setForm] = useState({ league_id: "", name: "", country: "", logo: "" });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Top Leagues</h1>
      <form onSubmit={(e) => { e.preventDefault(); const id = Number(form.league_id); if (!id || !form.name) return toast.error("League ID & name required"); addM.mutate({ league_id: id, name: form.name, country: form.country || undefined, logo: form.logo || undefined }); }}
        className="rounded-2xl border border-border/60 bg-card p-5 grid sm:grid-cols-[140px_1fr_1fr_1fr_auto] gap-3">
        <input className="input-base bg-background" placeholder="League ID" value={form.league_id} onChange={(e) => setForm({ ...form, league_id: e.target.value })} required />
        <input className="input-base bg-background" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input-base bg-background" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        <input className="input-base bg-background" placeholder="Logo URL" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} />
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add</button>
      </form>
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
        {q.data?.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            {r.logo && <img src={r.logo} className="h-8 w-8" alt="" />}
            <span className="font-medium">{r.name}</span>
            <span className="text-xs text-muted-foreground">{r.country}</span>
            <span className="ml-auto text-xs text-muted-foreground">#{r.league_id}</span>
            <button onClick={() => delM.mutate(r.id)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {!q.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">No leagues added.</div>}
      </div>
    </div>
  );
}
