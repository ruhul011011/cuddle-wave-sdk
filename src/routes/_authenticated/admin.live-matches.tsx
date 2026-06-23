import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAllStreams,
  bulkCreateStreams,
  deleteStream,
  getStreamsByFixture,
  listAdminMatchGroups,
  deleteFixtureStreams,
} from "@/lib/streams.functions";
import { setMatchAccess } from "@/lib/payments.functions";
import { listPopularLeagues, getFixturesByLeagueDate, getFixturesByIds } from "@/lib/api-football.functions";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Copy, X, Pencil, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/live-matches")({
  component: AdminLiveMatchesPage,
});

type LinkMode = "free" | "premium" | "ads";
type AccessType = "free" | "premium" | "ads" | "mix";

type LinkRow = {
  url: string;
  quality: "HD" | "SD" | "4K" | "FHD";
  stream_type: "hls" | "iframe" | "mp4";
  label: string;
  link_mode: LinkMode;
};
const EMPTY_LINK: LinkRow = { url: "", quality: "HD", stream_type: "hls", label: "Main", link_mode: "free" };
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const ACCESS_LABEL: Record<AccessType, string> = {
  free: "Free",
  premium: "Premium (paywall only)",
  ads: "With ads",
  mix: "Mix (per-link gating)",
};

function defaultLinkModeFor(access: AccessType): LinkMode {
  if (access === "premium") return "premium";
  if (access === "ads") return "ads";
  return "free"; // free or mix → start as free
}

