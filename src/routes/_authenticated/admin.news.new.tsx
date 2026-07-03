import { createFileRoute } from "@tanstack/react-router";
import { ArticleEditorForm } from "@/components/editor/ArticleEditorForm";

export const Route = createFileRoute("/_authenticated/admin/news/new")({
  component: () => (
    <div>
      <h1 className="font-display text-2xl font-bold">New article</h1>
      <p className="text-sm text-muted-foreground">Write, format, and publish.</p>
      <div className="mt-6"><ArticleEditorForm /></div>
    </div>
  ),
});
