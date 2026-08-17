// PageHeader — the shared, on-brand dashboard header band (deep-green navy
// surface + grid texture + gold eyebrow). Every dashboard uses it so the
// authenticated surfaces feel like one product.

const GRID_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0H0v40' fill='none' stroke='%2370F250' stroke-opacity='0.10' stroke-width='1'/%3E%3C/svg%3E\")";

export function PageHeader({
  eyebrow,
  title,
  subline,
  actions,
}: {
  eyebrow: string;
  title: string;
  subline?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-brand-navy px-6 py-8 shadow-card md:px-9 md:py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: GRID_BG }}
      />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.02em] text-white md:text-4xl">{title}</h1>
        {subline ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">{subline}</p> : null}
        {actions ? <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
