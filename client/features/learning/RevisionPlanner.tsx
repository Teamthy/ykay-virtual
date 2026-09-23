"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarRange, Check, RefreshCw } from "lucide-react";
import {
  completeTask,
  createRevisionPlan,
  listRevisionPlans,
  rebalancePlan,
  type RevisionPlan,
  type RevisionTask,
} from "@/features/learning/api/revision";
import { apiFetch } from "@/lib/api";

const PRIORITY_LABEL: Record<number, string> = { 1: "Focus", 2: "Steady", 3: "Light" };
const PRIORITY_CLASS: Record<number, string> = {
  1: "bg-[#D6FF57] text-[#0F2A1A]",
  2: "bg-[#F9F6ED] text-[#0F2A1A] border border-[#0F2A1A]/10",
  3: "bg-white text-[#0F2A1A]/70 border border-black/10",
};

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Adaptive revision planner (feature 1). Shows the learner's plan with a week
 * timeline of tasks seeded from weak topics. No exam predictions — tasks come
 * only from real attempt history.
 */
export function RevisionPlanner() {
  const [plans, setPlans] = useState<RevisionPlan[] | null>(null);
  const [active, setActive] = useState<RevisionPlan | null>(null);
  const [tasks, setTasks] = useState<RevisionTask[]>([]);
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPlans = useCallback(() => {
    listRevisionPlans()
      .then((p) => {
        setPlans(p);
        if (!active && p.length) setActive(p[0]);
      })
      .catch(() => setPlans([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (!active) {
      setTasks([]);
      return;
    }
    let alive = true;
    apiFetch<RevisionTask[]>(`/me/revision-plans/${active.id}/tasks`)
      .then((r) => alive && setTasks(r.data ?? []))
      .catch(() => alive && setTasks([]));
    return () => {
      alive = false;
    };
  }, [active]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    setBusy(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + 90 * 24 * 3600 * 1000); // 90-day shape
      await createRevisionPlan({ subject: subject.trim(), window_start: iso(start), window_end: iso(end) });
      setSubject("");
      loadPlans();
    } catch {
      /* surface via console */
    } finally {
      setBusy(false);
    }
  }

  async function onComplete(taskId: string) {
    setBusy(true);
    try {
      await completeTask(taskId);
      if (active) {
        const r = await apiFetch<RevisionTask[]>(`/me/revision-plans/${active.id}/tasks`);
        setTasks(r.data ?? []);
      }
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }

  async function onRebalance() {
    if (!active) return;
    setBusy(true);
    try {
      await rebalancePlan(active.id);
      const r = await apiFetch<RevisionTask[]>(`/me/revision-plans/${active.id}/tasks`);
      setTasks(r.data ?? []);
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-[#0F2A1A]/70">
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Biology"
            className="mt-1 block w-44 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-[#0F2A1A]"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !subject.trim()}
          className="rounded-full bg-[#0F2A1A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          Build 90-day plan
        </button>
      </form>

      {plans && plans.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active?.id === p.id ? "bg-[#D6FF57] text-[#0F2A1A]" : "bg-[#F9F6ED] text-[#0F2A1A]/70"
              }`}
            >
              {p.subject}
            </button>
          ))}
        </div>
      )}

      {active && tasks.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2A1A]/70">
              <CalendarRange className="h-4 w-4" aria-hidden /> Week timeline
            </p>
            <button
              onClick={onRebalance}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[#0F2A1A] hover:bg-black/5 disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Rebalance
            </button>
          </div>
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_CLASS[t.priority]}`}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                  <span className={`truncate text-sm ${t.status === "DONE" ? "text-[#0F2A1A]/40 line-through" : "text-[#0F2A1A]"}`}>
                    {t.topic}
                  </span>
                  {t.source === "rebalanced" && (
                    <span className="text-[10px] text-[#0F2A1A]/40">rebalanced</span>
                  )}
                </div>
                {t.status === "PENDING" ? (
                  <button
                    onClick={() => onComplete(t.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-full bg-[#0F2A1A] px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
                  >
                    <Check className="h-3 w-3" aria-hidden /> Done
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-[#0F2A1A]/50">Done</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {plans && plans.length === 0 && (
        <p className="text-sm text-[#0F2A1A]/60">
          No revision plan yet. Build one and we&rsquo;ll schedule your weaker
          topics from your own practice history — no guesses about the exam.
        </p>
      )}
      {active && tasks.length === 0 && (
        <p className="text-sm text-[#0F2A1A]/60">
          This plan has no scheduled topics yet. Complete a CBT or past-paper set
          so we can focus your revision on what needs work.
        </p>
      )}
    </div>
  );
}
