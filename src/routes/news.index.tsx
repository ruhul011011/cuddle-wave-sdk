import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublishedArticles } from "@/lib/articles.functions";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const articlesQO = queryOptions({
  queryKey: ["public-articles", "news-page"],
  queryFn: () => listPublishedArticles({ data: { limit: 30 } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/news/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(articlesQO),
  component: NewsIndexPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{String(error?.message ?? error)}</p>
      </main>
      <Footer />
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="font-display text-2xl font-bold">Not found</h1></main>
      <Footer />
    </div>
  ),
});

function NewsIndexPage() {
  const { data } = useSuspenseQuery(articlesQO);
  const items = data.items ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Editorial</div>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Latest football news</h1>
          <p className="mt-2 text-sm text-muted-foreground">Previews, transfers, and match reports.</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-12 text-center text-muted-foreground">
            No news published yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((article: any) => (
              <Link
                key={article.id}
                to="/news/$slug"
                params={{ slug: article.slug }}
                className="group block overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition hover:border-primary/40"
              >
                <div className="aspect-[16/9] overflow-hidden bg-secondary">
                  {article.cover_image ? (
                    <img src={article.cover_image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10" />
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">{article.category}</div>
                  <h2 className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-snug">{article.title}</h2>
                  {article.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>}
                  <div className="mt-3 text-xs text-muted-foreground">
                    {(article.published_at ? new Date(article.published_at) : new Date(article.created_at)).toISOString().slice(0, 10)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}