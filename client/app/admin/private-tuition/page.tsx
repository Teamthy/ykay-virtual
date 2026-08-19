"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listApprovedTutors } from "@/features/admin/api";
import { listSubjects } from "@/features/subjects/api/list";
import {
  listAdminPrivateRequests,
  matchPrivateRequest,
  type PrivateTuitionRequest,
} from "@/features/tuition/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { UserPlus } from "lucide-react";

// Admin private-tuition matching queue: a parent requests to be matched, and
// an admin assigns a vetted tutor (creating a payable package + escrow order
// the parent then pays). This completes the request → match → pay → escrow
// journey.
const STATUSES = ["PENDING", "MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function AdminPrivateTuitionPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("PENDING");

  const requests = useQuery({
    queryKey: ["admin", "private-tuition", status],
    queryFn: () => listAdminPrivateRequests(status === "ALL" ? undefined : status),
    staleTime: 15_000,
  });
  const tutors = useQuery({ queryKey: ["admin", "tutors", "approved"], queryFn: () => listApprovedTutors(), staleTime: 30_000 });
  const subjects = useQuery({ queryKey: ["subjects", "catalogue"], queryFn: () => listSubjects(), staleTime: 300_000 });

  const subjectName = (id: string) => (subjects.data?.data ?? []).find((s) => s.id === id)?.name ?? id.slice(0, 8);

  const rows = requests.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy">Private tuition requests</h1>
        <p className="text-ink-500 text-sm mt-1">
          Parents request a vetted tutor; match one here to create their payable escrow order.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["ALL", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              status === s ? "bg-brand-gold text-ink-900" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={20} />}
          title="No requests in this view"
          description="New 'request a tutor' submissions will appear here as PENDING."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <RequestCard key={r.id} r={r} subjectName={subjectName(r.subject_id)} tutors={tutors.data ?? []} onMatched={() => qc.invalidateQueries({ queryKey: ["admin", "private-tuition"] })} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  r,
  subjectName,
  tutors,
  onMatched,
}: {
  r: PrivateTuitionRequest;
  subjectName: string;
  tutors: { id: string; display_name: string }[];
  onMatched: () => void;
}) {
  const [tutorId, setTutorId] = useState("");
  const [sessions, setSessions] = useState(10);
  const [duration, setDuration] = useState(60);
  const [matched, setMatched] = useState<{ order_number: string; total_amount: number; currency: string } | null>(null);

  const match = useMutation({
    mutationFn: () =>
      matchPrivateRequest(r.id, {
        tutor_profile_id: tutorId,
        total_sessions: sessions,
        session_duration_minutes: duration,
      }),
    onSuccess: (res) => {
      setMatched({ order_number: res.order.order_number, total_amount: res.order.total_amount, currency: res.order.currency });
      toast.success("Tutor matched — payable order created");
      onMatched();
    },
    onError: () => toast.error("Could not match (check the tutor can teach this subject and has a rate)"),
  });

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-brand-navy">{subjectName}</h3>
          <p className="text-xs text-ink-500 mt-0.5">Requested {new Date(r.created_at).toLocaleDateString()}</p>
        </div>
        <StatusBadge label={r.status} kind={statusKindFor(r.status)} />
      </div>

      {r.goals && <p className="mt-3 text-sm text-ink-600 line-clamp-2">{r.goals}</p>}
      <p className="mt-2 text-xs text-ink-400">
        {[r.preferred_days, r.preferred_time_range].filter(Boolean).join(" · ") || "No schedule preference"} · {r.timezone}
      </p>

      {matched ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <p className="font-semibold text-green-700">Order {matched.order_number} created for the parent to pay.</p>
          <p className="text-xs text-green-700/80">{matched.currency} {matched.total_amount.toLocaleString()} — held in escrow until lessons are delivered.</p>
        </div>
      ) : (
        r.status === "PENDING" && (
          <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs sm:col-span-3">
                <span className="font-medium text-ink-700">Vetted tutor</span>
                <select
                  value={tutorId}
                  onChange={(e) => setTutorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                >
                  <option value="">Select approved tutor…</option>
                  {tutors.map((t) => (
                    <option key={t.id} value={t.id}>{t.display_name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <span className="font-medium text-ink-700">Sessions</span>
                <input type="number" min={1} max={60} value={sessions} onChange={(e) => setSessions(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="font-medium text-ink-700">Duration / session</span>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm">
                  {[45, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </label>
            </div>
            <Button size="sm" variant="gold" disabled={!tutorId || match.isPending} onClick={() => match.mutate()}>
              {match.isPending ? "Matching…" : "Match tutor & create order"}
            </Button>
          </div>
        )
      )}
    </div>
  );
}
