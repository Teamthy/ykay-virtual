import { categoryPills } from "@/lib/site-data";
import Link from "next/link";

export function CategoryPills() {
  return (
    <section className="bg-white border-b border-ink-100 py-6">
      <div className="container-x flex justify-between items-center gap-5 overflow-x-auto">
        {categoryPills.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-2.5 cursor-pointer px-3 py-2 rounded-xl hover:bg-ink-50 hover:-translate-y-1 transition-all min-w-fit"
          >
            <div className="w-11 h-11 flex items-center justify-center text-2xl">{item.emoji}</div>
            <div className="text-xs md:text-sm text-ink-700 font-medium whitespace-nowrap">{item.label}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}