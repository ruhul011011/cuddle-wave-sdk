import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listTopLeagues,
  addTopLeague,
  updateTopLeague,
  deleteTopLeague,
} from "@/lib/admin.functions";
import { listAvailableLeagues, type LeagueOption } from "@/lib/api-football.functions";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/top-leagues")({
  component: TopLeaguesPage,
});

type LeagueRow = {
  id: string;
  league_id: number;
  name: string;
  country: string | null;
  logo: string | null;
  sort_order: number;
};

type FormState = {
  league_id: string;
  name: string;
  country: string;
  logo: string;
  sort_order: string;
};

const emptyForm: FormState = { league_id: "", name: "", country: "", logo: "", sort_order: "" };

function TopLeaguesPage() {
  const listFn = useServerFn(listTopLeagues);
  const addFn = useServerFn(addTopLeague);
  const updateFn = useServerFn(updateTopLeague);
  const delFn = useServerFn(deleteTopLeague);
  const availableFn = useServerFn(listAvailableLeagues);

  const availableQ = useQuery({
    queryKey: ["api-football", "leagues", "all"],
    queryFn: () => availableFn(),
    staleTime: 1000 * 60 * 60,
  });

  const q = useQuery({ queryKey: ["admin", "top-leagues"], queryFn: () => listFn() });
  const rows = (q.data ?? []) as LeagueRow[];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const total = rows.length;
  const paged = useMemo(
    () => rows.slice(page * pageSize, page * pageSize + pageSize),
    [rows, page, pageSize],
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const addM = useMutation({
    mutationFn: (v: any) => addFn({ data: v }),
    onSuccess: () => {
      toast.success("League added");
      q.refetch();
      closeDialog();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const updM = useMutation({
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => {
      toast.success("League updated");
      q.refetch();
      closeDialog();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("League removed");
      q.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const openAdd = () => {
    const nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 1;
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: String(nextSort) });
    setDialogOpen(true);
  };
  const openEdit = (r: LeagueRow) => {
    setEditingId(r.id);
    setForm({
      league_id: String(r.league_id),
      name: r.name,
      country: r.country ?? "",
      logo: r.logo ?? "",
      sort_order: String(r.sort_order),
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const league_id = Number(form.league_id);
    if (!league_id || !form.name) return toast.error("League ID & name required");
    const sort_order = form.sort_order === "" ? 0 : Number(form.sort_order);
    const payload = {
      league_id,
      name: form.name,
      country: form.country || undefined,
      logo: form.logo || undefined,
      sort_order,
    };
    if (editingId) updM.mutate({ id: editingId, ...payload });
    else addM.mutate(payload);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Top Leagues</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add League
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Move</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">League ID</th>
                <th className="px-4 py-3 font-medium">Logo</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paged.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">
                    <GripVertical className="h-4 w-4 cursor-grab" />
                  </td>
                  <td className="px-4 py-3">{r.sort_order}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.league_id}</td>
                  <td className="px-4 py-3">
                    {r.logo ? (
                      <img src={r.logo} alt="" className="h-9 w-9 rounded object-contain" />
                    ) : (
                      <div className="h-9 w-9 rounded bg-muted" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="grid h-8 w-8 place-items-center rounded-md text-emerald-500 hover:bg-emerald-500/10"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${r.name}?`)) delM.mutate(r.id);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-500/10"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!paged.length && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">
                    No leagues added yet. Click "Add League" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-6 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              className="rounded-md border border-border/60 bg-background px-2 py-1"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>{from}–{to} of {total}</div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
          onClick={closeDialog}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">
                {editingId ? "Edit League" : "Add League"}
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Position</span>
                <input
                  type="number"
                  className="input-base w-full bg-background"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">League ID *</span>
                <input
                  type="number"
                  required
                  className="input-base w-full bg-background"
                  value={form.league_id}
                  onChange={(e) => setForm({ ...form, league_id: e.target.value })}
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Name *</span>
              <input
                required
                className="input-base w-full bg-background"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Country</span>
              <input
                className="input-base w-full bg-background"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Logo URL</span>
              <input
                className="input-base w-full bg-background"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                placeholder="https://..."
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg border border-border/60 px-4 py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addM.isPending || updM.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {editingId ? "Save changes" : "Add League"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
