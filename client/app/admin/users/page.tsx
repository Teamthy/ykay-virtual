"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { isAdmin } from "@/features/auth/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, ShieldCheck, Lock, UserX, UserCheck, RefreshCw } from "lucide-react";
import {
  listAdminUsers,
  listAdminRoles,
  setUserRole,
  setUserStatus,
  getUserDetail,
  type AdminUserRow,
  type AdminRole,
} from "@/features/admin/api";

// SUPER_ADMIN user & role management console. Role grants and account status
// changes are enforced server-side (requireSuperAdmin); this UI is the
// operator surface and never self-serves SUPER_ADMIN.

export default function AdminUsersPage() {
  const { user } = useSession();
  const superAdmin = !!user?.roles?.includes("SUPER_ADMIN");
  const isPlatformAdmin = isAdmin(user);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"all" | "admins">("all");
  const [detailFor, setDetailFor] = useState<string | null>(null);

  // Platform staff roles (admin accounts).
  const isStaffRole = (roles: string[]) =>
    roles.some((r) => ["SUPER_ADMIN", "ACADEMIC_ADMIN", "INSTITUTION_ADMIN"].includes(r));

  const pageSize = 25;

  const usersQ = useQuery({
    queryKey: ["admin", "users", debouncedSearch, statusFilter, page],
    queryFn: () =>
      listAdminUsers({ search: debouncedSearch, status: statusFilter, page, pageSize }),
    enabled: !!user && isPlatformAdmin,
    placeholderData: (prev) => prev,
  });

  const rolesQ = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: listAdminRoles,
    enabled: !!user && superAdmin,
    staleTime: 5 * 60_000,
  });

  const roleMut = useMutation({
    mutationFn: ({ userId, role, grant }: { userId: string; role: string; grant: boolean }) =>
      setUserRole(userId, role, grant),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats2"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update role"),
  });

  const statusMut = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) => setUserStatus(userId, status),
    onSuccess: () => {
      toast.success("Account status updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats2"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update status"),
  });

  const applySearch = () => {
    setDebouncedSearch(search.trim());
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((usersQ.data?.total ?? 0) / pageSize));

  if (!isPlatformAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Staff" title="Users" cover="/hero/about.jpg" />
        <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink-100 text-deep">
            <Lock size={26} />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-deep">Admin access required</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            You need a platform admin account to view the user list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super admin"
        title="Users & roles"
        cover="/hero/about.jpg"
        subline="Search accounts, review roles, grant/revoke access and suspend accounts."
      />

      {/* Tab filter */}
      <div className="flex gap-2">
        {([
          { id: "all", label: "All users" },
          { id: "admins", label: "Admins & staff" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              tab === t.id ? "bg-deep text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink-200 px-3 focus-within:border-primary">
          <Search size={16} className="shrink-0 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search by email or name…"
            className="h-10 w-full bg-transparent text-sm outline-none"
            aria-label="Search users"
          />
          {search && (
            <button onClick={applySearch} className="text-xs font-bold text-deep hover:underline">
              Go
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-700 outline-none focus:border-primary"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button
          onClick={() => { setSearch(""); setDebouncedSearch(""); setStatusFilter(""); setPage(1); }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-600 hover:border-ink-300"
        >
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      {/* Table */}
      {usersQ.isLoading && !usersQ.data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-[11px] uppercase tracking-[0.12em] text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-bold">User</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Roles</th>
                  <th className="px-4 py-3 font-bold">Joined</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {(usersQ.data?.users ?? [])
                  // Defense in depth: a non-SUPER_ADMIN admin must never see
                  // SUPER_ADMIN accounts or the SUPER_ADMIN role, even if a
                  // stale payload ever contained them. Server already filters.
                  .filter((u) => superAdmin || !(u.roles ?? []).includes("SUPER_ADMIN"))
                  .filter((u) => tab === "all" || isStaffRole(u.roles ?? []))
                  .map((u) => (
                    <UserRow
                      key={u.id}
                      u={u}
                      roles={rolesQ.data ?? []}
                      selfId={user?.id}
                      canManage={superAdmin}
                      roleMut={roleMut}
                      statusMut={statusMut}
                      onView={() => setDetailFor(u.id)}
                    />
                  ))}
              </tbody>
            </table>
          </div>
          {(usersQ.data?.users ?? []).length === 0 && (
            <p className="p-10 text-center text-sm text-ink-400">No users match your filters.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-ink-500">
        <span>
          {usersQ.data?.total ?? 0} user(s) · page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-ink-200 px-4 py-2 font-semibold text-ink-700 disabled:opacity-40 hover:border-ink-300"
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-ink-200 px-4 py-2 font-semibold text-ink-700 disabled:opacity-40 hover:border-ink-300"
          >
            Next
          </button>
        </div>
      </div>

      {detailFor && <UserDetailDialog userId={detailFor} onClose={() => setDetailFor(null)} />}

      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <ShieldCheck size={13} /> Role grants &amp; status changes are enforced server-side and audited. You cannot
        remove the last SUPER_ADMIN or suspend your own account.
      </p>
    </div>
  );
}

function UserRow({
  u,
  roles,
  selfId,
  canManage,
  roleMut,
  statusMut,
  onView,
}: {
  u: AdminUserRow;
  roles: AdminRole[];
  selfId?: string;
  canManage: boolean;
  roleMut: ReturnType<typeof useMutation<unknown, Error, { userId: string; role: string; grant: boolean }>>;
  statusMut: ReturnType<typeof useMutation<unknown, Error, { userId: string; status: string }>>;
  onView: () => void;
}) {
  const isSelf = u.id === selfId;
  const busy = roleMut.isPending || statusMut.isPending;
  const statusKind = u.status === "ACTIVE" ? "success" : u.status === "SUSPENDED" ? "error" : "pending";

  const toggleRole = (role: string, grant: boolean) => {
    if (u.id && role) roleMut.mutate({ userId: u.id, role, grant });
  };

  return (
    <tr className={isSelf ? "bg-primary-light/30" : ""}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-deep text-xs font-extrabold text-white">
            {(u.first_name?.[0] ?? u.email[0] ?? "?").toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-800">
              {u.first_name || u.email} {u.last_name || ""}
              {isSelf && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-ink-900">you</span>}
            </p>
            <p className="truncate text-xs text-ink-400">{u.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge label={u.status} kind={statusKind} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {(u.roles ?? []).map((r) => (
            <span key={r} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-600">
              {r}
            </span>
          ))}
          {(u.roles ?? []).length === 0 && <span className="text-xs text-ink-400">no roles</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-ink-500">
        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {!canManage && <span className="text-[11px] text-ink-400">View only</span>}
          <button
            onClick={onView}
            className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] font-bold text-ink-700 hover:border-ink-300"
            title="View full profile"
          >
            View
          </button>
          <select
            value=""
            onChange={(e) => e.target.value && toggleRole(e.target.value, true)}
            disabled={busy || !canManage}
            className="h-9 rounded-lg border border-ink-200 px-2 text-xs font-semibold text-ink-700 disabled:opacity-50"
            aria-label={`Add role to ${u.email}`}
          >
            <option value="">+ Role</option>
            {roles
              .filter((r) => !(u.roles ?? []).includes(r.name))
              .map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
          </select>
          {(u.roles ?? []).filter((r) => r !== "STUDENT" && r !== "PARENT").map((r) => (
            <button
              key={r}
              onClick={() => toggleRole(r, false)}
              disabled={busy || !canManage || (r === "SUPER_ADMIN" && isSelf)}
              title={!canManage ? "SUPER_ADMIN required" : r === "SUPER_ADMIN" && isSelf ? "Cannot remove your own SUPER_ADMIN" : `Remove ${r}`}
              className="rounded-lg border border-ink-200 px-2 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              −{r}
            </button>
          ))}
          {u.status === "SUSPENDED" ? (
            <button
              onClick={() => u.id && statusMut.mutate({ userId: u.id, status: "ACTIVE" })}
              disabled={busy || !canManage}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-40"
            >
              <UserCheck size={12} /> Reactivate
            </button>
          ) : (
            <button
              onClick={() => u.id && statusMut.mutate({ userId: u.id, status: "SUSPENDED" })}
              disabled={busy || !canManage || isSelf}
              title={!canManage ? "SUPER_ADMIN required" : isSelf ? "You cannot suspend your own account" : "Suspend account"}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              <UserX size={12} /> Suspend
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}


// UserDetailDialog — full profile view. ANY platform admin can view; edits
// remain on the row actions (SUPER_ADMIN-only, enforced server-side).
function UserDetailDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["admin", "user-detail", userId], queryFn: () => getUserDetail(userId) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="User profile details">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-extrabold text-deep">Profile details</h3>
          <button onClick={onClose} className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-bold text-ink-600 hover:border-ink-300">
            Close
          </button>
        </div>

        {q.isLoading && <Skeleton className="mt-4 h-40 w-full rounded-xl" />}
        {q.error && <p className="mt-4 text-sm text-red-600">Could not load the profile.</p>}

        {q.data && (
          <dl className="mt-4 space-y-3 text-sm">
            <Detail label="Name" value={`${q.data.first_name ?? ""} ${q.data.last_name ?? ""}`.trim() || "—"} />
            <Detail label="Email" value={q.data.email} />
            <Detail label="Status" value={q.data.status} />
            <Detail label="Roles" value={(q.data.roles ?? []).join(", ") || "no roles"} />
            <Detail label="Phone" value={q.data.phone || "—"} />
            <Detail label="Joined" value={q.data.created_at ? new Date(q.data.created_at).toLocaleString() : "—"} />
            <Detail label="Email verified" value={q.data.email_verified_at ? new Date(q.data.email_verified_at).toLocaleString() : "not verified"} />
            <Detail label="Last login" value={q.data.last_login_at ? new Date(q.data.last_login_at).toLocaleString() : "never"} />
            <Detail label="Onboarded" value={q.data.onboarded_at ? new Date(q.data.onboarded_at).toLocaleString() : "not yet"} />
            {q.data.tutor_slug && (
              <Detail label="Tutor profile" value={`${q.data.tutor_slug} (${q.data.tutor_status ?? "—"})`} />
            )}
          </dl>
        )}
        <p className="mt-4 border-t border-ink-100 pt-3 text-[11px] text-ink-400">
          View-only. Role and status changes are SUPER_ADMIN actions on the table row.
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-50 pb-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-semibold text-ink-800">{value}</dd>
    </div>
  );
}
