import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArticleBySlug } from "@/lib/articles.functions";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const articleQO = (slug: string) => queryOptions({
  queryKey: ["news-article", slug],
  queryFn: () => getArticleBySlug({ data: { slug } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(articleQO(params.slug));
    if (!res.article) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const article: any = loaderData?.article;
    if (!article) {
      return { meta: [{ title: "News — Yalla Football Live" }, { name: "robots", content: "noindex" }] };
    }

    const title = article.seo_title || `${article.title} — Yalla Football Live`;
    const description = article.seo_description || article.excerpt || `${article.title} — read the full story.`;
    const url = `/news/${article.slug}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: article.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(article.cover_image ? [{ property: "og:image", content: article.cover_image }] : []),
        { name: "twitter:card", content: article.cover_image ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: article.title,
          description,
          image: article.cover_image ? [article.cover_image] : undefined,
          datePublished: article.published_at,
          dateModified: article.updated_at,
          articleSection: article.category,
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
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{String(error?.message ?? error)}</p>
      </main>
      <Footer />
    </div>
  ),
  component: NewsArticlePage,
});

function NewsArticlePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(articleQO(slug));
  const article: any = data.article!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="text-xs">
          <Link to="/news" className="text-muted-foreground hover:text-primary">← Back to news</Link>
        </div>
        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-primary">{article.category}</div>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{article.title}</h1>
        {article.excerpt && <p className="mt-3 text-lg text-muted-foreground">{article.excerpt}</p>}
        <div className="mt-4 text-xs text-muted-foreground">
          {article.published_at ? new Date(article.published_at).toISOString().slice(0, 10) : ""}
        </div>
        {article.cover_image && (
          <img src={article.cover_image} alt="" className="mt-6 aspect-video w-full rounded-2xl object-cover" />
        )}
        <article className="prose prose-invert mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: article.content_html || "" }} />
        {article.tags?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag: string) => <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs">#{tag}</span>)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}