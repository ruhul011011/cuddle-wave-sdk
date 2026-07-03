import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArticleBySlug } from "@/lib/articles.functions";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const qo = (slug: string) => queryOptions({
  queryKey: ["article", slug],
  queryFn: () => getArticleBySlug({ data: { slug } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(qo(params.slug));
    if (!res.article) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const a: any = loaderData?.article;
    if (!a) return { meta: [{ title: "Article — Yalla Football Live" }, { name: "robots", content: "noindex" }] };
    const title = a.seo_title || `${a.title} — Yalla Football Live`;
    const desc = a.seo_description || a.excerpt || `${a.title} — read the full story.`;
    const url = `/article/${a.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: a.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(a.cover_image ? [{ property: "og:image", content: a.cover_image }] : []),
        { name: "twitter:card", content: a.cover_image ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: a.title,
          description: desc,
          image: a.cover_image ? [a.cover_image] : undefined,
          datePublished: a.published_at,
          dateModified: a.updated_at,
          articleSection: a.category,
          mainEntityOfPage: url,
        }),
      }],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Article not found</h1>
        <Link to="/news" className="mt-4 inline-block text-primary hover:underline">Back to news</Link>
      </main>
      <Footer />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="font-display text-2xl font-bold">Something went wrong</h1><p className="mt-2 text-sm text-muted-foreground">{String(error?.message ?? error)}</p></main>
      <Footer />
    </div>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(qo(slug));
  const a: any = data.article!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="text-xs">
          <Link to="/news" className="text-muted-foreground hover:text-primary">← Back to news</Link>
        </div>
        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-primary">{a.category}</div>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{a.title}</h1>
        {a.excerpt && <p className="mt-3 text-lg text-muted-foreground">{a.excerpt}</p>}
        <div className="mt-4 text-xs text-muted-foreground">
          {a.published_at ? new Date(a.published_at).toISOString().slice(0, 10) : ""}
        </div>
        {a.cover_image && (
          <img src={a.cover_image} alt="" className="mt-6 aspect-video w-full rounded-2xl object-cover" />
        )}
        <article className="prose prose-invert mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: a.content_html || "" }} />
        {a.tags?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {a.tags.map((t: string) => <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs">#{t}</span>)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
