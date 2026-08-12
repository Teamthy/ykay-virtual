import Link from "next/link";
import { API_BASE, apiFetchSSR } from "@/lib/server-api";

export type RelatedContentData = {
  tutors: {
    id: string;
    slug: string;
    display_name: string;
    rating_avg: number;
    rating_count: number;
  }[];
  programmes: { id: string; slug: string; title: string; summary?: string; format: string }[];
  posts: { id: string; slug: string; title: string; excerpt?: string; published_at?: string }[];
};

/**
 * RelatedContent — the internal-linking graph (tutor↔subject↔programme↔blog)
 * per AGENTS.md. Server-rendered; degrades gracefully when the API is down.
 */
export async function RelatedContent({ subjectSlug }: { subjectSlug: string }) {
  let related: RelatedContentData = { tutors: [], programmes: [], posts: [] };
  try {
    const res = await apiFetchSSR<RelatedContentData>(`/subjects/${subjectSlug}/related`);
    related = res.data;
  } catch {
    return null;
  }

  // The related endpoint historically serialized Go structs with raw field
  // names (Profile/Subjects/SubjectSlugs). Normalize to the flat shape.
  const tutors = related.tutors.map((t: any) => ({
    id: t.id ?? t.Profile?.id ?? "",
    slug: t.slug ?? t.Profile?.slug ?? "",
    display_name: t.display_name ?? t.Profile?.display_name ?? "Tutor",
    rating_avg: t.rating_avg ?? t.Profile?.rating_avg ?? 0,
    rating_count: t.rating_count ?? t.Profile?.rating_count ?? 0,
  }));

  const hasAny = tutors.length > 0 || related.programmes.length > 0 || related.posts.length > 0;
  if (!hasAny) return null;

  return (
    <section className="mt-12" aria-label="Related content">
      <h2 className="text-2xl font-extrabold mb-6">Keep exploring</h2>
      <div className="grid md:grid-cols-3 gap-5">
        {tutors.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-3">Top tutors</h3>
            <ul className="space-y-2">
              {tutors.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tutors/${t.slug}`}
                    className="block border rounded-xl px-4 py-3 hover:border-brand-blue hover:shadow-lift transition-all"
                  >
                    <span className="font-semibold text-sm">{t.display_name}</span>
                    <span className="block text-xs text-ink-500">
                      ★ {t.rating_avg.toFixed(1)} · {t.rating_count} reviews
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {related.programmes.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-3">Programmes</h3>
            <ul className="space-y-2">
              {related.programmes.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/programmes/${p.slug}`}
                    className="block border rounded-xl px-4 py-3 hover:border-brand-blue hover:shadow-lift transition-all"
                  >
                    <span className="font-semibold text-sm">{p.title}</span>
                    <span className="block text-xs text-ink-500">{p.format.replace(/_/g, " ").toLowerCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {related.posts.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-3">From the blog</h3>
            <ul className="space-y-2">
              {related.posts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block border rounded-xl px-4 py-3 hover:border-brand-blue hover:shadow-lift transition-all"
                  >
                    <span className="font-semibold text-sm line-clamp-2">{post.title}</span>
                    {post.excerpt && <span className="block text-xs text-ink-500 mt-1 line-clamp-2">{post.excerpt}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
