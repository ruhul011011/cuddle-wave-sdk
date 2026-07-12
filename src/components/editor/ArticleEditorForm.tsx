import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { RichEditor } from "./RichEditor";
import { upsertArticle } from "@/lib/articles.functions";
import { uploadArticleImage } from "@/lib/upload-image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["News", "General", "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1", "Champions League", "World Cup", "Transfers", "Match Report", "Opinion"];

type Article = {
  id?: string;
  title?: string;
  slug?: string | null;
  excerpt?: string | null;
  content_html?: string;
  cover_image?: string | null;
  category?: string;
  tags?: string[];
  status?: "draft" | "published";
  seo_title?: string | null;
  seo_description?: string | null;
};

export function ArticleEditorForm({ initial }: { initial?: Article }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(upsertArticle);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content_html ?? "");
  const [cover, setCover] = useState(initial?.cover_image ?? "");
  const [category, setCategory] = useState(initial?.category ?? "News");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title ?? "");
  const [seoDesc, setSeoDesc] = useState(initial?.seo_description ?? "");
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setCoverUploading(true);
      const url = await uploadArticleImage(file);
      setCover(url);
      toast.success("Cover uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setCoverUploading(false);
    }
  };


  const mut = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const payload = {
        id: initial?.id,
        title: title.trim(),
        slug: (slug ?? "").trim() || undefined,
        excerpt: excerpt || null,
        content_html: content || "",
        cover_image: (cover ?? "").trim() || null,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status,
        seo_title: seoTitle || null,
        seo_description: seoDesc || null,
      };
      if (payload.title.length < 3) throw new Error("Title must be at least 3 characters.");
      if ((payload.content_html?.length ?? 0) > 200_000)
        throw new Error("Article content is too large (max ~200KB). Use image URLs instead of pasting images.");
      if (payload.cover_image && payload.cover_image.length > 600)
        throw new Error("Cover image URL is too long. Use a short hosted URL.");
      return await save({ data: payload as any });
    },
    onSuccess: (res, status) => {
      toast.success(status === "published" ? "Published!" : "Saved as draft");
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      qc.invalidateQueries({ queryKey: ["public-articles"] });
      if (!initial?.id && res?.id) navigate({ to: "/admin/news", replace: true });
    },
    onError: (e: any) => {
      const msg = e?.message || e?.toString?.() || "Failed to save";
      console.error("[ArticleEditorForm] save error:", e);
      toast.error(msg, { duration: 8000 });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Big match preview: Manchester derby returns" className="mt-1 h-11 text-lg" />
        </div>
        <div>
          <Label>Content</Label>
          <div className="mt-1"><RichEditor value={content} onChange={setContent} /></div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publish</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={!title || mut.isPending} onClick={() => mut.mutate("draft")} className="flex-1">
              <Save className="mr-1.5 h-4 w-4" /> {mut.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button type="button" disabled={!title || mut.isPending} onClick={() => mut.mutate("published")} className="flex-1 font-semibold">
              <Send className="mr-1.5 h-4 w-4" /> {mut.isPending ? "Publishing…" : "Publish"}
            </Button>
          </div>
          {initial?.status && (
            <div className="mt-3 text-xs text-muted-foreground">Current: <span className="font-semibold text-foreground">{initial.status}</span></div>
          )}
        </div>

        <Field label="Slug (URL)" hint="Auto from title if empty">
          <Input value={slug ?? ""} onChange={(e) => setSlug(e.target.value)} placeholder="my-article-url" />
        </Field>

        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c} className="bg-background">{c}</option>)}
          </select>
        </Field>

        <Field label="Cover image" hint="Upload or paste URL">
          <div className="flex gap-2">
            <Input value={cover ?? ""} onChange={(e) => setCover(e.target.value)} placeholder="https://…" className="flex-1" />
            <Button type="button" variant="outline" size="sm" disabled={coverUploading} onClick={() => coverFileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> {coverUploading ? "…" : "Upload"}
            </Button>
            <input ref={coverFileRef} type="file" accept="image/*" hidden onChange={onCoverFile} />
          </div>
          {cover && <img src={cover} alt="" className="mt-2 aspect-video w-full rounded-lg object-cover" />}
        </Field>

        <Field label="Excerpt" hint="Short summary shown on listings">
          <Textarea value={excerpt ?? ""} onChange={(e) => setExcerpt(e.target.value)} rows={3} maxLength={400} />
        </Field>

        <Field label="Tags" hint="Comma-separated">
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="haaland, ucl, city" />
        </Field>

        <details className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO</summary>
          <div className="mt-3 space-y-3">
            <Field label="SEO title"><Input value={seoTitle ?? ""} onChange={(e) => setSeoTitle(e.target.value)} maxLength={120} /></Field>
            <Field label="Meta description"><Textarea value={seoDesc ?? ""} onChange={(e) => setSeoDesc(e.target.value)} rows={3} maxLength={300} /></Field>
          </div>
        </details>
      </aside>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="flex items-center justify-between">
        <span>{label}</span>
        {hint && <span className="text-[10px] font-normal text-muted-foreground">{hint}</span>}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
