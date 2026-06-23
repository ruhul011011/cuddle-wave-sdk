import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trophy, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { groupStandings as defaultGroups, type Group, type GroupRow } from "@/lib/world-cup";

export const Route = createFileRoute("/_authenticated/admin/world-cup")({
  component: AdminWorldCupPage,
});

const KEY = "world_cup_groups";

function blankRow(letter: string, n: number): GroupRow {
  return {
    team: `Team ${letter}${n}`, code: `T${letter}${n}`,
    p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0,
  };
}

function AdminWorldCupPage() {
  const qc = useQueryClient();
  const [groups, setGroups] = useState<Group[]>(defaultGroups);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["site_settings", KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value, updated_at")
        .eq("key", KEY)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data?.value) {
      try {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed)) setGroups(parsed as Group[]);
      } catch { /* ignore */ }
    }
  }, [data]);

  function updateRow(gi: number, ri: number, patch: Partial<GroupRow>) {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, rows: g.rows.map((r) => ({ ...r })) }));
      const row = { ...next[gi].rows[ri], ...patch };
      row.pts = row.w * 3 + row.d;
      next[gi].rows[ri] = row;
      return next;
    });
  }

  function addRow(gi: number) {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, rows: g.rows.map((r) => ({ ...r })) }));
      const letter = next[gi].name.split(" ")[1] ?? "X";
      next[gi].rows.push(blankRow(letter, next[gi].rows.length + 1));
      return next;
    });
  }

  function removeRow(gi: number, ri: number) {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, rows: g.rows.map((r) => ({ ...r })) }));
      next[gi].rows.splice(ri, 1);
      return next;
    });
  }

  function resetToDefault() {
    setGroups(defaultGroups.map((g) => ({ ...g, rows: g.rows.map((r) => ({ ...r })) })));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: KEY, value: JSON.stringify(groups) }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Group standings saved");
    qc.invalidateQueries({ queryKey: ["site_settings", KEY] });
  }

  if (isLoading) {
    return <div className="p-6 text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Trophy className="h-7 w-7 text-primary" /> World Cup Standings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit team names and match results. Points auto-calculate (W×3 + D).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetToDefault} className="rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-secondary">
            Reset to placeholders
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((g, gi) => (
          <div key={g.name} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <input
                className="bg-transparent font-display text-lg focus:outline-none focus:border-b border-primary/60"
                value={g.name}
                onChange={(e) => setGroups((prev) => prev.map((x, i) => i === gi ? { ...x, name: e.target.value } : x))}
              />
              <button onClick={() => addRow(gi)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                <Plus className="h-3.5 w-3.5" /> Add team
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-1 py-1">Code</th>
                    <th className="text-left px-1 py-1">Team</th>
                    <NumTh>P</NumTh><NumTh>W</NumTh><NumTh>D</NumTh><NumTh>L</NumTh><NumTh>GF</NumTh><NumTh>GA</NumTh>
                    <th className="px-1 py-1 text-right">Pts</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, ri) => (
                    <tr key={ri} className="border-t border-border/40">
                      <td className="px-1 py-1.5">
                        <input className="w-14 rounded bg-background border border-border/60 px-1 py-1 text-xs" value={r.code} onChange={(e) => updateRow(gi, ri, { code: e.target.value })} />
                      </td>
                      <td className="px-1 py-1.5">
                        <input className="w-full min-w-[120px] rounded bg-background border border-border/60 px-2 py-1 text-xs" value={r.team} onChange={(e) => updateRow(gi, ri, { team: e.target.value })} />
                      </td>
                      <NumCell value={r.p} onChange={(v) => updateRow(gi, ri, { p: v })} />
                      <NumCell value={r.w} onChange={(v) => updateRow(gi, ri, { w: v })} />
                      <NumCell value={r.d} onChange={(v) => updateRow(gi, ri, { d: v })} />
                      <NumCell value={r.l} onChange={(v) => updateRow(gi, ri, { l: v })} />
                      <NumCell value={r.gf} onChange={(v) => updateRow(gi, ri, { gf: v })} />
                      <NumCell value={r.ga} onChange={(v) => updateRow(gi, ri, { ga: v })} />
                      <td className="px-1 py-1.5 text-right font-bold">{r.pts}</td>
                      <td className="px-1">
                        <button onClick={() => removeRow(gi, ri)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumTh({ children }: { children: React.ReactNode }) {
  return <th className="px-1 py-1 text-center w-10">{children}</th>;
}
function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <td className="px-1 py-1.5 text-center">
      <input
        type="number"
        min={0}
        className="w-12 rounded bg-background border border-border/60 px-1 py-1 text-xs text-center"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </td>
  );
}