function AdminLiveMatchesPage() {
  const router = useRouter();
  const listFn = useServerFn(listAllStreams);
  const bulkCreateFn = useServerFn(bulkCreateStreams);
  const deleteFn = useServerFn(deleteStream);
  const leaguesFn = useServerFn(listPopularLeagues);
  const fixturesFn = useServerFn(getFixturesByLeagueDate);
  const getStreamsForFixtureFn = useServerFn(getStreamsByFixture);
  const listGroupsFn = useServerFn(listAdminMatchGroups);
  const deleteFixtureFn = useServerFn(deleteFixtureStreams);
  const fixturesByIdsFn = useServerFn(getFixturesByIds);

  const setAccessFn = useServerFn(setMatchAccess);

  const leaguesQ = useQuery({ queryKey: ["leagues", "popular"], queryFn: () => leaguesFn() });
  const streamsQ = useQuery({ queryKey: ["streams", "all"], queryFn: () => listFn() });
  const groupsQ = useQuery({ queryKey: ["admin-match-groups"], queryFn: () => listGroupsFn() });

  const groupIds = useMemo(() => (groupsQ.data ?? []).map((g) => g.fixture_id), [groupsQ.data]);
  const fixturesMetaQ = useQuery({
    queryKey: ["admin-fixture-meta", groupIds.join(",")],
    queryFn: () => fixturesByIdsFn({ data: { ids: groupIds } }),
    enabled: groupIds.length > 0,
  });
  const fixtureMetaMap = useMemo(() => {
    const m = new Map<number, NonNullable<typeof fixturesMetaQ.data>[number]>();
    for (const f of fixturesMetaQ.data ?? []) m.set(Number(f.id), f);
    return m;
  }, [fixturesMetaQ.data]);

  const [leagueId, setLeagueId] = useState<number | "">("");
  const [date, setDate] = useState(todayISO());
  const [fixtureId, setFixtureId] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([{ ...EMPTY_LINK }]);
  const [access, setAccess] = useState<AccessType>("free");
  const [priceUsd, setPriceUsd] = useState<string>("4.99");
  const [availability, setAvailability] = useState<"now" | "pre10">("now");
  const [copyOpen, setCopyOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<null | {
    id: number;
    label: string;
    kickoff?: string;
    league?: string;
  }>(null);

  const fixturesQ = useQuery({
    queryKey: ["fixtures-admin", leagueId, date],
    queryFn: () => fixturesFn({ data: { leagueId: Number(leagueId), date } }),
    enabled: typeof leagueId === "number" && !editingFixture,
  });

  const selectedFixture = useMemo(() => {
    if (editingFixture) {
      return {
        id: String(editingFixture.id),
        kickoff: editingFixture.kickoff ?? "",
        league: editingFixture.league ?? "",
        leagueLogo: "",
        homeTeam: "",
        awayTeam: "",
      };
    }
    return fixturesQ.data?.find((f) => f.id === fixtureId);
  }, [editingFixture, fixturesQ.data, fixtureId]);

  function resetForm() {
    setLinks([{ ...EMPTY_LINK }]);
    setFixtureId("");
    setAccess("free");
    setPriceUsd("4.99");
    setAvailability("now");
    setEditingFixture(null);
    setLeagueId("");
  }

  // When access type changes, sync each link's link_mode if the access type
  // forces it (premium / ads / free). For 'mix' we leave the per-row choice.
  function changeAccess(next: AccessType) {
    setAccess(next);
    if (next !== "mix") {
      const mode = defaultLinkModeFor(next);
      setLinks((arr) => arr.map((l) => ({ ...l, link_mode: mode })));
    }
  }

  const bulkM = useMutation({
    mutationFn: async (vars: { fixture_id: number; streams: LinkRow[] }) => {
      let available_from: string | null = null;
      if (availability === "pre10" && selectedFixture?.kickoff) {
        available_from = new Date(new Date(selectedFixture.kickoff).getTime() - 10 * 60 * 1000).toISOString();
      }
      await setAccessFn({
        data: {
          fixture_id: vars.fixture_id,
          access,
          price_cents: access === "premium" ? Math.round(parseFloat(priceUsd || "0") * 100) : 0,
          currency: "usd",
          available_from,
        },
      });
      // When editing, wipe the existing stream rows before re-inserting.
      if (editingFixture) {
        await deleteFixtureFn({ data: { fixtureId: vars.fixture_id } });
        // Re-apply access since deleteFixtureFn also clears match_access.
        await setAccessFn({
          data: {
            fixture_id: vars.fixture_id,
            access,
            price_cents: access === "premium" ? Math.round(parseFloat(priceUsd || "0") * 100) : 0,
            currency: "usd",
            available_from,
          },
        });
      }
      return bulkCreateFn({ data: vars });
    },
    onSuccess: () => {
      toast.success(editingFixture ? "Match updated" : "Match saved");
      resetForm();
      streamsQ.refetch();
      groupsQ.refetch();
      router.invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); streamsQ.refetch(); groupsQ.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const deleteFixtureM = useMutation({
    mutationFn: (fixtureId: number) => deleteFixtureFn({ data: { fixtureId } }),
    onSuccess: () => {
      toast.success("Match removed");
      streamsQ.refetch();
      groupsQ.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function startEdit(fixtureId: number) {
    try {
      const meta = fixtureMetaMap.get(fixtureId);
      const group = groupsQ.data?.find((g) => g.fixture_id === fixtureId);
      const rows = await getStreamsForFixtureFn({ data: { fixtureId } });
      setEditingFixture({
        id: fixtureId,
        label: meta ? `${meta.homeTeam} vs ${meta.awayTeam}` : `Fixture #${fixtureId}`,
        kickoff: meta?.kickoff,
        league: meta?.league,
      });
      setFixtureId(String(fixtureId));
      setLinks(
        rows.length
          ? rows.map((r) => ({
              url: r.url,
              quality: (r.quality as LinkRow["quality"]) ?? "HD",
              stream_type: r.stream_type,
              label: r.label || "Main",
              link_mode: (r.link_mode as LinkMode) ?? "free",
            }))
          : [{ ...EMPTY_LINK }],
      );
      if (group) {
        setAccess(group.access);
        if (group.access === "premium") setPriceUsd(((group.price_cents || 0) / 100).toFixed(2));
        setAvailability(group.available_from ? "pre10" : "now");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load match");
    }
  }

  useEffect(() => {
    if (!editingFixture) return;
    // keep fixtureId synced with editing state
    setFixtureId(String(editingFixture.id));
  }, [editingFixture]);

  function updateLink(i: number, patch: Partial<LinkRow>) {
    setLinks((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLink() {
    setLinks((arr) => [...arr, { ...EMPTY_LINK, link_mode: defaultLinkModeFor(access) }]);
  }
  async function copyFromFixture(srcFixtureId: number) {
    try {
      const rows = await getStreamsForFixtureFn({ data: { fixtureId: srcFixtureId } });
      if (!rows.length) { toast.error("That match has no streams to copy"); return; }
      const newRows: LinkRow[] = rows.map((r) => ({
        url: r.url,
        quality: (r.quality as LinkRow["quality"]) ?? "HD",
        stream_type: r.stream_type,
        label: r.label || "Main",
        link_mode: (r.link_mode as LinkMode) ?? defaultLinkModeFor(access),
      }));
      setLinks(newRows);
      setCopyOpen(false);
      toast.success(`Copied ${newRows.length} link${newRows.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fid = Number(fixtureId);
    if (!Number.isFinite(fid) || fid <= 0) { toast.error("Pick a match"); return; }
    const valid = links.filter((l) => l.url.trim());
    if (!valid.length) { toast.error("Add at least one link"); return; }
    if (access === "premium") {
      const cents = Math.round(parseFloat(priceUsd || "0") * 100);
      if (!cents || cents < 50) { toast.error("Paid price must be at least $0.50"); return; }
    }
    bulkM.mutate({ fixture_id: fid, streams: valid });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Live Matches</h1>

      <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">
            {editingFixture ? `Edit Match — ${editingFixture.label}` : "Add Live Match"}
          </h2>
          {editingFixture && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-secondary/60"
            >
              <X className="h-3 w-3" /> Cancel edit
            </button>
          )}
        </div>
        {!editingFixture && (
          <>
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
              {selectedFixture && !editingFixture && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
                  {"leagueLogo" in selectedFixture && selectedFixture.leagueLogo && (
                    <img src={selectedFixture.leagueLogo} alt="" className="h-6 w-6" />
                  )}
                  <span className="text-muted-foreground">{selectedFixture.league}</span>
                  <span className="ml-auto font-display text-primary">Fixture ID: {selectedFixture.id}</span>
                </div>
              )}
            </Field>
          </>
        )}
        {editingFixture && (
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
            <span className="text-muted-foreground">{editingFixture.league ?? ""}</span>
            <span className="ml-auto font-display text-primary">Fixture ID: {editingFixture.id}</span>
          </div>
        )}

        <Field label="Access Type">
          <select
            className="input-base bg-background w-full"
            value={access}
            onChange={(e) => changeAccess(e.target.value as AccessType)}
          >
            <option value="free">{ACCESS_LABEL.free}</option>
            <option value="premium">{ACCESS_LABEL.premium}</option>
            <option value="ads">{ACCESS_LABEL.ads}</option>
            <option value="mix">{ACCESS_LABEL.mix}</option>
          </select>
        </Field>

        {access === "premium" && (
          <Field label="Price (USD)">
            <input
              className="input-base bg-background w-full sm:w-40"
              type="number"
              min="0.50"
              step="0.01"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
            />
          </Field>
        )}

        <Field label="Availability">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAvailability("now")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                availability === "now"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/70"
              }`}
            >
              Live now
            </button>
            <button
              type="button"
              onClick={() => setAvailability("pre10")}
              disabled={!selectedFixture?.kickoff}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                availability === "pre10"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/70"
              }`}
            >
              Go live 10 min before kickoff
            </button>
          </div>
          {availability === "pre10" && selectedFixture?.kickoff && (
            <p className="mt-2 text-xs text-muted-foreground">
              Stream unlocks at{" "}
              {new Date(new Date(selectedFixture.kickoff).getTime() - 10 * 60 * 1000).toLocaleString(
                [],
                { dateStyle: "medium", timeStyle: "short" },
              )}
              .
            </p>
          )}
        </Field>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setCopyOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
          >
            <Copy className="h-4 w-4" /> Copy Links From Another Match
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-lg">Stream links</h3>
          </div>
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px_auto] gap-2 items-center">
                <input className="input-base bg-background" placeholder="Stream Link" value={l.url} onChange={(e) => updateLink(i, { url: e.target.value })} />
                <select className="input-base bg-background" value={l.quality} onChange={(e) => updateLink(i, { quality: e.target.value as LinkRow["quality"] })}>
                  <option>HD</option><option>FHD</option><option>4K</option><option>SD</option>
                </select>
                <select
                  className="input-base bg-background"
                  value={l.link_mode}
                  disabled={access !== "mix"}
                  onChange={(e) => updateLink(i, { link_mode: e.target.value as LinkMode })}
                  title={access !== "mix" ? "Set Access Type to Mix to choose per-link" : "Link mode"}
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium (locked)</option>
                  <option value="ads">With ads</option>
                </select>
                <button type="button" onClick={() => setLinks((a) => a.filter((_, idx) => idx !== i))} disabled={links.length === 1}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border/60 text-red-400 hover:bg-red-500/10 disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLink}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Stream
          </button>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={bulkM.isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {bulkM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {bulkM.isPending ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Live Matches ({groupsQ.data?.length ?? 0})</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <tr>
                <th className="text-left font-medium px-4 py-3">Sport Type</th>
                <th className="text-left font-medium px-4 py-3">Fixture ID</th>
                <th className="text-left font-medium px-4 py-3">League/Series</th>
                <th className="text-left font-medium px-4 py-3">Team (Home)</th>
                <th className="text-left font-medium px-4 py-3">Team (Away)</th>
                <th className="text-left font-medium px-4 py-3">Access Type</th>
                <th className="text-left font-medium px-4 py-3">Free preview</th>
                <th className="text-left font-medium px-4 py-3">Server modes</th>
                <th className="text-left font-medium px-4 py-3">Active</th>
                <th className="text-left font-medium px-4 py-3">Match status</th>
                <th className="text-left font-medium px-4 py-3">Match Date</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(groupsQ.data ?? []).map((g) => {
                const meta = fixtureMetaMap.get(g.fixture_id);
                const kickoff = meta?.kickoff ? new Date(meta.kickoff) : null;
                const status = meta?.status ?? "upcoming";
                const statusLabel =
                  status === "live" ? "Live" : status === "finished" ? "Finished" : "Upcoming";
                const serverModes = [
                  g.premium_count ? `${g.premium_count} premium` : null,
                  g.ads_count ? `${g.ads_count} ads` : null,
                  g.free_count ? `${g.free_count} free` : null,
                ].filter(Boolean).join(" · ") || `${g.link_count} link${g.link_count === 1 ? "" : "s"}`;
                return (
                  <tr key={g.fixture_id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 capitalize">football</td>
                    <td className="px-4 py-3 font-display text-primary">{g.fixture_id}</td>
                    <td className="px-4 py-3">{meta?.league ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {meta?.homeLogo && <img src={meta.homeLogo} alt="" className="h-5 w-5" />}
                        <span className="truncate">{meta?.homeTeam ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {meta?.awayLogo && <img src={meta.awayLogo} alt="" className="h-5 w-5" />}
                        <span className="truncate">{meta?.awayTeam ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{g.access}</td>
                    <td className="px-4 py-3 text-muted-foreground">Off</td>
                    <td className="px-4 py-3 text-muted-foreground">{serverModes}</td>
                    <td className="px-4 py-3">
                      <span className={g.active_count > 0 ? "text-emerald-400" : "text-muted-foreground"}>
                        {g.active_count > 0 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border border-border/60 px-2 py-1 text-xs ${
                        status === "live" ? "text-red-400" : status === "finished" ? "text-muted-foreground" : ""
                      }`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {kickoff
                        ? `${kickoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${kickoff.toLocaleDateString([], { month: "short", day: "numeric" })}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(g.fixture_id)}
                          className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary text-emerald-400"
                          title="Edit match"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this match and all its stream links?")) {
                              deleteFixtureM.mutate(g.fixture_id);
                            }
                          }}
                          className="grid h-8 w-8 place-items-center rounded-md hover:bg-red-500/10 text-red-400"
                          title="Delete match"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!groupsQ.data || !groupsQ.data.length) && (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-sm text-muted-foreground">
                    No live matches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {copyOpen && (
        <CopyFromMatchModal
          streams={streamsQ.data ?? []}
          onPick={copyFromFixture}
          onClose={() => setCopyOpen(false)}
        />
      )}
    </div>
  );
}

function CopyFromMatchModal({
  streams,
  onPick,
  onClose,
}: {
  streams: { fixture_id: number; label: string }[];
  onPick: (fixtureId: number) => void;
  onClose: () => void;
}) {
  const fixtures = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of streams) map.set(s.fixture_id, (map.get(s.fixture_id) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.id - a.id);
  }, [streams]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg">Copy links from</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {fixtures.length === 0 ? (
          <p className="text-sm text-muted-foreground">No previous matches with streams.</p>
        ) : (
          <ul className="max-h-80 overflow-auto divide-y divide-border/60">
            {fixtures.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => onPick(f.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-secondary/60 rounded-md"
                >
                  <span className="font-display text-primary">Fixture #{f.id}</span>
                  <span className="text-xs text-muted-foreground">{f.count} link{f.count === 1 ? "" : "s"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
