// PageHeader — navy photo band. Keep titles short; the photo is the texture.

export function PageHeader({
  eyebrow,
  title,
  subline,
  actions,
  cover = "/hero/programmes.jpg",
}: {
  eyebrow: string;
  title: string;
  subline?: string;
  actions?: React.ReactNode;
  cover?: string;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-brand-navy bg-cover bg-center px-6 py-7 shadow-card md:px-8 md:py-8"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(6,15,38,0.62) 0%, rgba(1,57,32,0.82) 100%), url("${cover}")`,
      }}
    >
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-3xl tracking-[0.02em] text-white md:text-4xl">{title}</h1>
        {subline ? <p className="mt-1.5 max-w-xl text-sm text-white/80">{subline}</p> : null}
        {actions ? <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
