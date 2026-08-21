"use client";

// Admin payouts — the tutor bank-transfer queue. PENDING payouts show the
// tutor's bank destination; confirm each one after you execute the transfer
// from your bank/provider dashboard and record the transaction reference.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote, CheckCheck, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listAdminPayoutRows,
  confirmPayoutPaid,
  paystackPayout,
  finalizePaystackPayout,
  type AdminPayoutRow,
} from "@/features/admin/api";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const FILTERS = [
  { key: "PENDING", label: "Pending" },
  { key: "", label: "All" },
  { key: "PAID", label: "Paid" },
];

export default function AdminPayoutsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "payouts", status],
    queryFn: () => listAdminPayoutRows(status || undefined),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const rows = q.data?.payouts ?? [];
  const paystackEnabled = !!q.data?.paystack_transfers;

  // Paystack one-click transfer state.
  const [paystackBusyId, setPaystackBusyId] = useState<string | null>(null);
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);

  const pendingTotal = rows.filter((r) => r.payout.status === "PENDING").reduce((s, r) => s + r.payout.amount, 0);

  const confirm = async (row: AdminPayoutRow) => {
    const ref = (refs[row.payout.id] ?? "").trim();
    if (!ref) {
      toast.error("Enter the bank/provider transaction reference first");
      return;
    }
    setBusyId(row.payout.id);
    try {
      await confirmPayoutPaid(row.payout.id, ref);
      toast.success(`Payout of ${row.payout.currency} ${row.payout.amount.toLocaleString()} confirmed — tutor notified`);
      await qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm payout");
    } finally {
      setBusyId(null);
    }
  };

  const sendPaystack = async (row: AdminPayoutRow) => {
    setPaystackBusyId(row.payout.id);
    try {
      const res = await paystackPayout(row.payout.id);
      if (res.needs_otp) {
        setOtpFor(row.payout.id);
        toast.info("Enter the OTP sent to the tutor's bank-registered phone/email");
      } else {
        toast.success("Transfer sent via Paystack — payout marked PAID");
      }
      await qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Paystack transfer failed");
    } finally {
      setPaystackBusyId(null);
    }
  };

  const sendOTP = async () => {
    if (!otpFor || !otpValue.trim()) return;
    setOtpBusy(true);
    try {
      await finalizePaystackPayout(otpFor, otpValue.trim());
      toast.success("Transfer finalized — payout marked PAID");
      setOtpFor(null);
      setOtpValue("");
      await qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "OTP rejected — check it and try again");
    } finally {
      setOtpBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold text-brand-navy">
          <Banknote className="text-brand-gold" /> Tutor payouts
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {paystackEnabled
            ? "One-click Paystack bank transfers — the tutor is notified on WhatsApp the moment the money moves."
            : "Transfer each pending amount to the tutor&apos;s bank account, then confirm it here with the transaction reference — the tutor is notified on WhatsApp."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {FILTERS.map((f) => (
          <button
            key={f.key || "all"}
            type="button"
            onClick={() => setStatus(f.key)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              status === f.key ? "bg-brand-gold text-ink-900" : "border border-ink-200 bg-white text-ink-600 hover:border-ink-300"
            }`}
          >
            {f.label}
          </button>
        ))}
        {status === "PENDING" && (
          <span className="ml-auto rounded-full bg-brand-gold-light px-4 py-2 text-xs font-bold text-brand-navy">
            Pending total: {rows[0]?.payout.currency ?? "NGN"} {pendingTotal.toLocaleString()}
          </span>
        )}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-ink-500">Loading payouts…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Landmark size={20} />}
          title="No payouts in this view"
          description="Payouts appear here when escrow funds are released to a tutor."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.payout.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink-800">{r.tutor_display_name || r.tutor_profile_id.slice(0, 8)}</p>
                    <StatusBadge label={r.payout.status} kind={statusKindFor(r.payout.status)} />
                  </div>
                  <p className="mt-1 text-sm text-ink-600">
                    <span className="font-extrabold">{r.payout.currency} {r.payout.amount.toLocaleString()}</span>
                    {" · "}created {new Date(r.payout.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {r.tutor_email && <p className="text-xs text-ink-500">{r.tutor_email}{r.tutor_phone ? ` · ${r.tutor_phone}` : ""}</p>}
                </div>

                {r.payout.status === "PAID" ? (
                  <div className="text-right text-xs text-ink-500">
                    <p className="font-bold text-green-600">Transfer completed</p>
                    {r.payout.provider_reference && <p>Ref: {r.payout.provider_reference}</p>}
                    {r.payout.processed_at && (
                      <p>{new Date(r.payout.processed_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    )}
                  </div>
                ) : (
                  <div className="w-full sm:w-72">
                    {r.bank_details_missing ? (
                      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        Tutor has not added bank details yet — ask them to set it in their Earnings tab.
                      </p>
                    ) : (
                      <div className="rounded-xl border border-ink-100 bg-surface-muted p-3 text-xs text-ink-700">
                        <p><span className="font-bold text-ink-500">Bank: </span>{r.bank_name}</p>
                        <p><span className="font-bold text-ink-500">Account: </span>{r.account_number}</p>
                        <p><span className="font-bold text-ink-500">Name: </span>{r.account_name}</p>
                      </div>
                    )}
                    {paystackEnabled && (
                      <button
                        type="button"
                        disabled={paystackBusyId === r.payout.id}
                        onClick={() => void sendPaystack(r)}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0BA4DB] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {paystackBusyId === r.payout.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                        Send via Paystack
                      </button>
                    )}
                    <div className="mt-2 flex gap-2">
                      <input
                        value={refs[r.payout.id] ?? ""}
                        onChange={(e) => setRefs({ ...refs, [r.payout.id]: e.target.value })}
                        placeholder="Manual transfer reference"
                        className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={busyId === r.payout.id}
                        onClick={() => void confirm(r)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gold px-4 py-2 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-50"
                      >
                        {busyId === r.payout.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                        Confirm paid
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* Paystack OTP modal */}
      {otpFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOtpFor(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink-900">Enter transfer OTP</h2>
            <p className="mt-1 text-sm text-ink-500">
              Paystack sent an OTP to the tutor&apos;s bank-registered phone or email. Enter it to finalize the transfer.
            </p>
            <input
              autoFocus
              value={otpValue}
              onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ""))}
              maxLength={6}
              inputMode="numeric"
              placeholder="6-digit OTP"
              className="mt-4 w-full rounded-xl border border-ink-200 px-4 py-3 text-center text-xl tracking-[0.4em]"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={otpBusy || otpValue.trim().length === 0}
                onClick={() => void sendOTP()}
                className="flex-1 rounded-xl bg-brand-gold px-4 py-2.5 text-sm font-bold text-ink-900 disabled:opacity-50"
              >
                {otpBusy ? "Finalizing…" : "Finalize transfer"}
              </button>
              <button
                type="button"
                onClick={() => { setOtpFor(null); setOtpValue(""); }}
                className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
