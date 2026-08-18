"use client";

import { useSession } from "@/hooks/useSession";
import { isAdmin } from "@/features/auth/api";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats2 } from "@/features/admin/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import Link from "next/link";

// Super-admin staff view. Role grants stay server-side (no self-serve SUPER_ADMIN).

export default function AdminUsersPage() {
  const { user } = useSession();
  const superAdmin = !!user?.roles?.includes("SUPER_ADMIN");
  const stats = useQuery({ queryKey: ["admin", "stats2"], queryFn: getAdminStats2, enabled: !!user && isAdmin(user) });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff" title="Users" cover="/hero/about.jpg" />
      {!superAdmin && (
        <p className="rounded-2xl border border-ink-100 bg-white p-4 text-sm text-ink-600">
          You can view platform counts. Granting SUPER_ADMIN or ACADEMIC_ADMIN is not self-serve.
        </p>
      )}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { l: "Registered", v: stats.data?.users },
          { l: "Active", v: stats.data?.active_users },
          { l: "Tutors pending", v: stats.data?.tutors_pending },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl border border-ink-100 bg-white p-4">
            <p className="text-2xl font-extrabold text-brand-navy">{c.v ?? "-"}</p>
            <p className="text-xs font-semibold text-ink-500">{c.l}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/vetting" className="rounded-2xl border border-ink-100 bg-white p-5 hover:border-brand-gold">
          <h2 className="font-bold text-brand-navy">Tutor applications</h2>
          <p className="mt-1 text-sm text-ink-500">Approve or hold tutor vetting.</p>
        </Link>
        <Link href="/admin/payments" className="rounded-2xl border border-ink-100 bg-white p-5 hover:border-brand-gold">
          <h2 className="font-bold text-brand-navy">Payments</h2>
          <p className="mt-1 text-sm text-ink-500">Orders, refunds, payouts.</p>
        </Link>
      </section>
    </div>
  );
}
