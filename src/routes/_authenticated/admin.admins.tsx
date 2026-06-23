import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listAdminUsers,
  createAdminUser,
  updateAdminPassword,
  revokeAdmin,
} from "@/lib/admin-users.functions";
import { Shield, UserPlus, KeyRound, Trash2, Loader2, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminsPage,
});

function AdminsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminUsers);
  const createFn = useServerFn(createAdminUser);
  const updatePwFn = useServerFn(updateAdminPassword);
  const revokeFn = useServerFn(revokeAdmin);

  const list = useQuery({ queryKey: ["admin-users"], queryFn: () => listFn() });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const createMut = useMutation({
    mutationFn: (input: { email: string; password: string }) => createFn({ data: input }),
    onSuccess: () => {
      setNotice({ kind: "ok", msg: `Admin ${email} created.` });
      setEmail(""); setPassword("");
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
          <p className="text-sm text-muted-foreground">Create new admins, reset passwords, and revoke access.</p>
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
          <h2 className="font-display text-lg">Create new admin</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email || password.length < 8) {
              setNotice({ kind: "err", msg: "Email required and password must be at least 8 characters." });
              return;
            }
            createMut.mutate({ email, password });
          }}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="input-base bg-background"
          />
          <input
            type="text"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 chars)"
            className="input-base bg-background font-mono"
          />
          <button
            type="submit"
            disabled={createMut.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create admin
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          If the email is already registered, the password is updated and the admin role is granted.
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
              <AdminRow
                key={u.id}
                user={u}
                onReset={(pw) => updatePwFn({ data: { userId: u.id, password: pw } })}
                onRevoke={() => revokeMut.mutate(u.id)}
                onNotice={setNotice}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AdminRow({
  user,
  onReset,
  onRevoke,
  onNotice,
}: {
  user: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null };
  onReset: (pw: string) => Promise<unknown>;
  onRevoke: () => void;
  onNotice: (n: { kind: "ok" | "err"; msg: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (pw.length < 8) {
      onNotice({ kind: "err", msg: "Password must be at least 8 characters." });
      return;
    }
    setBusy(true);
    try {
      await onReset(pw);
      onNotice({ kind: "ok", msg: `Password updated for ${user.email}.` });
      setPw(""); setEditing(false);
    } catch (e) {
      onNotice({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
          {(user.email ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{user.email ?? "(no email)"}</div>
          <div className="text-xs text-muted-foreground">
            Last sign-in: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "never"}
          </div>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs hover:bg-secondary"
        >
          <KeyRound className="h-3.5 w-3.5" /> Reset password
        </button>
        <button
          onClick={() => {
            if (confirm(`Revoke admin role from ${user.email}?`)) onRevoke();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="h-3.5 w-3.5" /> Revoke
        </button>
      </div>
      {editing && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="input-base bg-background font-mono"
          />
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save
          </button>
        </div>
      )}
    </li>
  );
}
