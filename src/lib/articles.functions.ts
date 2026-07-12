import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "blockquote", "pre", "code",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "strong", "em", "b", "i", "u", "s", "sub", "sup", "span",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
      "iframe",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      span: ["class"],
      code: ["class"],
      pre: ["class"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "title"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "player.vimeo.com"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
  });
}

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || `article-${Date.now()}`;
}

const articleInput = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().max(400).optional().nullable(),
  content_html: z.string().max(200_000).default(""),
  cover_image: z.string().trim().max(2000).optional().nullable(),
  category: z.string().trim().max(60).default("News"),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  seo_title: z.string().trim().max(120).optional().nullable(),
  seo_description: z.string().trim().max(300).optional().nullable(),
});

/* ---------- PUBLIC ---------- */

export const listPublishedArticles = createServerFn({ method: "GET" })
  .inputValidator((input?: { limit?: number; category?: string }) =>
    z.object({ limit: z.number().int().min(1).max(50).default(20), category: z.string().max(60).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("articles")
      .select("id, slug, title, excerpt, cover_image, category, tags, published_at, created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) return { items: [] as any[] };
    return { items: rows ?? [] };
  });

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb.from("articles")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return { article: row };
  });

/* ---------- ADMIN ---------- */

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listAllArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("articles")
      .select("id, slug, title, category, status, published_at, updated_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { items: data ?? [] };
  });

export const getArticleById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("articles").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    return { article: row };
  });

export const upsertArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z.object({ id: z.string().uuid().optional() }).and(articleInput).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const slug = (data.slug && data.slug.trim()) || slugify(data.title);
    const isPublishing = data.status === "published";
    const row: any = {
      title: data.title,
      slug,
      excerpt: data.excerpt ?? null,
      content_html: sanitizeArticleHtml(data.content_html ?? ""),
      cover_image: data.cover_image ?? null,
      category: data.category,
      tags: data.tags,
      status: data.status,
      seo_title: data.seo_title ?? null,
      seo_description: data.seo_description ?? null,
      author_id: context.userId,
    };
    try {
      if (data.id) {
        const { data: existing } = await context.supabase.from("articles").select("published_at").eq("id", data.id).maybeSingle();
        if (isPublishing && !existing?.published_at) row.published_at = new Date().toISOString();
        const { data: updated, error } = await context.supabase.from("articles").update(row).eq("id", data.id).select("id, slug").maybeSingle();
        if (error) throw error;
        return { id: updated?.id, slug: updated?.slug };
      } else {
        if (isPublishing) row.published_at = new Date().toISOString();
        const { data: inserted, error } = await context.supabase.from("articles").insert(row).select("id, slug").maybeSingle();
        if (error) throw error;
        if (!inserted?.id) throw new Error("Insert returned no row (RLS may have blocked it).");
        return { id: inserted.id, slug: inserted.slug };
      }
    } catch (err: any) {
      console.error("[upsertArticle] db error", { message: err?.message, code: err?.code, details: err?.details, hint: err?.hint });
      throw new Error(err?.message || err?.details || "Database rejected the article. Check that you're signed in as an admin.");
    }
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("articles").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
