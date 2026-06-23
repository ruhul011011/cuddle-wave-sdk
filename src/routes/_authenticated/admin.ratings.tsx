import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRatings } from "@/lib/admin.functions";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ratings")({
  component: RatingsPage,
});

function RatingsPage() {
  const listFn = useServerFn(listRatings);
  const q = useQuery({ queryKey: ["admin", "ratings"], queryFn: () => listFn() });
  const avg = q.data?.length ? (q.data.reduce((a: number, r: any) => a + r.stars, 0) / q.data.length).toFixed(2) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Ratings</h1>
        <div className="rounded-2xl border border-border/60 bg-card px-5 py-3 text-sm">
          <span className="text-muted-foreground">Average rating: </span>
          <span className="font-display text-xl text-primary">{avg}</span>
          <span className="text-muted-foreground"> ({q.data?.length ?? 0})</span>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
        {q.data?.map((r: any) => (
          <div key={r.id} className="p-4 text-sm">
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4" fill={i < r.stars ? "currentColor" : "none"} />)}
              <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            {r.comment && <div className="mt-2 text-muted-foreground">{r.comment}</div>}
          </div>
        ))}
        {!q.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">No ratings yet.</div>}
      </div>
    </div>
  );
}
