"use client";

import { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import {
  addPlayerNote,
  deletePlayerNote,
  fmtTimestamp,
  listPlayerNotes,
  type PlayerNote,
} from "@/features/learning/api/player-notes";
import { useSession } from "@/hooks/useSession";

/**
 * Lesson bookmarks & timestamped notes (feature 5). Shown inside the LMS
 * lesson/recording player; the shared participant view lists everyone's notes
 * for the lesson, each with a jump-to timestamp.
 */
export function LessonNotesPanel({
  lessonId,
  currentSec = 0,
}: {
  lessonId: string;
  currentSec?: number;
}) {
  const { user } = useSession();
  const [notes, setNotes] = useState<PlayerNote[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const role: PlayerNote["role"] =
    user?.roles?.includes("TUTOR") ? "TUTOR" : user?.roles?.includes("PARENT") ? "PARENT" : "STUDENT";

  useEffect(() => {
    let alive = true;
    listPlayerNotes(lessonId)
      .then((n) => alive && setNotes(n))
      .catch(() => alive && setNotes([]));
    return () => {
      alive = false;
    };
  }, [lessonId]);

  async function add(isBookmark: boolean) {
    setBusy(true);
    try {
      await addPlayerNote(lessonId, {
        role,
        timestamp_sec: Math.floor(currentSec),
        is_bookmark: isBookmark,
        text: isBookmark ? "" : text.trim(),
      });
      setText("");
      setNotes(await listPlayerNotes(lessonId));
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deletePlayerNote(id);
      setNotes(await listPlayerNotes(lessonId));
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Note at ${fmtTimestamp(Math.floor(currentSec))}…`}
          className="min-w-0 flex-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-[#0F2A1A]"
        />
        <button
          onClick={() => add(false)}
          disabled={busy || !text.trim()}
          className="rounded-full bg-[#0F2A1A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Add note
        </button>
        <button
          onClick={() => add(true)}
          disabled={busy}
          title="Bookmark this moment"
          className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#0F2A1A] hover:bg-black/5 disabled:opacity-40"
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden /> Bookmark
        </button>
      </div>

      {notes === null && <p className="text-sm text-[#0F2A1A]/60">Loading notes…</p>}
      {notes && notes.length === 0 && (
        <p className="text-sm text-[#0F2A1A]/60">No notes or bookmarks yet.</p>
      )}
      {notes && notes.length > 0 && (
        <ul className="space-y-1.5">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F2A1A]">
                  {n.is_bookmark && <Bookmark className="h-3.5 w-3.5" aria-hidden />}
                  <span className="rounded-full bg-[#D6FF57] px-2 py-0.5 text-[#0F2A1A]">
                    {fmtTimestamp(n.timestamp_sec)}
                  </span>
                  <span className="text-[#0F2A1A]/50">{n.role}</span>
                </div>
                {n.text && <p className="mt-1 text-sm text-[#0F2A1A]">{n.text}</p>}
              </div>
              {n.user_id === user?.id && (
                <button
                  onClick={() => remove(n.id)}
                  disabled={busy}
                  title="Delete my note"
                  className="text-[#0F2A1A]/40 hover:text-[#0F2A1A] disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
