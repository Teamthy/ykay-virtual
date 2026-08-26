"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyInstitutions } from "@/features/institutions/console";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
  BILLING: "Billing",
};

export default function InstitutionsConsolePage() {
  const query = useQuery({
    queryKey: ["me", "institutions"],
    queryFn: listMyInstitutions,
    staleTime: 30_000,
  });

  const views = query.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">My institutions</h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage your school or organisation profile, members and learners.
          </p>
        </div>
        <Link
          href="/for-schools"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-deep px-4 py-2 text-sm font-bold text-white hover:bg-deep/90"
        >
          <Plus size={16} /> New institution
        </Link>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : views.length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} />}
          title="No institutions yet"
          description="If you represent a school or organisation, create one to manage its profile, team and learners."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {views.map((v) => (
            <Link
              key={v.institution_id}
              href={`/account/institutions/${v.institution_id}`}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-deep text-white">
                  <Building2 size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-ink-900">{v.institution.name}</h2>
                  <p className="text-xs text-ink-500">{v.institution.type.toLowerCase()}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-bold text-ink-600">
                  {ROLE_LABEL[v.role] ?? v.role}
                </span>
                {!v.institution.is_active && (
                  <span className="text-xs font-semibold text-amber-600">Inactive</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
