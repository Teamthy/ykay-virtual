"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getTutorAvailability, dayName, type TutorSlot } from "@/features/tutors/api/availability";

/**
 * Real weekly availability for a tutor (feature 4). Shows only genuine slots
 * from tutor_availabilities; an honest empty state when the tutor has set none.
 */
export function TutorAvailability({ tutorProfileId }: { tutorProfileId: string }) {
  const [slots, setSlots] = useState<TutorSlot[] | null>(null);

  useEffect(() => {
    let alive = true;
    getTutorAvailability(tutorProfileId)
      .then((s) => alive && setSlots(s))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [tutorProfileId]);

  if (slots === null) {
    return <p className="text-sm text-[#0F2A1A]/60">Loading availability…</p>;
  }
  if (slots.length === 0) {
    return (
      <p className="text-sm text-[#0F2A1A]/60">
        This tutor hasn&rsquo;t published weekly availability yet. Send a booking
        request and they&rsquo;ll confirm a time.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {slots.map((s) => (
        <li key={s.id} className="flex items-center gap-2 text-sm text-[#0F2A1A]">
          <Clock className="h-4 w-4 text-[#0F2A1A]/50" aria-hidden />
          <span className="font-semibold">{dayName(s.day_of_week)}</span>
          <span className="text-[#0F2A1A]/70">
            {s.start_time}–{s.end_time}
          </span>
        </li>
      ))}
    </ul>
  );
}
