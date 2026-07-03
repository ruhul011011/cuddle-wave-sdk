import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PlusCircle, Trash2, Pencil } from "lucide-react";
import { listAllArticles, deleteArticle } from "@/lib/articles.functions";

export const Route = createFileRoute("/_authenticated/admin/news/")({
  component: AdminNews,
});

function AdminNews() {
  const list = useServerFn(listAllArticles);
  const del = useServerFn(deleteArticle);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-articles"], queryFn: () => list() });
  const rm = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">News</h1>
          <p className="text-sm text-muted-foreground">All drafts and published posts.</p>
        </div>
        <Link to="/admin/news/new" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <PlusCircle className="h-4 w-4" /> New article
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Updated</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No articles yet.</td></tr>
            )}
            {(data?.items ?? []).map((a: any) => (
              <tr key={a.id} className="hover:bg-white/5">
                <td className="px-4 py-2.5">
                  <Link to="/admin/news/$id" params={{ id: a.id }} className="font-semibold hover:underline">{a.title}</Link>
                  <div className="text-xs text-muted-foreground">/{a.slug}</div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{a.category}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.status === "published" ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground"}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(a.updated_at).toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link to="/admin/news/$id" params={{ id: a.id }} className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground" aria-label="Edit"><Pencil className="h-4 w-4" /></Link>
                  <button
                    onClick={() => { if (confirm(`Delete "${a.title}"?`)) rm.mutate(a.id); }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-destructive"
                    aria-label="Delete"
                  ><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
