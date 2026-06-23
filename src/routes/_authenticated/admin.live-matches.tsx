import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllStreams, bulkCreateStreams, deleteStream } from "@/lib/streams.functions";
import { setMatchAccess } from "@/lib/payments.functions";
import { listPopularLeagues, getFixturesByLeagueDate } from "@/lib/api-football.functions";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/live-matches")({
  component: AdminLiveMatchesPage,
});

type LinkRow = {
  url: string;
  quality: "HD" | "SD" | "4K" | "FHD";
  stream_type: "hls" | "iframe" | "mp4";
  label: string;
};
const EMPTY_LINK: LinkRow = { url: "", quality: "HD", stream_type: "hls", label: "Main" };
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function AdminLiveMatchesPage() {
  const router = useRouter();
  const listFn = useServerFn(listAllStreams);
  const bulkCreateFn = useServerFn(bulkCreateStreams);
  const deleteFn = useServerFn(deleteStream);
  const leaguesFn = useServerFn(listPopularLeagues);
  const fixturesFn = useServerFn(getFixturesByLeagueDate);

  const setAccessFn = useServerFn(setMatchAccess);

  const leaguesQ = useQuery({ queryKey: ["leagues", "popular"], queryFn: () => leaguesFn() });
  const streamsQ = useQuery({ queryKey: ["streams", "all"], queryFn: () => listFn() });

  const [leagueId, setLeagueId] = useState<number | "">("");
  const [date, setDate] = useState(todayISO());
  const [fixtureId, setFixtureId] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([{ ...EMPTY_LINK }]);
  const [access, setAccess] = useState<"free" | "paid">("free");
  const [priceUsd, setPriceUsd] = useState<string>("4.99");
  const [availability, setAvailability] = useState<"now" | "pre10">("now");

  const fixturesQ = useQuery({
    queryKey: ["fixtures-admin", leagueId, date],
    queryFn: () => fixturesFn({ data: { leagueId: Number(leagueId), date } }),
    enabled: typeof leagueId === "number",
  });

  const selectedFixture = useMemo(
    () => fixturesQ.data?.find((f) => f.id === fixtureId),
    [fixturesQ.data, fixtureId],
  );

  const bulkM = useMutation({
    mutationFn: async (vars: { fixture_id: number; streams: LinkRow[] }) => {
      // Compute scheduled go-live time from selected fixture kickoff.
      let available_from: string | null = null;
      if (availability === "pre10" && selectedFixture?.kickoff) {
        available_from = new Date(new Date(selectedFixture.kickoff).getTime() - 10 * 60 * 1000).toISOString();
      }
      // Save access tier first so paid gating is enforced for new streams.
      await setAccessFn({
        data: {
          fixture_id: vars.fixture_id,
          access,
          price_cents: access === "paid" ? Math.round(parseFloat(priceUsd || "0") * 100) : 0,
          currency: "usd",
          available_from,
        },
      });
      return bulkCreateFn({ data: vars });
    },
    onSuccess: () => {
      toast.success("Match saved");
      setLinks([{ ...EMPTY_LINK }]); setFixtureId("");
      setAccess("free"); setPriceUsd("4.99"); setAvailability("now");
      streamsQ.refetch(); router.invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); streamsQ.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function updateLink(i: number, patch: Partial<LinkRow>) {
    setLinks((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fid = Number(fixtureId);
    if (!Number.isFinite(fid) || fid <= 0) { toast.error("Pick a match"); return; }
    const valid = links.filter((l) => l.url.trim());
    if (!valid.length) { toast.error("Add at least one link"); return; }
    if (access === "paid") {
      const cents = Math.round(parseFloat(priceUsd || "0") * 100);
      if (!cents || cents < 50) { toast.error("Paid price must be at least $0.50"); return; }
    }
    bulkM.mutate({ fixture_id: fid, streams: valid });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Live Matches</h1>

      <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
        <h2 className="font-display text-xl">Add Live Match</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="League">
            <select className="input-base bg-background w-full" value={leagueId}
              onChange={(e) => { setLeagueId(e.target.value ? Number(e.target.value) : ""); setFixtureId(""); }} required>
              <option value="">Select league…</option>
              {leaguesQ.data?.map((l) => (
                <option key={l.id} value={l.id}>{l.name}{l.country ? ` — ${l.country}` : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className="input-base bg-background w-full" value={date}
              onChange={(e) => { setDate(e.target.value); setFixtureId(""); }} required />
          </Field>
        </div>
        <Field label="Match">
          <select className="input-base bg-background w-full" value={fixtureId}
            onChange={(e) => setFixtureId(e.target.value)} disabled={!leagueId || fixturesQ.isLoading} required>
            <option value="">
              {!leagueId ? "Pick a league first" : fixturesQ.isLoading ? "Loading…" : !fixturesQ.data?.length ? "No matches" : "Select match…"}
            </option>
            {fixturesQ.data?.map((f) => {
              const t = f.kickoff ? new Date(f.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
              return <option key={f.id} value={f.id}>{t} — {f.homeTeam} vs {f.awayTeam}</option>;
            })}
          </select>
          {selectedFixture && (
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
              {selectedFixture.leagueLogo && <img src={selectedFixture.leagueLogo} alt="" className="h-6 w-6" />}
              <span className="text-muted-foreground">{selectedFixture.league}</span>
              <span className="ml-auto font-display text-primary">Fixture ID: {selectedFixture.id}</span>
            </div>
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Access">
            <select className="input-base bg-background w-full" value={access}
              onChange={(e) => setAccess(e.target.value as "free" | "paid")}>
              <option value="free">Free (sign-in only)</option>
              <option value="paid">Paid (Stripe Checkout)</option>
            </select>
          </Field>
          <Field label="Price (USD)">
            <input
              type="number" min="0.50" step="0.01"
              className="input-base bg-background w-full disabled:opacity-50"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              disabled={access !== "paid"}
              placeholder="4.99"
            />
          </Field>
        </div>


        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-lg">Stream links</h3>
            <button type="button" onClick={() => setLinks((a) => [...a, { ...EMPTY_LINK }])}
              className="inline-flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-2 text-xs font-semibold hover:bg-primary/20">
              <Plus className="h-3.5 w-3.5" /> Add Stream
            </button>
          </div>
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_140px_auto] gap-2">
                <input className="input-base bg-background" placeholder="Stream URL" value={l.url} onChange={(e) => updateLink(i, { url: e.target.value })} />
                <select className="input-base bg-background" value={l.quality} onChange={(e) => updateLink(i, { quality: e.target.value as any })}>
                  <option>HD</option><option>FHD</option><option>4K</option><option>SD</option>
                </select>
                <select className="input-base bg-background" value={l.stream_type} onChange={(e) => updateLink(i, { stream_type: e.target.value as any })}>
                  <option value="hls">HLS</option><option value="iframe">Iframe</option><option value="mp4">MP4</option>
                </select>
                <input className="input-base bg-background" placeholder="Label" value={l.label} onChange={(e) => updateLink(i, { label: e.target.value })} />
                <button type="button" onClick={() => setLinks((a) => a.filter((_, idx) => idx !== i))} disabled={links.length === 1}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border/60 text-red-400 hover:bg-red-500/10 disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={bulkM.isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {bulkM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {bulkM.isPending ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="font-display text-xl mb-3">All streams ({streamsQ.data?.length ?? 0})</h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
          {streamsQ.data?.map((s) => (
            <div key={s.id} className="grid grid-cols-[90px_1fr_60px_80px_1fr_auto] items-center gap-3 px-4 py-3 text-sm">
              <span className="font-display text-primary">#{s.fixture_id}</span>
              <span className="truncate">{s.label}</span>
              <span className="text-xs uppercase tracking-wider rounded bg-secondary px-2 py-0.5 text-center">{s.quality}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.stream_type}</span>
              <span className="truncate text-xs text-muted-foreground">{s.url}</span>
              <button onClick={() => deleteM.mutate(s.id)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary text-muted-foreground hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(!streamsQ.data || !streamsQ.data.length) && (
            <div className="p-8 text-center text-sm text-muted-foreground">No streams yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
