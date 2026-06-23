import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listClientQueries, updateClientQueryStatus } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/client-query")({
  component: ClientQueryPage,
});

function ClientQueryPage() {
  const listFn = useServerFn(listClientQueries);
  const updateFn = useServerFn(updateClientQueryStatus);
  const q = useQuery({ queryKey: ["admin", "client-queries"], queryFn: () => listFn() });
  const m = useMutation({
    mutationFn: (v: { id: string; status: "open" | "answered" | "closed" }) => updateFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); q.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Client Queries</h1>
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
        {q.data?.map((r: any) => (
          <div key={r.id} className="p-4 text-sm space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-semibold">{r.name}</span>
              <a href={`mailto:${r.email}`} className="text-xs text-primary underline">{r.email}</a>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <div className="font-medium">{r.subject}</div>
            <div className="text-muted-foreground whitespace-pre-wrap">{r.message}</div>
            <div className="flex items-center gap-2 pt-2">
              <select className="input-base bg-background text-xs" value={r.status} onChange={(e) => m.mutate({ id: r.id, status: e.target.value as any })}>
                <option value="open">Open</option>
                <option value="answered">Answered</option>
                <option value="closed">Closed</option>
              </select>
              <a href={`mailto:${r.email}?subject=Re: ${encodeURIComponent(r.subject)}`} className="text-xs rounded-md bg-primary/15 text-primary px-3 py-1.5 font-semibold">Reply via email</a>
            </div>
          </div>
        ))}
        {!q.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">No queries received.</div>}
      </div>
    </div>
  );
}
