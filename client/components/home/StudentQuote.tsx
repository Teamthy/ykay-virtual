export function StudentQuote() {
  return (
    <section className="py-20 md:py-24 bg-surface-muted text-center">
      <div className="max-w-[820px] mx-auto px-6 md:px-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-ink-800 mb-9 tracking-tight">
          What our students are saying
        </h2>
        <p className="text-lg text-ink-700 leading-loose italic mb-7">
          &ldquo;My tutor helped me overcome my fear of writing IELTS. He taught me everything I needed to know and I passed with a great score.&rdquo;
        </p>
        <div className="text-brand-gold text-xl mb-4 tracking-[2px]">★★★★★</div>
        <div className="text-base font-bold text-ink-800 mb-1">Adaeze Nwosu</div>
        <div className="text-sm text-ink-600">IELTS Student</div>
      </div>
    </section>
  );
}