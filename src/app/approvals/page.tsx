"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { doctorName, staffName } from "@/lib/selectors";
import { ago, rupees } from "@/lib/format";
import { Avatar, KpiCard, KpiIcons } from "@/components/ui";

export default function ApprovalsPage() {
  const { state, user, role, decideWaiver, toast } = useStore();

  if (!state || !user) return null;

  const pending = state.waivers.filter((w) => w.status === "pending");
  const decided = state.waivers.filter((w) => w.status !== "pending");
  const approvedValue = state.waivers
    .filter((w) => w.status === "approved")
    .reduce((s, w) => s + w.amount, 0);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            BILLING · FEE WAIVERS
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Approvals
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            Fee waiver requests. Only the named doctor or the clinic owner decides.
          </p>
        </div>

        <Link href="/billing" className="btn-ghost">
          Open Billing &amp; Invoices ›
        </Link>
      </div>

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="PENDING APPROVAL"
          value={pending.length}
          sublabel="Waiting on doctor / owner"
          trend={pending.length > 0 ? "Needs decision" : "Clear"}
          trendTone={pending.length > 0 ? "warn" : "ok"}
          icon={KpiIcons.hourglass}
        />
        <KpiCard
          label="APPROVED WAIVERS"
          value={state.waivers.filter((w) => w.status === "approved").length}
          sublabel="Logged on patient invoices"
          trend="Audited"
          trendTone="ok"
          icon={KpiIcons.check}
        />
        <KpiCard
          label="TOTAL WAIVED VALUE"
          value={rupees(approvedValue)}
          sublabel="Shown as 'Fee waived ₹X'"
          trend="Transparent"
          trendTone="neutral"
          icon={KpiIcons.rupee}
        />
        <KpiCard
          label="DECLINED"
          value={state.waivers.filter((w) => w.status === "declined").length}
          sublabel="Full clinical charge retained"
          trend="Enforced"
          trendTone="neutral"
          icon={KpiIcons.note}
        />
      </div>

      {/* Main 12-Column Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Columns: Pending Queue + Decided Table */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                PENDING WAIVER REQUESTS ({pending.length})
              </span>
            </div>

            <div className="list">
              {pending.map((w) => {
                const inv = state.invoices.find((i) => i.id === w.invoiceId)!;
                const p = state.patients.find((x) => x.id === inv.patientId)!;
                return (
                  <div
                    key={w.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar name={p.name} size={38} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[14.5px] text-[#111315]">
                            {p.name}
                          </span>
                          <span className="chip sm no-dot">Invoice #{inv.number}</span>
                          <span className="chip sm warn">Waive {rupees(w.amount)}</span>
                        </div>
                        <div className="text-[13px] text-[#525866] mt-0.5">
                          Reason: &ldquo;{w.reason}&rdquo;
                        </div>
                        <div className="text-[11.5px] text-[#868C98] mt-0.5">
                          Requested by {staffName(state, w.requestedBy)} · Needs{" "}
                          <strong className="text-[#111315]">
                            {doctorName(state, w.approverDoctorId)}
                          </strong>{" "}
                          · {ago(w.createdAt)}
                        </div>
                      </div>
                    </div>

                    {role === "owner" ||
                    (role === "doctor" && user.doctorId === w.approverDoctorId) ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            decideWaiver(w.id, true, "app");
                            toast(
                              `Approved: Fee waived ${rupees(w.amount)}, approved by ${doctorName(state, w.approverDoctorId)}.`,
                              "ok",
                            );
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => {
                            decideWaiver(w.id, true, "whatsapp");
                            toast("Approved via WhatsApp quick-reply.", "ok");
                          }}
                        >
                          Approve (WA)
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm text-[#B42318]"
                          onClick={() => {
                            decideWaiver(w.id, false, "app");
                            toast("Waiver request declined.", "warn");
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="chip sm no-dot shrink-0">
                        Read-only · Needs {doctorName(state, w.approverDoctorId)} or Owner
                      </span>
                    )}
                  </div>
                );
              })}

              {pending.length === 0 && (
                <p className="text-[13px] text-[#868C98] py-8 text-center">
                  No pending fee waiver requests.
                </p>
              )}
            </div>
          </div>

          {/* Decided History Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient &amp; Invoice</th>
                  <th>Waiver Amount</th>
                  <th>Reason</th>
                  <th>Approver</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((w) => {
                  const inv = state.invoices.find((i) => i.id === w.invoiceId)!;
                  const p = state.patients.find((x) => x.id === inv.patientId)!;
                  return (
                    <tr key={w.id}>
                      <td>
                        <div className="font-semibold text-[13.5px] text-[#111315]">
                          {p.name}
                        </div>
                        <div className="text-[11.5px] text-[#667085]">
                          Invoice #{inv.number}
                        </div>
                      </td>
                      <td className="tabular-nums font-bold">{rupees(w.amount)}</td>
                      <td className="text-[12.5px] text-[#525866]">{w.reason}</td>
                      <td className="text-[12.5px] text-[#525866]">
                        {doctorName(state, w.approverDoctorId)}
                        {w.via === "whatsapp" ? " (WhatsApp)" : ""}
                      </td>
                      <td>
                        <span
                          className={`chip sm ${
                            w.status === "approved" ? "ok" : "bad"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Columns: Fee Waiver Rules */}
        <div className="lg:col-span-4 card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
              HOW FEE WAIVERS WORK
            </span>
            <span className="chip sm core">Rule</span>
          </div>
          <p className="text-[13px] text-[#525866] leading-relaxed">
            Every waiver keeps the original treatment charge visible on the bill:
          </p>
          <div className="flex flex-col divide-y divide-[#F0F1F3] text-[12.5px] text-[#111315]">
            <div className="py-2.5 first:pt-0 last:pb-0">
              <div className="font-bold">1. Never call a waiver &ldquo;Free&rdquo;</div>
              <div className="text-[#667085] mt-0.5">
                The bill records the full charge and a separate line reading:{" "}
                <em>&ldquo;Fee waived ₹X, approved by Dr Y&rdquo;</em>.
              </div>
            </div>
            <div className="py-2.5 first:pt-0 last:pb-0">
              <div className="font-bold">2. Named doctor or owner decides</div>
              <div className="text-[#667085] mt-0.5">
                Front desk and counsellors can request a waiver, but only the named doctor or the
                owner can approve it.
              </div>
            </div>
            <div className="py-2.5 first:pt-0 last:pb-0">
              <div className="font-bold">3. H5 price &amp; discount handoff</div>
              <div className="text-[#667085] mt-0.5">
                When a patient asks for a discount on WhatsApp, Rule H5 stops the AI and passes the
                chat to the counsellor.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
