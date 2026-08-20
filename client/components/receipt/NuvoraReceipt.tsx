"use client";

type ReceiptItem = {
  item_type?: string;
  description?: string;
  quantity?: number;
  total_price?: number;
};

export function NuvoraReceipt({
  orderNumber,
  status,
  createdAt,
  currency,
  total,
  items,
  payer,
  learner,
}: {
  orderNumber: string;
  status: string;
  createdAt: string;
  currency: string;
  total: number;
  items: ReceiptItem[];
  payer?: string;
  learner?: string;
}) {
  const when = new Date(createdAt);
  return (
    <article id="nuvora-receipt" className="mx-auto w-full max-w-[720px] rounded-3xl border border-ink-100 bg-white p-8 shadow-card print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b border-ink-100 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">NUVORA</p>
          <h1 className="mt-1 font-display text-3xl text-deep">Payment receipt</h1>
          <p className="mt-1 text-sm text-ink-500">Learning beyond boundaries · Africa/Lagos</p>
        </div>
        <div className="rounded-2xl bg-deep px-4 py-3 text-right text-white">
          <p className="font-mono text-sm font-bold">{orderNumber}</p>
          <p className="text-[11px] text-white/70">{status}</p>
        </div>
      </header>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Date &amp; time</dt>
          <dd className="font-semibold text-ink-900">{when.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</dd>
        </div>
        {payer && (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Billed to</dt>
            <dd className="font-semibold text-ink-900">{payer}</dd>
          </div>
        )}
        {learner && (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Learner</dt>
            <dd className="font-semibold text-ink-900">{learner}</dd>
          </div>
        )}
      </dl>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-400">
            <th className="py-2">Item</th>
            <th className="py-2">Type</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-ink-50">
              <td className="py-3 font-semibold text-ink-800">{it.description || "Enrolment"}</td>
              <td className="py-3 text-ink-500">{(it.item_type || "").replace(/_/g, " ")}</td>
              <td className="py-3 text-right font-bold text-ink-900">
                {currency} {(it.total_price ?? 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-lg font-extrabold text-deep">
        Total {currency} {total.toLocaleString()}
      </p>
      <p className="mt-6 text-xs leading-relaxed text-ink-500">
        Fees are held in escrow and released to the tutor after lessons are delivered. This is an official NUVORA receipt.
        Print this page or use your browser&apos;s Save as PDF.
      </p>
    </article>
  );
}
