import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuthUsers, toggleUserAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const listFn = useServerFn(listAuthUsers);
  const toggleFn = useServerFn(toggleUserAdmin);
  const q = useQuery({ queryKey: ["admin", "users"], queryFn: () => listFn() });
  const m = useMutation({
    mutationFn: (v: { user_id: string; make_admin: boolean }) => toggleFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); q.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">All Users ({q.data?.length ?? 0})</h1>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Joined</th>
              <th className="text-left p-3">Last sign-in</th>
              <th className="text-left p-3">Roles</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {q.data?.map((u: any) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <tr key={u.id}>
                  <td className="p-3">{u.email ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3">
                    {u.roles.map((r: string) => (
                      <span key={r} className="text-xs rounded bg-primary/15 text-primary px-2 py-0.5 mr-1">{r}</span>
                    ))}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => m.mutate({ user_id: u.id, make_admin: !isAdmin })}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold border border-border/60 hover:bg-secondary"
                    >
                      {isAdmin ? <><ShieldOff className="h-3.5 w-3.5" /> Remove admin</> : <><ShieldCheck className="h-3.5 w-3.5" /> Make admin</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!q.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">No users.</div>}
      </div>
    </div>
  );
}
