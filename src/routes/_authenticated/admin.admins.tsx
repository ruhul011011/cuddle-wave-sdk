import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listAdminUsers,
  grantAdminByEmail,
  revokeAdmin,
} from "@/lib/admin-users.functions";
import { Shield, UserPlus, Trash2, Loader2, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminsPage,
});

function AdminsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminUsers);
  const grantFn = useServerFn(grantAdminByEmail);
  const revokeFn = useServerFn(revokeAdmin);

  const list = useQuery({ queryKey: ["admin-users"], queryFn: () => listFn() });

  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const grantMut = useMutation({
    mutationFn: (input: { email: string }) => grantFn({ data: input }),
    onSuccess: (res) => {
      setNotice({ kind: "ok", msg: `${res.email} is now an admin.` });
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => setNotice({ kind: "err", msg: e.message }),
  });

  const revokeMut = useMutation({
    mutationFn: (userId: string) => revokeFn({ data: { userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: Error) => setNotice({ kind: "err", msg: e.message }),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl">Admin Users</h1>
          <p className="text-sm text-muted-foreground">
            Grant admin role to existing users and revoke access.
          </p>
        </div>
      </header>

      {notice && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
          notice.kind === "ok"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "border-destructive/40 bg-destructive/10 text-destructive"
        }`}>
          {notice.kind === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <span className="flex-1">{notice.msg}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg">Grant admin role</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email) {
              setNotice({ kind: "err", msg: "Email is required." });
              return;
            }
            grantMut.mutate({ email });
          }}
          className="grid gap-3 sm:grid-cols-[1fr_auto]"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="input-base bg-background"
          />
          <button
            type="submit"
            disabled={grantMut.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {grantMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Grant admin
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          The user must have signed in at least once (Google or email) before you can grant them admin.
        </p>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card">
        <div className="px-5 py-4 border-b border-border/60 font-display text-lg">Current admins</div>
        {list.isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : list.error ? (
          <div className="p-6 text-center text-sm text-destructive">{(list.error as Error).message}</div>
        ) : !list.data?.length ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No admin users yet.</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {list.data.map((u) => (
              <li key={u.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
                  {(u.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.email ?? "(no email)"}</div>
                  <div className="text-xs text-muted-foreground">
                    Last sign-in: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "never"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Revoke admin role from ${u.email}?`)) revokeMut.mutate(u.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
