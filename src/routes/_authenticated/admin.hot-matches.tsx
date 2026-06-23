import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHotMatches, addHotMatch, deleteHotMatch } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/hot-matches")({
  component: HotMatchesPage,
});

function HotMatchesPage() {
  const listFn = useServerFn(listHotMatches);
  const addFn = useServerFn(addHotMatch);
  const delFn = useServerFn(deleteHotMatch);
  const q = useQuery({ queryKey: ["admin", "hot"], queryFn: () => listFn() });
  const addM = useMutation({
    mutationFn: (v: { fixture_id: number; title?: string }) => addFn({ data: v }),
    onSuccess: () => { toast.success("Added"); q.refetch(); setFixtureId(""); setTitle(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); q.refetch(); },
  });
  const [fixtureId, setFixtureId] = useState("");
  const [title, setTitle] = useState("");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Hot Matches</h1>
      <form onSubmit={(e) => { e.preventDefault(); const n = Number(fixtureId); if (!n) return toast.error("Fixture ID required"); addM.mutate({ fixture_id: n, title: title || undefined }); }}
        className="rounded-2xl border border-border/60 bg-card p-5 grid sm:grid-cols-[180px_1fr_auto] gap-3">
        <input className="input-base bg-background" placeholder="Fixture ID" value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} required />
        <input className="input-base bg-background" placeholder="Optional title / label" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Mark Hot
        </button>
      </form>
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
        {q.data?.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="font-display text-primary">#{r.fixture_id}</span>
            <span>{r.title ?? "—"}</span>
            <button onClick={() => delM.mutate(r.id)} className="ml-auto grid h-8 w-8 place-items-center rounded-md hover:bg-secondary text-muted-foreground hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {!q.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">No hot matches yet.</div>}
      </div>
    </div>
  );
}
