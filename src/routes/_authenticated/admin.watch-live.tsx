import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllStreams } from "@/lib/streams.functions";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/watch-live")({
  component: WatchLivePage,
});

function WatchLivePage() {
  const listFn = useServerFn(listAllStreams);
  const statsFn = useServerFn(getAdminStats);
  const q = useQuery({ queryKey: ["streams", "all"], queryFn: () => listFn() });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => statsFn() });
  const byType = (q.data ?? []).reduce((acc: Record<string, number>, s: any) => {
    acc[s.stream_type] = (acc[s.stream_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Watch-live analytics</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Tile label="Total streams" value={q.data?.length ?? 0} />
        <Tile label="HLS / MP4" value={(byType.hls ?? 0) + (byType.mp4 ?? 0)} />
        <Tile label="Iframe embeds" value={byType.iframe ?? 0} />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
        {stats.data?.liveMatches ?? 0} live stream entries currently configured across {stats.data?.hotMatches ?? 0} featured matches.
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-3xl mt-1">{value}</div>
    </div>
  );
}
