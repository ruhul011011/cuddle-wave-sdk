import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotifications, addNotification, deleteNotification } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Trash2, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/notification")({
  component: NotificationPage,
});

function NotificationPage() {
  const listFn = useServerFn(listNotifications);
  const addFn = useServerFn(addNotification);
  const delFn = useServerFn(deleteNotification);
  const q = useQuery({ queryKey: ["admin", "notifs"], queryFn: () => listFn() });
  const addM = useMutation({ mutationFn: (v: any) => addFn({ data: v }), onSuccess: () => { toast.success("Sent"); q.refetch(); setForm({ title: "", body: "", audience: "all" as const, link: "" }); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  const delM = useMutation({ mutationFn: (id: string) => delFn({ data: { id } }), onSuccess: () => q.refetch() });
  const [form, setForm] = useState({ title: "", body: "", audience: "all" as "all" | "premium" | "free", link: "" });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Notifications</h1>
      <form onSubmit={(e) => { e.preventDefault(); if (!form.title || !form.body) return toast.error("Title and body required"); addM.mutate(form); }}
        className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
        <input className="input-base bg-background w-full" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input-base bg-background w-full min-h-[100px]" placeholder="Message body…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <div className="grid sm:grid-cols-[180px_1fr_auto] gap-3">
          <select className="input-base bg-background" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as any })}>
            <option value="all">All users</option>
            <option value="premium">Premium only</option>
            <option value="free">Free only</option>
          </select>
          <input className="input-base bg-background" placeholder="Optional link URL" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Send</button>
        </div>
      </form>
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
        {q.data?.map((r: any) => (
          <div key={r.id} className="flex items-start gap-3 px-4 py-3 text-sm">
            <Bell className="h-4 w-4 mt-1 text-primary" />
            <div className="flex-1">
              <div className="font-semibold">{r.title} <span className="text-xs text-muted-foreground">· {r.audience}</span></div>
              <div className="text-muted-foreground">{r.body}</div>
              {r.link && <a href={r.link} className="text-xs text-primary underline">{r.link}</a>}
              <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <button onClick={() => delM.mutate(r.id)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {!q.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">No notifications sent yet.</div>}
      </div>
    </div>
  );
}
