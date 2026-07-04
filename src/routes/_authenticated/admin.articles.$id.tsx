import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getArticleById } from "@/lib/articles.functions";
import { ArticleEditorForm } from "@/components/editor/ArticleEditorForm";

export const Route = createFileRoute("/_authenticated/admin/articles/$id")({
  component: EditArticleLegacyPath,
});

function EditArticleLegacyPath() {
  const { id } = Route.useParams();
  const get = useServerFn(getArticleById);
  const { data, isLoading } = useQuery({ queryKey: ["admin-article", id], queryFn: () => get({ data: { id } }) });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!data?.article) return <div className="text-sm text-muted-foreground">Article not found.</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Edit article</h1>
      <p className="text-sm text-muted-foreground">Update, save as draft, or publish.</p>
      <div className="mt-6"><ArticleEditorForm initial={data.article as any} /></div>
    </div>
  );
}