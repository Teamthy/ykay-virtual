"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listReviews, moderateReview, type ReviewRow, type ReviewStatus } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminReviewsPage() {
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const reviews = useQuery({
    queryKey: ["admin", "reviews", status, page],
    queryFn: () => listReviews({ status: status || undefined, page }),
    staleTime: 15_000,
  });

  const moderate = useMutation({
    mutationFn: ({ id, s }: { id: string; s: ReviewStatus }) => moderateReview(id, s),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  const data = reviews.data?.data ?? [];
  const meta = reviews.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Review moderation</h1>
        <p className="text-ink-500 text-sm mt-1">
          Reviews publish only with reviewer consent - SEO Review JSON-LD uses published reviews only.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["PENDING", "PUBLISHED", "HIDDEN", "FLAGGED"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              status === s ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {reviews.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} />}
          title="Nothing in this queue"
          description="Reviews awaiting moderation will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {data.map((rv: ReviewRow) => (
            <li key={rv.id} className="border rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-extrabold text-brand-gold">★ {rv.rating}.0</span>
                  <div>
                    <p className="text-sm font-semibold">{rv.title ?? "Untitled review"}</p>
                    <p className="text-[11px] text-ink-400">
                      tutor {rv.tutor_profile_id.slice(0, 8)}… · reviewer {rv.reviewer_user_id.slice(0, 8)}… ·{" "}
                      {new Date(rv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={rv.status} kind={statusKindFor(rv.status)} />
                  {!rv.consent_given && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
                      NO CONSENT
                    </span>
                  )}
                </div>
              </div>
              {rv.comment && <p className="mt-3 text-sm text-ink-600">{rv.comment}</p>}
              {rv.status === "PENDING" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    disabled={moderate.isPending || !rv.consent_given}
                    title={!rv.consent_given ? "Reviewer consent required" : undefined}
                    onClick={() => moderate.mutate({ id: rv.id, s: "PUBLISHED" })}
                  >
                    Publish
                  </Button>
                  <Button size="sm" variant="outline" disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ id: rv.id, s: "HIDDEN" })}>
                    Hide
                  </Button>
                  <Button size="sm" variant="outline" disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ id: rv.id, s: "FLAGGED" })}>
                    Flag
                  </Button>
                </div>
              )}
              {(rv.status === "PUBLISHED" || rv.status === "FLAGGED") && (
                <div className="mt-4">
                  <Button size="sm" variant="outline" disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ id: rv.id, s: "HIDDEN" })}>
                    Unpublish
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <span className="text-sm text-ink-500 self-center">
            Page {meta.page} / {meta.total_pages}
          </span>
          <Button size="sm" variant="outline" disabled={!meta.has_next} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
