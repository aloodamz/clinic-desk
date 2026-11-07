"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { doctorName, invoiceTotals } from "@/lib/selectors";
import { fmtDate, rupees } from "@/lib/format";
import { Avatar, KpiCard, KpiIcons } from "@/components/ui";
import type { InvoiceStatus } from "@/lib/types";

const STATUS_CHIP: Record<InvoiceStatus, string> = {
  draft: "no-dot",
  sent: "info",
  part_paid: "warn",
  paid: "ok",
  refunded: "bad",
};

export default function BillingPage() {
  const {
    state,
    role,
    sendPaymentLink,
    recordPayment,
    refundPayment,
    requestWaiver,
    toast,
  } = useStore();

  const canMutateBilling = role === "owner" || role === "front_desk";

  const [selId, setSelId] = useState<string | null>(state?.invoices[0]?.id ?? null);
  const [statusFilter, setStatusFilter] = useState<"all" | "due" | "paid">("all");
  const [payMethod, setPayMethod] = useState<"cash" | "upi" | "card" | "link">("upi");
  const [waiverOpen, setWaiverOpen] = useState(false);

  if (!state) return null;

  const sorted = [...state.invoices].sort((a, b) => b.number - a.number);
  const filtered = sorted.filter((inv) => {
    const t = invoiceTotals(inv, state.waivers);
    if (statusFilter === "due") return t.due > 0;
    if (statusFilter === "paid") return inv.status === "paid";
    return true;
  });

  const sel = state.invoices.find((i) => i.id === selId) ?? filtered[0] ?? sorted[0] ?? null;
  const totals = sel ? invoiceTotals(sel, state.waivers) : null;
  const selPatient = sel ? state.patients.find((p) => p.id === sel.patientId) : null;

  // Overall KPIs
  let grandGross = 0;
  let grandPaid = 0;
  let grandDue = 0;
  let grandWaived = 0;
  for (const inv of state.invoices) {
    const t = invoiceTotals(inv, state.waivers);
    grandGross += t.gross;
    grandPaid += t.paid;
    grandDue += t.due;
    grandWaived += t.waived;
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            ACCOUNT &amp; BILLING · CASHIER &amp; RECEIPTS
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Billing &amp; Invoices
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            Invoices, WhatsApp payment links, receipts, refunds, and doctor-approved fee waivers.
          </p>
        </div>

        <Link href="/approvals" className="btn-ghost">
          Fee Waiver Approvals ›
        </Link>
      </div>

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="GROSS BILLED"
          value={rupees(grandGross)}
          sublabel={`${state.invoices.length} total invoices`}
          trend="Full tariff"
          trendTone="neutral"
          icon={KpiIcons.note}
        />
        <KpiCard
          label="COLLECTED"
          value={rupees(grandPaid)}
          sublabel="Cash, UPI, Card & Payment Links"
          trend="Receipted"
          trendTone="ok"
          icon={KpiIcons.rupee}
        />
        <KpiCard
          label="OUTSTANDING DUE"
          value={rupees(grandDue)}
          sublabel="Awaiting collection"
          trend={grandDue > 0 ? "Pending" : "Clear"}
          trendTone={grandDue > 0 ? "warn" : "ok"}
          icon={KpiIcons.hourglass}
        />
        <KpiCard
          label="FEE WAIVERS"
          value={rupees(grandWaived)}
          sublabel="Approved by named doctor"
          trend="Audited"
          trendTone="info"
          icon={KpiIcons.check}
        />
      </div>

      {/* Master-Detail 12-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Columns: Invoices Table */}
        <div className="lg:col-span-7 card !p-0 overflow-hidden">
          <div className="p-4 border-b border-[#E6E7EA] flex items-center justify-between gap-2 flex-wrap">
            <div className="seg-group">
              {(
                [
                  { id: "all", label: `All (${sorted.length})` },
                  { id: "due", label: "Outstanding Due" },
                  { id: "paid", label: "Paid" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatusFilter(t.id)}
                  className={`seg-btn ${statusFilter === t.id ? "active" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Net</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const p = state.patients.find((x) => x.id === inv.patientId)!;
                  const t = invoiceTotals(inv, state.waivers);
                  const active = sel?.id === inv.id;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelId(inv.id)}
                      className={`cursor-pointer ${active ? "active-row" : ""}`}
                    >
                      <td className="font-bold tabular-nums">#{inv.number}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.name} size={28} />
                          <div>
                            <div className="font-semibold text-[13.5px] text-[#111315]">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[#868C98]">
                              {fmtDate(inv.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-[12.5px] text-[#525866]">
                        {doctorName(state, inv.doctorId)}
                      </td>
                      <td className="tabular-nums font-semibold">{rupees(t.net)}</td>
                      <td
                        className={`tabular-nums font-bold ${
                          t.due > 0 ? "text-[#B54708]" : "text-[#067647]"
                        }`}
                      >
                        {rupees(t.due)}
                      </td>
                      <td>
                        <span className={`chip sm ${STATUS_CHIP[inv.status]}`}>
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Columns: Selected Invoice Inspector & Cashier Drawer */}
        {sel && totals && selPatient && (
          <div className="lg:col-span-5 card flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#F0F1F3] pb-3.5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#868C98]">
                  CLINICAL TAX INVOICE
                </div>
                <h2 className="font-bold text-[19px] text-[#111315] mt-0.5">
                  Invoice #{sel.number}
                </h2>
                <p className="text-[12.5px] text-[#667085]">
                  {selPatient.name} · {doctorName(state, sel.doctorId)} · {fmtDate(sel.createdAt)}
                </p>
              </div>
              <span className={`chip sm ${STATUS_CHIP[sel.status]}`}>
                {sel.status.replace("_", " ")}
              </span>
            </div>

            {/* Line Items */}
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#868C98]">
                Treatment Lines
              </div>
              {sel.lines.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between text-[13.5px] py-1 border-b border-[#F0F1F3]"
                >
                  <span className="font-medium text-[#111315]">{l.label}</span>
                  <span className="tabular-nums font-semibold text-[#111315]">
                    {rupees(l.amount)}
                  </span>
                </div>
              ))}

              {/* Approved Waivers (Never called "free"!) */}
              {totals.approved.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between text-[12.5px] text-[#067647] bg-[#ECFDF3] border border-[#ABEFC6] rounded-lg px-2.5 py-1.5"
                >
                  <span>
                    Fee waived {rupees(w.amount)}, approved by{" "}
                    {doctorName(state, w.approverDoctorId)}
                  </span>
                  <span className="tabular-nums font-bold">-{rupees(w.amount)}</span>
                </div>
              ))}
            </div>

            {/* Totals Summary Box */}
            <div className="bg-[#F8F8F6] border border-[#E6E7EA] rounded-xl p-3.5 flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px] text-[#525866]">
                <span>Gross Charges</span>
                <span className="tabular-nums">{rupees(totals.gross)}</span>
              </div>
              {totals.waived > 0 && (
                <div className="flex justify-between text-[13px] text-[#067647]">
                  <span>Approved Fee Waivers</span>
                  <span className="tabular-nums">-{rupees(totals.waived)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[14px] text-[#111315] pt-1 border-t border-[#E6E7EA]">
                <span>Net Payable</span>
                <span className="tabular-nums">{rupees(totals.net)}</span>
              </div>
              <div className="flex justify-between text-[13px] text-[#525866]">
                <span>Paid so far</span>
                <span className="tabular-nums">{rupees(totals.paid)}</span>
              </div>
              <div className="flex justify-between font-bold text-[14.5px] text-[#111315]">
                <span>Balance Due</span>
                <span className="tabular-nums">{rupees(totals.due)}</span>
              </div>
            </div>

            {/* Cashier Actions */}
            {totals.due > 0 && canMutateBilling && (
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Payment method"
                    value={payMethod}
                    onChange={(e) =>
                      setPayMethod(e.target.value as "cash" | "upi" | "card" | "link")
                    }
                    className="text-[12.5px]"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="link">Payment Link</option>
                  </select>
                  <button
                    type="button"
                    className="btn flex-1"
                    onClick={() => {
                      const r = recordPayment(sel.id, totals.due, payMethod);
                      toast(
                        `Recorded ${rupees(totals.due)} (${payMethod.toUpperCase()}) · Receipt ${r.receiptNo}.`,
                        "ok",
                      );
                    }}
                  >
                    Record Full Payment ({rupees(totals.due)})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      const r = sendPaymentLink(sel.id);
                      toast(
                        r.ok
                          ? "WhatsApp payment link sent."
                          : `Blocked by Send Gate: ${r.detail}`,
                        r.ok ? "ok" : "warn",
                      );
                    }}
                  >
                    Send Payment Link
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setWaiverOpen(true)}
                  >
                    Request Fee Waiver…
                  </button>
                </div>
              </div>
            )}

            {/* Receipts & Refunds */}
            {sel.payments.length > 0 && (
              <div className="pt-3 border-t border-[#E6E7EA] flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#868C98]">
                  RECEIPTS &amp; PAYMENTS
                </div>
                {sel.payments.map((py) => (
                  <div
                    key={py.id}
                    className="flex items-center justify-between text-[12.5px] bg-[#F8F8F6] border border-[#E6E7EA] rounded-lg px-3 py-2"
                  >
                    <div>
                      <span className="font-bold text-[#111315]">{py.receiptNo}</span>
                      <span className="text-[#667085] uppercase ml-1.5">({py.method})</span>
                      {py.refunded && (
                        <span className="chip sm bad ml-2">Refunded</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold tabular-nums">{rupees(py.amount)}</span>
                      {!py.refunded && canMutateBilling && (
                        <button
                          type="button"
                          onClick={() => {
                            refundPayment(sel.id, py.id);
                            toast(`Refunded ${rupees(py.amount)} on ${py.receiptNo}.`, "warn");
                          }}
                          className="text-[11.5px] text-[#B42318] hover:underline cursor-pointer"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {waiverOpen && sel && totals && (
        <RequestWaiverModal
          invoiceId={sel.id}
          invoiceNumber={sel.number}
          defaultDoctorId={sel.doctorId}
          maxAmount={totals.due}
          onClose={() => setWaiverOpen(false)}
          onSubmit={(amount, reason, approverDoctorId) => {
            requestWaiver({
              invoiceId: sel.id,
              amount,
              reason,
              approverDoctorId,
            });
            toast(`Requested ${rupees(amount)} waiver — sent to Approvals.`, "ok");
            setWaiverOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RequestWaiverModal({
  invoiceNumber,
  defaultDoctorId,
  maxAmount,
  onClose,
  onSubmit,
}: {
  invoiceId: string;
  invoiceNumber: number;
  defaultDoctorId: string;
  maxAmount: number;
  onClose: () => void;
  onSubmit: (amount: number, reason: string, approverDoctorId: string) => void;
}) {
  const { state } = useStore();
  const [amount, setAmount] = useState(String(Math.min(300, maxAmount)));
  const [reason, setReason] = useState("Long-time patient courtesy adjustment");
  const [approverDoctorId, setApproverDoctorId] = useState(defaultDoctorId);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal !max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-[18px] text-[#111315] mb-1">
          Request Fee Waiver · Invoice #{invoiceNumber}
        </h2>
        <p className="text-[12.5px] text-[#667085] mb-3.5">
          Front desk and counsellors cannot waive fees directly. A named doctor or owner must
          approve.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Waiver Amount (₹)
            </label>
            <input
              type="number"
              className="w-full tabular-nums"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Approving Doctor
            </label>
            <select
              className="w-full"
              value={approverDoctorId}
              onChange={(e) => setApproverDoctorId(e.target.value)}
            >
              {state!.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Reason for Waiver
            </label>
            <input
              className="w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#F0F1F3]">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              disabled={!reason.trim() || Number(amount) <= 0}
              onClick={() => onSubmit(Number(amount), reason.trim(), approverDoctorId)}
            >
              Send for Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
