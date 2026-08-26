"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Award, ShieldCheck, GraduationCap, Share2, Crown } from "lucide-react";
import { listMyCertificates, verifiedShare } from "@/features/certificates/api";
import { Button } from "@/components/ui/button";
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
              <VerifiedButton certId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function VerifiedButton({ certId }: { certId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const share = useMutation({
    mutationFn: () => verifiedShare(certId),
    onSuccess: (v) => setLink(v.verify_url),
    onError: (e) => {
      // 402 PREMIUM_REQUIRED -> prompt to upgrade.
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.includes("Plus")) setBlocked(true);
      else toast.error("Could not generate the share link");
    },
  });

  if (blocked) {
    return (
      <Link href="/account/plus" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3 py-1.5 text-xs font-bold text-deep hover:bg-brand-gold-hover">
        <Crown size={13} /> Unlock verified share — NUVORA Plus
      </Link>
    );
  }
  if (link) {
    return (
      <div className="mt-3">
        <input readOnly value={link} className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-1.5 text-[11px] text-ink-600" onFocus={(e) => e.target.select()} />
      </div>
    );
  }
  return (
    <Button size="sm" variant="outline" className="mt-3" onClick={() => share.mutate()} disabled={share.isPending}>
      <Share2 size={14} className="mr-1.5" /> {share.isPending ? "Generating…" : "Verified share link"}
    </Button>
  );
}
