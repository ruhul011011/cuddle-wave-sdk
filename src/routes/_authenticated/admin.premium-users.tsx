import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Crown, ShieldOff, Loader2 } from "lucide-react";
import { listAuthUsers } from "@/lib/admin.functions";
import { listSubscriptions, grantPremium, revokePremium } from "@/lib/premium-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/premium-users")({
  component: PremiumUsersPage,
});

function PremiumUsersPage() {
  const usersFn = useServerFn(listAuthUsers);
  const subsFn = useServerFn(listSubscriptions);
  const grantFn = useServerFn(grantPremium);
  const revokeFn = useServerFn(revokePremium);

  const usersQ = useQuery({ queryKey: ["admin", "users"], queryFn: () => usersFn(), retry: false });
  const subsQ = useQuery({ queryKey: ["admin", "subs"], queryFn: () => subsFn(), retry: false });

  const [selected, setSelected] = useState<string>("");
  const [months, setMonths] = useState<number>(1);
  const [filter, setFilter] = useState("");

  const grantM = useMutation({
    mutationFn: (v: { user_id: string; months: number }) => grantFn({ data: v }),
    onSuccess: () => { toast.success("Premium granted"); subsQ.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const revokeM = useMutation({
    mutationFn: (user_id: string) => revokeFn({ data: { user_id } }),
    onSuccess: () => { toast.success("Premium revoked"); subsQ.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const users = (usersQ.data ?? []).filter((u: any) =>
    !filter || (u.email ?? "").toLowerCase().includes(filter.toLowerCase()),
  );
  const subsByUser = new Map((subsQ.data ?? []).map((s) => [s.user_id, s]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl flex items-center gap-2"><Crown className="h-7 w-7 text-primary" /> Premium Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Grant any user free access to premium matches for a chosen number of months.</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <h2 className="font-semibold">Grant premium access</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
          <select
            className="input-base bg-background"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select user…</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.email ?? u.id}</option>
            ))}
          </select>
          <select
            className="input-base bg-background"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            {[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}
          </select>
          <button
            disabled={!selected || grantM.isPending}
            onClick={() => grantM.mutate({ user_id: selected, months })}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
          >
            {grantM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Grant premium
          </button>
        </div>
        <input
          className="input-base bg-background"
          placeholder="Filter users by email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60 font-semibold">Active & past subscriptions ({subsQ.data?.length ?? 0})</div>
        {subsQ.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : subsQ.isError ? (
          <div className="p-8 text-center text-sm text-destructive">{subsQ.error instanceof Error ? subsQ.error.message : "Failed"}</div>
        ) : !subsQ.data?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No subscriptions yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Plan</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Expires</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {subsQ.data.map((s) => {
                const active = s.status === "active" && (!s.current_period_end || new Date(s.current_period_end) > new Date());
                return (
                  <tr key={s.user_id}>
                    <td className="p-3">{s.email ?? "—"}</td>
                    <td className="p-3">
                      <span className={`text-xs rounded px-2 py-0.5 ${active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {s.plan}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{s.status}</td>
                    <td className="p-3 text-muted-foreground">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}</td>
                    <td className="p-3 text-right">
                      {active && (
                        <button
                          onClick={() => revokeM.mutate(s.user_id)}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold border border-border/60 hover:bg-secondary"
                        >
                          <ShieldOff className="h-3.5 w-3.5" /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
