"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/useSession";
import { createReview, listTutorReviews } from "@/features/reviews/api";

/**
 * ReviewsSection — published reviews for a tutor (consent-gated) + a review
 * form for signed-in parents. Reviews start PENDING and publish after admin
 * moderation; the tutor's rating recomputes automatically on publish.
 */
export function ReviewsSection({ tutorSlug, tutorId }: { tutorSlug: string; tutorId: string }) {
  const { user } = useSession();
  const qc = useQueryClient();

  const reviews = useQuery({
    queryKey: ["reviews", tutorSlug],
    queryFn: () => listTutorReviews(tutorSlug),
    staleTime: 120_000,
  });

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      createReview({
        tutor_profile_id: tutorId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        consent_given: consent,
      }),
    onSuccess: () => {
      toast.success("Review submitted — thank you!", {
        description: "It appears publicly after our team moderates it.",
      });
      setTitle("");
      setComment("");
      setConsent(false);
      qc.invalidateQueries({ queryKey: ["reviews", tutorSlug] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Could not submit review");
    },
  });

  const data = reviews.data ?? [];

  return (
    <section className="mt-8">
      <h3 className="font-bold text-lg">Reviews</h3>

      {reviews.isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : data.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-6 text-center">
          No published reviews yet — every review appears with the reviewer's explicit consent.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {data.map((r) => (
            <li key={r.id} className="border rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="text-brand-gold font-extrabold">★ {r.rating}.0</span>
                {r.title && <span className="font-semibold text-sm">{r.title}</span>}
              </div>
              {r.comment && <p className="mt-2 text-sm text-ink-600">{r.comment}</p>}
              <p className="mt-2 text-[10px] text-ink-400">
                Verified parent · consent given · {new Date(r.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Review form — signed-in users only */}
      {user ? (
        <div className="mt-6 border rounded-2xl p-6">
          <h4 className="font-bold">Had tuition with this tutor? Leave a review</h4>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-sm font-medium">Rating</span>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`text-2xl transition-transform ${n <= rating ? "text-brand-gold scale-110" : "text-ink-200 hover:scale-105"}`}
                    aria-label={`${n} star`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              <span className="font-medium">Title (optional)</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Your experience (optional)</span>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </label>
            <label className="flex items-start gap-2 text-xs text-ink-600 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>
                I consent to this review being published publicly on this tutor&apos;s profile (required).
                Reviews are moderated before publication.
              </span>
            </label>
            <Button
              variant="gold"
              size="sm"
              disabled={submit.isPending || !consent}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Submitting…" : "Submit review"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-500">
          <a href="/login" className="text-brand-blue font-semibold hover:underline">Log in</a> to leave a review after your tuition.
        </p>
      )}
    </section>
  );
}
