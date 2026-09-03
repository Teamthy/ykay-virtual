import { breadcrumbJsonLd } from "@/lib/seo";

export type Crumb = { name: string; href?: string };

/** Visual breadcrumb + BreadcrumbList JSON-LD (SEO requirement). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = breadcrumbJsonLd(
    items.map((it, i) => ({
      name: it.name,
      item: it.href ?? `https://virtual.ykaycollege.com${i === 0 ? "/" : ""}`,
    })),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-500 mb-6">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((it, i) => {
            const last = i === items.length - 1;
            return (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-ink-300">/</span>}
                {last || !it.href ? (
                  <span
                    className={last ? "text-ink-700 font-semibold" : ""}
                    aria-current={last ? "page" : undefined}
                  >
                    {it.name}
                  </span>
                ) : (
                  <a
                    href={it.href}
                    className="hover:text-brand-blue transition-colors"
                  >
                    {it.name}
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
