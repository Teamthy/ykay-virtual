"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Building2, Check, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addStudent,
  getInstitution,
  inviteMember,
  listMemberships,
  listStudents,
  removeMember,
  removeStudent,
  setMemberRole,
  updateInstitution,
  type InstitutionType,
  type MembershipRole,
} from "@/features/institutions/console";
import { listLearners } from "@/features/onboarding/api";
import {
  getPlusTeamsAllocation,
  setPlusTeamsSeats,
  listPlusTeamsSeats,
  assignPlusTeamSeat,
  releasePlusTeamSeat,
  type PlusTeamsAllocation,
  type PlusTeamsSeat,
} from "@/features/plus/api";

const ROLES: MembershipRole[] = [
  "OWNER",
  "ADMIN",
  "TEACHER",
  "STUDENT",
  "BILLING",
];
const TYPES: InstitutionType[] = [
  "SCHOOL",
  "CORPORATE",
  "GOVERNMENT",
  "NGO",
  "OTHER",
];

type Tab = "profile" | "members" | "students" | "plusteams";

export default function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("profile");

  const inst = useQuery({
    queryKey: ["me", "institution", id],
    queryFn: () => getInstitution(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    description: "",
  });
  const [loaded, setLoaded] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      updateInstitution(id, {
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        description: form.description || undefined,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["me", "institution", id] }),
  });

  const data = inst.data;
  if (!loaded && data) {
    setLoaded(true);
    setForm({
      name: data.name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      website: data.website ?? "",
      description: data.description ?? "",
    });
  }

  if (inst.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (inst.isError || !data) {
    return (
      <div className="py-16 text-center text-ink-500">
        <p>Institution not found or you don&apos;t have access.</p>
        <Link
          href="/account/institutions"
          className="mt-3 inline-block font-semibold text-brand-blue hover:underline"
        >
          ← Back to my institutions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/account/institutions"
          className="text-ink-400 hover:text-ink-600"
        >
          ←
        </Link>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-deep text-white">
          <Building2 size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{data.name}</h1>
          <p className="text-xs text-ink-500">
            {data.type.toLowerCase()} {data.verified_at ? "· verified" : ""}{" "}
            {!data.is_active && "· inactive"}
          </p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-ink-100 p-1 text-sm font-semibold">
        {(["profile", "members", "students", "plusteams"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 capitalize ${tab === t ? "bg-white text-deep shadow" : "text-ink-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-ink-700">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-ink-700">Email</span>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-ink-700">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-ink-700">Website</span>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium text-ink-700">Description</span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <div className="mt-5">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            {save.isSuccess && (
              <span className="ml-3 inline-flex items-center gap-1 text-sm font-medium text-green-700">
                <Check size={14} /> Saved
              </span>
            )}
          </div>
        </div>
      )}

      {tab === "members" && <MembersPanel id={id} />}
      {tab === "students" && <StudentsPanel id={id} />}
      {tab === "plusteams" && <PlusTeamsPanel id={id} />}
    </div>
  );
}

function MembersPanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<MembershipRole>("TEACHER");

  const members = useQuery({
    queryKey: ["me", "institution", id, "members"],
    queryFn: () => listMemberships(id),
    enabled: !!id,
  });

  const invite = useMutation({
    mutationFn: () => inviteMember(id, userId, role),
    onSuccess: () => {
      setUserId("");
      qc.invalidateQueries({ queryKey: ["me", "institution", id, "members"] });
    },
  });

  const changeRole = useMutation({
    mutationFn: (args: { uid: string; role: MembershipRole }) =>
      setMemberRole(id, args.uid, args.role),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["me", "institution", id, "members"] }),
  });

  const remove = useMutation({
    mutationFn: (uid: string) => removeMember(id, uid),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["me", "institution", id, "members"] }),
  });

  const rows = members.data ?? [];

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
      <h2 className="mb-4 font-bold text-ink-900">Team members</h2>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User ID (uuid)"
          className="flex-1 rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as MembershipRole)}
          className="rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.toLowerCase()}
            </option>
          ))}
        </select>
        <Button
          onClick={() => invite.mutate()}
          disabled={!userId.trim() || invite.isPending}
        >
          <UserPlus size={16} className="mr-1.5" /> Invite
        </Button>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-ink-500">No members yet.</p>
        )}
        {rows.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-4 py-2.5"
          >
            <div className="text-sm">
              <span className="font-semibold text-ink-800">
                {m.user_id.slice(0, 8)}…
              </span>
              <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">
                {m.role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={m.role}
                onChange={(e) =>
                  changeRole.mutate({
                    uid: m.user_id,
                    role: e.target.value as MembershipRole,
                  })
                }
                className="rounded-lg border border-ink-200 px-2 py-1 text-xs"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.toLowerCase()}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove.mutate(m.user_id)}
                className="text-ink-400 hover:text-red-600"
                title="Remove member"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentsPanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    staleTime: 30_000,
  });
  const students = useQuery({
    queryKey: ["me", "institution", id, "students"],
    queryFn: () => listStudents(id),
    enabled: !!id,
  });

  const [selected, setSelected] = useState("");
  const [ref, setRef] = useState("");

  const add = useMutation({
    mutationFn: () => addStudent(id, selected, ref),
    onSuccess: () => {
      setSelected("");
      setRef("");
      qc.invalidateQueries({ queryKey: ["me", "institution", id, "students"] });
    },
  });

  const remove = useMutation({
    mutationFn: (sid: string) => removeStudent(id, sid),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["me", "institution", id, "students"] }),
  });

  const rows = students.data ?? [];
  const picker = learners.data ?? [];

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
      <h2 className="mb-4 font-bold text-ink-900">Linked learners</h2>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
        >
          <option value="">Select a learner…</option>
          {picker.map((l) => (
            <option key={l.id} value={l.id}>
              {l.first_name} {l.last_name}
            </option>
          ))}
        </select>
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Enrolment ref (optional)"
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
        />
        <Button
          onClick={() => add.mutate()}
          disabled={!selected || add.isPending}
        >
          <UserPlus size={16} className="mr-1.5" /> Link
        </Button>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-ink-500">No learners linked yet.</p>
        )}
        {rows.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-4 py-2.5"
          >
            <div className="text-sm">
              <span className="font-semibold text-ink-800">
                {s.student_name || s.student_profile_id.slice(0, 8)}
              </span>
              {s.student_level && (
                <span className="ml-2 text-xs text-ink-500">
                  {s.student_level}
                </span>
              )}
              {s.enrollment_ref && (
                <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">
                  {s.enrollment_ref}
                </span>
              )}
            </div>
            <button
              onClick={() => remove.mutate(s.student_profile_id)}
              className="text-ink-400 hover:text-red-600"
              title="Unlink learner"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlusTeamsPanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const [seatCount, setSeatCount] = useState("");
  const [userId, setUserId] = useState("");

  const alloc = useQuery({
    queryKey: ["me", "institution", id, "plusteams"],
    queryFn: () => getPlusTeamsAllocation(id),
    enabled: !!id,
  });
  const seats = useQuery({
    queryKey: ["me", "institution", id, "plusteams", "seats"],
    queryFn: () => listPlusTeamsSeats(id),
    enabled: !!id,
  });

  const saveSeats = useMutation({
    mutationFn: () => setPlusTeamsSeats(id, Number(seatCount)),
    onSuccess: () => {
      setSeatCount("");
      qc.invalidateQueries({
        queryKey: ["me", "institution", id, "plusteams"],
      });
    },
  });
  const assign = useMutation({
    mutationFn: () => assignPlusTeamSeat(id, userId),
    onSuccess: () => {
      setUserId("");
      qc.invalidateQueries({
        queryKey: ["me", "institution", id, "plusteams"],
      });
    },
  });
  const release = useMutation({
    mutationFn: (uid: string) => releasePlusTeamSeat(id, uid),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["me", "institution", id, "plusteams"],
      }),
  });

  const a = alloc.data;
  const rows = seats.data ?? [];

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink-900">YK-Virtual Plus Teams</h2>
        <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-deep">
          {a ? `${a.used_seats} / ${a.total_seats} seats` : "No seats yet"}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-500">
        Allocate seats covered by your organisation&apos;s Plus Teams plan.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={seatCount}
          onChange={(e) => setSeatCount(e.target.value)}
          type="number"
          min={0}
          placeholder="Total seats"
          className="flex-1 rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <Button
          onClick={() => saveSeats.mutate()}
          disabled={!seatCount || saveSeats.isPending}
        >
          {saveSeats.isPending ? "Saving…" : "Set seat capacity"}
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User ID to cover (uuid)"
          className="flex-1 rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <Button
          onClick={() => assign.mutate()}
          disabled={!userId.trim() || assign.isPending}
          variant="outline"
        >
          Assign seat
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-ink-500">No seats assigned yet.</p>
        )}
        {rows.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-4 py-2.5"
          >
            <div className="text-sm">
              <span className="font-semibold text-ink-800">
                {s.user_name || s.user_id.slice(0, 8)}
              </span>
              {s.user_email && (
                <span className="ml-2 text-xs text-ink-500">
                  {s.user_email}
                </span>
              )}
            </div>
            <button
              onClick={() => release.mutate(s.user_id)}
              className="text-ink-400 hover:text-red-600"
              title="Release seat"
            >
              Release
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
