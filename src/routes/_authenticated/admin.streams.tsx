import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { checkIsAdmin, listAllStreams, createStream, deleteStream } from "@/lib/streams.functions";
import { toast } from "sonner";
import { Trash2, Plus, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/streams")({
  component: AdminStreamsPage,
});

function AdminStreamsPage() {
  const router = useRouter();
  const checkAdminFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listAllStreams);
  const createFn = useServerFn(createStream);
  const deleteFn = useServerFn(deleteStream);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkAdminFn() });
  const isAdmin = adminQ.data?.isAdmin ?? false;

  const streamsQ = useQuery({
    queryKey: ["streams", "all"],
    queryFn: () => listFn(),
    enabled: isAdmin,
  });

  const createM = useMutation({
    mutationFn: (vars: { fixture_id: number; label: string; stream_type: "hls" | "iframe" | "mp4"; url: string; is_active: boolean }) =>
      createFn({ data: vars }),
    onSuccess: () => { toast.success("Stream added"); streamsQ.refetch(); router.invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Stream removed"); streamsQ.refetch(); router.invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [fixtureId, setFixtureId] = useState("");
  const [label, setLabel] = useState("Main");
  const [type, setType] = useState<"hls" | "iframe" | "mp4">("hls");
  const [url, setUrl] = useState("");

  if (adminQ.isLoading) {
    return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  }
  if (!isAdmin) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-display text-2xl">Admin access required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have the <code className="bg-secondary px-1 rounded">admin</code> role.
            Add a row to the <code className="bg-secondary px-1 rounded">user_roles</code> table in Cloud:
            user_id = your auth user id, role = <code className="bg-secondary px-1 rounded">admin</code>. Then refresh.
          </p>
        </div>
      </Shell>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fid = Number(fixtureId);
    if (!Number.isFinite(fid) || fid <= 0) { toast.error("Fixture ID must be a positive number"); return; }
    createM.mutate({ fixture_id: fid, label, stream_type: type, url, is_active: true });
    setUrl(""); setFixtureId("");
  }

  return (
    <Shell>
      <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-xl">Add stream</h2>
        <p className="mt-1 text-xs text-muted-foreground">Find the fixture ID on the match page URL: /match/&lt;id&gt;</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[140px_1fr_140px]">
          <input className="input-base bg-background" placeholder="Fixture ID" value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} required />
          <input className="input-base bg-background" placeholder="Label (e.g. Main, Backup, EN)" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <select className="input-base bg-background" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="hls">HLS (.m3u8)</option>
            <option value="iframe">Iframe embed</option>
            <option value="mp4">MP4</option>
          </select>
        </div>
        <input className="input-base bg-background mt-3 w-full" placeholder="https://example.com/stream.m3u8 or https://embed-host/.../iframe" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <button type="submit" disabled={createM.isPending} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {createM.isPending ? "Adding…" : "Add stream"}
        </button>
      </form>

      <div className="mt-8">
        <h2 className="font-display text-xl mb-3">All streams ({streamsQ.data?.length ?? 0})</h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
          {streamsQ.data?.map((s) => (
            <div key={s.id} className="grid grid-cols-[100px_1fr_80px_1fr_auto] items-center gap-3 px-4 py-3 text-sm">
              <span className="font-display text-primary">#{s.fixture_id}</span>
              <span className="truncate">{s.label}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.stream_type}</span>
              <span className="truncate text-xs text-muted-foreground">{s.url}</span>
              <button onClick={() => deleteM.mutate(s.id)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary text-muted-foreground hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(!streamsQ.data || streamsQ.data.length === 0) && (
            <div className="p-8 text-center text-sm text-muted-foreground">No streams yet. Add one above.</div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        <h1 className="font-display text-4xl sm:text-5xl">Stream Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage live stream links for fixtures.</p>
        <div className="mt-8">{children}</div>
      </div>
      <Footer />
    </div>
  );
}
