"use client";

import Link from "next/link";
import { loginWithReturn } from "@/lib/safe-next";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { PasswordInput, INPUT_CLS } from "@/components/ui/password-input";
import { useSession } from "@/hooks/useSession";
import { changePassword, logout } from "@/features/auth/api";
import { clearOnboardingDraft } from "@/lib/onboarding";
import {
  listDevices,
  removeDevice,
  type Device,
} from "@/features/account/api";
import { ReferralCard } from "@/features/referrals/ReferralCard";
import { listLearners, type Learner } from "@/features/onboarding/api";
import { Camera, UserPlus } from "lucide-react";

// /account — settings hub (P0): profile, security, devices, preferences,
// data export + deletion.

type Profile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  timezone: string;
  status: string;
};

const TABS = ["Profile", "Learners", "Referrals", "Security", "Devices", "Preferences", "Data"] as const;
type Tab = (typeof TABS)[number];

export default function AccountPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading } = useSession();
  const [tab, setTab] = useState<Tab>("Profile");

  useEffect(() => {
    if (!isLoading && !user) router.replace(loginWithReturn());
  }, [isLoading, user, router]);

  const devices = useQuery({ queryKey: ["account", "devices"], queryFn: listDevices });
  const learners = useQuery({ queryKey: ["onboarding", "learners"], queryFn: listLearners, enabled: !!user, staleTime: 30_000 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/v1/me/avatar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Avatar upload failed");
      }
      const data = await res.json();
      qc.setQueryData(["session"], (old2: unknown) => ({ ...(old2 as object), avatar_url: data.data?.avatar_url }));
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setPhone(user.phone ?? "");
      setTimezone(user.timezone || "Africa/Lagos");
    }
  }, [user]);

  // Preferences (client-side; documented in the privacy policy)
  const PREFS_KEY = "nuvora-email-prefs";
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}"));
    } catch {
      setPrefs({});
    }
  }, []);

  const saveProfile = useMutation({
    mutationFn: () =>
      apiFetch<Profile>("/auth/me/profile", {
        method: "PUT",
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone, timezone }),
      }),
    onSuccess: (res) => {
      qc.setQueryData(["session"], (old: unknown) => ({ ...(old as object), ...res.data }));
      toast.success("Profile saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  const savePassword = useMutation({
    mutationFn: (pw: string) => changePassword(pw),
    onSuccess: () => {
      toast.success("Password updated");
      setNewPw("");
      setNewPw2("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update password"),
  });
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const removeDev = useMutation({
    mutationFn: (id: string) => removeDevice(id),
    onSuccess: () => {
      toast.success("Device removed");
      qc.invalidateQueries({ queryKey: ["account", "devices"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove device"),
  });

  const doExport = async () => {
    try {
      const res = await fetch("/api/v1/auth/me/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nuvora-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data export is downloading");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export your data");
    }
  };

  const doDelete = useMutation({
    mutationFn: () => apiFetch<{ deleted: boolean }>("/auth/me/delete", { method: "POST" }),
    onSuccess: async () => {
      await logout();
      clearOnboardingDraft();
      toast.success("Your account has been deleted");
      qc.clear();
      router.replace("/");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete your account"),
  });
  const [confirmDelete, setConfirmDelete] = useState("");

  const togglePref = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  if (isLoading || !user) return <p className="py-24 text-center text-ink-400">Loading…</p>;

  return (
    <main className="min-h-screen bg-[#FFFCF5] pb-16">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/dashboard" className="hover:text-brand-gold-dark">Dashboard</Link> / Account
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">Account settings</h1>
          <p className="mt-1 text-sm text-ink-500">
            {user.email}
            {user.first_name ? ` · ${user.first_name} ${user.last_name ?? ""}` : ""}
          </p>
        </div>
      </header>

      <div className="mx-auto mt-6 grid max-w-5xl gap-6 px-6 lg:grid-cols-[220px_1fr]">
        {/* Tabs */}
        <aside className="h-fit rounded-2xl border border-ink-100 bg-white p-3 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold",
                tab === t ? "bg-brand-gold text-ink-900" : "text-ink-600 hover:bg-ink-50"
              )}
            >
              {t}
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          {tab === "Profile" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Profile</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="Your profile" className="size-20 rounded-full object-cover ring-2 ring-brand-gold" />
                  ) : (
                    <div className="grid size-20 place-items-center rounded-full bg-brand-navy text-2xl font-bold text-white">
                      {(user.first_name?.[0] ?? user.email[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 grid size-8 cursor-pointer place-items-center rounded-full bg-brand-gold text-ink-900 shadow-md transition-transform hover:scale-105" title="Upload photo">
                    <Camera size={15} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingAvatar}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadAvatar(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="text-sm text-ink-500">
                  <p className="font-semibold text-ink-800">{uploadingAvatar ? "Uploading…" : "Profile photo"}</p>
                  <p>JPEG, PNG or WebP · up to 10 MB</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ac-first" className="mb-1.5 block text-sm font-medium text-ink-800">First name</label>
                  <input id="ac-first" type="text" autoComplete="given-name" className={INPUT_CLS} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ac-last" className="mb-1.5 block text-sm font-medium text-ink-800">Last name</label>
                  <input id="ac-last" type="text" autoComplete="family-name" className={INPUT_CLS} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ac-phone" className="mb-1.5 block text-sm font-medium text-ink-800">Phone</label>
                  <input id="ac-phone" type="tel" autoComplete="tel" className={INPUT_CLS} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ac-tz" className="mb-1.5 block text-sm font-medium text-ink-800">Timezone</label>
                  <select id="ac-tz" className={INPUT_CLS} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {["Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Cairo", "Europe/London", "America/New_York", "UTC"].map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand-gold px-6 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-50"
              >
                {saveProfile.isPending ? "Saving…" : "Save changes"}
              </button>
            </section>
          )}

          {tab === "Learners" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Learners</h2>
              <p className="mt-1 text-sm text-ink-500">Learners linked to your account (you book for them).</p>
              <ul className="mt-4 space-y-2">
                {(learners.data ?? []).map((l: Learner) => (
                  <li key={l.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-surface-muted px-4 py-3">
                    <div>
                      <p className="font-semibold text-ink-800">{l.first_name} {l.last_name}</p>
                      <p className="text-xs text-ink-500">{l.current_level || "Level not set"}{l.school_name ? ` · ${l.school_name}` : ""}</p>
                    </div>
                  </li>
                ))}
                {(learners.data ?? []).length === 0 && (
                  <li className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
                    No learners yet — add one to book tuition.
                  </li>
                )}
              </ul>
              <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink-300 px-5 py-2.5 text-sm font-bold text-ink-800 transition-colors hover:border-brand-gold">
                <UserPlus size={15} /> Add a learner
              </Link>
            </section>
          )}

          {tab === "Referrals" && (
            <ReferralCard userId={user.id} />
          )}

          {tab === "Security" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Change password</h2>
              <div className="mt-4 max-w-md space-y-4">
                <PasswordInput id="ac-pw" label="New password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                <PasswordInput id="ac-pw2" label="Confirm new password" autoComplete="new-password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
                {newPw2 && newPw !== newPw2 && <p className="text-xs text-red-600">Passwords do not match.</p>}
                <button
                  type="button"
                  disabled={savePassword.isPending || !newPw || newPw.length < 8 || newPw !== newPw2}
                  onClick={() => savePassword.mutate(newPw)}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-gold px-6 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                >
                  {savePassword.isPending ? "Updating…" : "Update password"}
                </button>
              </div>
            </section>
          )}

          {tab === "Devices" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Push devices</h2>
              <p className="mt-1 text-sm text-ink-500">Devices that receive notifications from NUVORA.</p>
              <div className="mt-4 space-y-2">
                {(devices.data ?? []).map((d: Device) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{d.platform === "ios" ? "🍎" : d.platform === "android" ? "🤖" : "🌐"}</span>
                      <div>
                        <p className="text-sm font-semibold text-ink-800">{d.platform} · v{d.app_version ?? "?"}</p>
                        <p className="text-xs text-ink-400">{d.token.slice(0, 24)}… · last seen {new Date(d.last_seen_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDev.mutate(d.id)}
                      className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:border-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(devices.data ?? []).length === 0 && (
                  <p className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">
                    No devices registered yet — install the app or allow notifications to see them here.
                  </p>
                )}
              </div>
            </section>
          )}

          {tab === "Preferences" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Email preferences</h2>
              <p className="mt-1 text-sm text-ink-500">Stored on this device for now — server-side preferences ship with the notification centre.</p>
              <div className="mt-4 space-y-3">
                {[
                  ["booking", "Booking confirmations & payment receipts"],
                  ["progress", "Progress reports & tutor feedback"],
                  ["promo", "Programme offers & study tips"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3 text-sm">
                    <span className="font-medium text-ink-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={prefs[key] ?? true}
                      onChange={() => togglePref(key)}
                      className="size-4 accent-[#F4B400]"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {tab === "Data" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-brand-navy">Export your data</h2>
                <p className="mt-1 text-sm leading-6 text-ink-500">
                  Download everything we hold on your account: profile, roles, learners, devices and chat
                  history — as a JSON file. This fulfils the export right in our{" "}
                  <Link href="/privacy" className="font-semibold text-brand-gold-dark hover:underline">privacy policy</Link>.
                </p>
                <button
                  type="button"
                  onClick={() => void doExport()}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-brand-navy px-6 text-sm font-bold text-white hover:bg-brand-navy/90"
                >
                  ⬇ Download my data
                </button>
              </section>

              <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <h2 className="text-lg font-bold text-red-700">Delete your account</h2>
                <p className="mt-1 text-sm leading-6 text-red-600/80">
                  This permanently deletes your sign-in access, push devices and active sessions. Learners
                  linked to you remain in the system for administrative records until purged. This cannot be
                  undone — consider exporting your data first.
                </p>
                <div className="mt-4 flex max-w-md gap-2">
                  <input
                    type="text"
                    placeholder="Type DELETE to confirm"
                    className={cn(INPUT_CLS, "bg-white")}
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={confirmDelete !== "DELETE" || doDelete.isPending}
                    onClick={() => doDelete.mutate()}
                    className="shrink-0 rounded-lg bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    {doDelete.isPending ? "Deleting…" : "Delete account"}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
