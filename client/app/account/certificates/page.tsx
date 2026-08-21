"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, ShieldCheck, GraduationCap } from "lucide-react";
import { listMyCertificates } from "@/features/certificates/api";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function CertificatesPage() {
  const certs = useQuery({
    queryKey: ["me", "certificates"],
    queryFn: listMyCertificates,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-deep flex items-center gap-2">
          <Award className="text-primary" /> My certificates
        </h1>
        <p className="text-ink-500 text-sm mt-1">
          Credentials you earn when you complete a cohort. Each has a unique, verifiable number.
        </p>
      </div>

      {certs.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (certs.data ?? []).length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={20} />}
          title="No certificates yet"
          description="Complete a cohort and your completion certificate will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(certs.data ?? []).map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-primary/40 bg-gradient-to-br from-white to-primary/5 p-6 shadow-soft"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-deep text-primary">
                  <Award size={18} />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <ShieldCheck size={11} /> Verified
                </span>
              </div>
              <h2 className="mt-3 font-display text-lg font-bold text-deep">{c.title}</h2>
              <p className="text-sm text-ink-600">
                This certifies that <strong className="text-ink-800">{c.learner_name}</strong>{" "}
                {c.programme_title ? <>completed <strong className="text-ink-800">{c.programme_title}</strong></> : "completed the programme"}
              </p>
              <p className="mt-3 text-xs text-ink-500">
                Issued by {c.issued_by} · {new Date(c.issued_at).toLocaleDateString()}
              </p>
              <p className="mt-1 font-mono text-[11px] text-ink-400">#{c.credential_number}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
