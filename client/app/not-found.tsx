import Link from "next/link";

// Hard 404 page (never a soft-404 200 — SEO rule).
export default function NotFound() {
  return (
    <main className="container-x py-24 text-center">
      <div className="text-6xl font-extrabold text-brand-blue">404</div>
      <h1 className="text-2xl font-extrabold mt-4">Page not found</h1>
      <p className="text-ink-500 mt-2 max-w-md mx-auto">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Try searching for a tutor or programme
        instead.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/tutors" className="btn-primary">
          Find a tutor
        </Link>
        <Link href="/programmes" className="btn-gold">
          Browse programmes
        </Link>
      </div>
    </main>
  );
}
