// Content filtering - hides seeded demo/placeholder content from live
// marketing pages so only real (curated or production) rows render.
//
// The demo seed (seed-prod-demo.sql) uses a stable `demo-` prefix on
// programme/cohort/tutor/blog slugs. Public lists filter those out so the
// homepage and catalogue don't surface placeholder "JAMB English Language Prep
// - Cohort 2"-style rows to visitors. Real content (curated slugs) always shows.

/** True if a row is seeded demo content (slug starts with `demo-`). */
export function isDemoSlug(slug?: string | null): boolean {
  if (!slug) return false;
  const s = slug.toLowerCase();
  return (
    s.startsWith("demo-") ||
    s.includes("utme-mastery") ||
    s.includes("lms-demo") ||
    s.includes("lmsdemo")
  );
}

/** Filter an array of rows that expose a `slug` field. */
export function hideDemo<T extends { slug?: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => !isDemoSlug(r.slug));
}
