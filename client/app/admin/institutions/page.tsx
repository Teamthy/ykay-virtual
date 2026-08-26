"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminSetInstitutionStatus,
  adminUpdateInstitution,
  listInstitutions,
  type Institution,
} from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Check, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminInstitutionsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [manage, setManage] = useState<Institution | null>(null);

  const institutions = useQuery({
    queryKey: ["admin", "institutions", search, type, page],
    queryFn: () => listInstitutions({ search: search || undefined, type: type || undefined, page }),
    staleTime: 30_000,
  });

  const data = institutions.data?.data ?? [];
  const meta = institutions.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Institutions</h1>
        <p className="text-ink-500 text-sm mt-1">
          B2B accounts - schools and corporate training partners (for-schools / corporate-training flow).
        </p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {["", "SCHOOL", "CORPORATE", "GOVERNMENT", "NGO", "OTHER"].map((t) => (
          <button
            key={t || "all"}
            onClick={() => {
              setType(t);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              type === t ? "bg-deep text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {t || "All"}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search institutions…"
          className="ml-auto rounded-xl border border-ink-200 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
        />
      </div>

      {institutions.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} />}
          title="No institutions yet"
          description="Schools and companies join via the B2B flow and appear here."
        />
      ) : (
        <div className="border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-ink-50 text-left text-xs text-ink-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((i: Institution) => (
                <tr key={i.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-semibold">{i.name}</td>
                  <td className="px-5 py-3">
                    <StatusBadge label={i.type} kind={statusKindFor(i.type)} />
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-500">
                    {i.email ?? "-"}
                    {i.website ? ` · ${i.website.replace("https://", "")}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold ${i.is_active ? "text-green-700" : "text-ink-400"}`}>
                      {i.is_active ? "Active" : "Inactive"}
                    </span>
                    {i.verified_at && <span className="ml-2 text-xs font-bold text-brand-blue">Verified</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-500">{new Date(i.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline" onClick={() => setManage(i)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {manage && <ManageInstitutionModal inst={manage} onClose={() => setManage(null)} />}
    </div>
  );
}

function ManageInstitutionModal({ inst, onClose }: { inst: Institution; onClose: () => void }) {
  const qc = useQueryClient();
  const id = inst.id;
  const [name, setName] = useState(inst.name ?? "");
  const [email, setEmail] = useState(inst.email ?? "");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "institutions"] });

  const update = useMutation({
    mutationFn: () => adminUpdateInstitution(id, { name: name || undefined, email: email || undefined }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const setActive = useMutation({
    mutationFn: (active: boolean) => adminSetInstitutionStatus(id, { active }),
    onSuccess: invalidate,
  });

  const setVerified = useMutation({
    mutationFn: (verified: boolean) => adminSetInstitutionStatus(id, { verified }),
    onSuccess: invalidate,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Manage institution</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600">
            <X size={18} />
          </button>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="font-medium text-ink-700">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setActive.mutate(!inst.is_active)} disabled={setActive.isPending}>
            {inst.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setVerified.mutate(!inst.verified_at)} disabled={setVerified.isPending}>
            {inst.verified_at ? "Unverify" : "Verify"}
          </Button>
          <Button size="sm" onClick={() => update.mutate()} disabled={update.isPending} className="ml-auto">
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        {update.isSuccess && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-700">
            <Check size={12} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
