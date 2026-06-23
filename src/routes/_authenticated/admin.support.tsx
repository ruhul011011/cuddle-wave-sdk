import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listClientQueries } from "@/lib/admin.functions";
import { LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: SupportPage,
});

function SupportPage() {
  const listFn = useServerFn(listClientQueries);
  const q = useQuery({ queryKey: ["admin", "client-queries"], queryFn: () => listFn() });
  const open = q.data?.filter((r: any) => r.status === "open").length ?? 0;
  const answered = q.data?.filter((r: any) => r.status === "answered").length ?? 0;
  const closed = q.data?.filter((r: any) => r.status === "closed").length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl flex items-center gap-3"><LifeBuoy className="h-7 w-7 text-primary" /> Support</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Tile label="Open" value={open} tone="text-amber-400" />
        <Tile label="Answered" value={answered} tone="text-emerald-400" />
        <Tile label="Closed" value={closed} tone="text-muted-foreground" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Manage support tickets and customer messages from the{" "}
          <Link to="/admin/client-query" className="text-primary underline">Client Query</Link> page.
        </p>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl mt-1 ${tone}`}>{value}</div>
    </div>
  );
}
