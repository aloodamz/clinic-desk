"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { invoiceTotals } from "@/lib/selectors";
import { rupees, rupeesPaise } from "@/lib/format";
import { RATES } from "@/lib/templates";
import { levelFor } from "@/lib/access";
import { Avatar, KpiCard, KpiIcons, WeeklyStackedChart } from "@/components/ui";

const FUNNEL_STAGES = [
  "Enquiry",
  "Qualified",
  "Booked",
  "Showed",
  "Plan given",
  "In treatment",
  "Completed",
];

export default function DashboardPage() {
  const { state, user, role, toast } = useStore();
  const dashAccess = levelFor("dashboard", role);
  const isFunnelOnly = dashAccess === "funnel";
  const isOwnOnly = dashAccess === "own";
  const [scope, setScope] = useState<"all" | "mine">(isOwnOnly ? "mine" : "all");

  if (!state || !user) return null;

  const effectiveScope = isOwnOnly ? "mine" : scope;
  const filterDocId = effectiveScope === "mine" && user.doctorId ? user.doctorId : null;

  let collected = 0;
  let due = 0;
  let waivedTotal = 0;
  for (const inv of state.invoices) {
    if (filterDocId && inv.doctorId !== filterDocId) continue;
    const t = invoiceTotals(inv, state.waivers);
    collected += t.paid;
    due += t.due;
    waivedTotal += t.waived;
  }

  const scopedAppts = state.appointments.filter((a) =>
    filterDocId ? a.doctorId === filterDocId : true,
  );
  const completedVisits = scopedAppts.filter((a) => a.status === "completed").length;
  const scheduledVisits = scopedAppts.filter((a) => a.status !== "cancelled").length;

  // Compute WhatsApp spend from messages
  const sentMsgs = state.conversations
    .flatMap((c) => c.messages)
    .filter((m) => m.dir === "out" && m.status !== "blocked");
  const waTotal = sentMsgs.reduce((s, m) => s + (m.cost ?? 0), 0);
  const waMkt = sentMsgs.filter((m) => m.category === "marketing").length;
  const waUtil = sentMsgs.filter((m) => m.category === "utility").length;
  const waService = sentMsgs.filter((m) => m.category === "service").length;

  const newDeals = state.deals.filter((d) => d.board === "new");
  const maxFunnel = Math.max(
    1,
    ...FUNNEL_STAGES.map((st) => newDeals.filter((d) => d.stage === st).length),
  );

  const weeklyDays = [
    { day: "Sun", completed: 4, booked: 3, inquiry: 2 },
    { day: "Mon", completed: 7, booked: 5, inquiry: 4 },
    { day: "Tue", completed: 11, booked: 6, inquiry: 5 },
    { day: "Wed", completed: 9, booked: 7, inquiry: 4 },
    { day: "Thu", completed: 8, booked: 5, inquiry: 3 },
    { day: "Fri", completed: 6, booked: 4, inquiry: 3 },
    { day: "Sat", completed: 8, booked: 4, inquiry: 2 },
  ];

  const openHandoffs = state.handoffs.filter((h) => h.status === "open").length;
  const resolvedHandoffs = state.handoffs.filter((h) => h.status === "resolved").length;
  const openSteps = state.nextSteps.filter((n) => n.status === "open").length;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Header (Mitrasehat & Medoria style) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            OVERVIEW · EXECUTIVE ANALYTICS
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            Real-time clinic revenue, patient funnel, doctor utilization, and WhatsApp spend.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {user.doctorId && dashAccess === "full" && (
            <div className="seg-group">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`seg-btn ${scope === "all" ? "active" : ""}`}
              >
                Full Clinic
              </button>
              <button
                type="button"
                onClick={() => setScope("mine")}
                className={`seg-btn ${scope === "mine" ? "active" : ""}`}
              >
                My Practice
              </button>
            </div>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => toast("Weekly clinic report exported to CSV.", "ok")}
          >
            ↓ Export Summary
          </button>
        </div>
      </div>

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isFunnelOnly ? (
          <>
            <KpiCard
              label="ACTIVE NEW LEADS"
              value={newDeals.length}
              sublabel="In new-patient conversion funnel"
              trend="Funnel view"
              trendTone="info"
              icon={KpiIcons.users}
              sparkline={[5, 8, 7, 10, 9, 12, Math.max(4, newDeals.length)]}
            />
            <KpiCard
              label="OPEN NEXT STEPS"
              value={openSteps}
              sublabel="Pending recalls & plan follow-ups"
              trend={openSteps > 0 ? "Follow up" : "Clear"}
              trendTone={openSteps > 0 ? "warn" : "ok"}
              icon={KpiIcons.note}
              sparkline={[6, 5, 7, 8, 6, 5, Math.max(2, openSteps)]}
            />
          </>
        ) : (
          <>
            <KpiCard
              label="COLLECTED"
              value={rupees(collected)}
              sublabel={waivedTotal > 0 ? `Net after ${rupees(waivedTotal)} waived` : "Paid across all receipts"}
              trend="+12.4%"
              trendTone="ok"
              icon={KpiIcons.rupee}
              sparkline={[12, 18, 15, 22, 19, 26, 29]}
            />
            <KpiCard
              label="PENDING DUES"
              value={rupees(due)}
              sublabel="Unpaid or part-paid invoices"
              trend={due > 0 ? "Action needed" : "Clear"}
              trendTone={due > 0 ? "warn" : "ok"}
              icon={KpiIcons.note}
              sparkline={[9, 12, 10, 8, 11, 7, 6]}
            />
          </>
        )}
        <KpiCard
          label="VISITS COMPLETED"
          value={completedVisits}
          sublabel={`Out of ${scheduledVisits} scheduled visits`}
          trend="+10.8%"
          trendTone="ok"
          icon={KpiIcons.check}
          sparkline={[4, 6, 5, 8, 7, 9, Math.max(5, completedVisits)]}
        />
        <KpiCard
          label="WHATSAPP SPEND"
          value={rupeesPaise(waTotal)}
          sublabel={`${waMkt} mkt · ${waUtil} util · ${waService} free`}
          trend="24h gated"
          trendTone="neutral"
          icon={KpiIcons.message}
        />
      </div>

      {/* Middle 12-Column Row: Weekly Stacked Chart + New Patient Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7">
          <WeeklyStackedChart
            days={weeklyDays}
            totalLabel={`${scheduledVisits + newDeals.length} Touchpoints`}
            deltaLabel="+10.78% vs last wk"
          />
        </div>

        <div className="lg:col-span-5 card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                NEW PATIENT FUNNEL
              </span>
              <Link
                href="/pipeline"
                className="text-[12px] font-semibold text-[#2563EB] hover:underline"
              >
                Open Pipeline ›
              </Link>
            </div>
            <p className="text-[12.5px] text-[#667085] mb-4">
              Lead progression from first enquiry to completed treatment
            </p>

            <div className="flex flex-col gap-3">
              {FUNNEL_STAGES.map((st, idx) => {
                const items = newDeals.filter((d) => d.stage === st);
                const val = items.reduce((s, d) => s + (d.value || 0), 0);
                const pct = Math.max(10, Math.round((items.length / maxFunnel) * 100));
                return (
                  <div key={st} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="font-semibold text-[#111315]">
                        {idx + 1}. {st}
                      </span>
                      <div className="flex items-center gap-2 tabular-nums">
                        {val > 0 && (
                          <span className="text-[11.5px] text-[#667085]">{rupees(val)}</span>
                        )}
                        <span className="font-bold text-[#111315] w-5 text-right">
                          {items.length}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#F2F3F5] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2563EB] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0F1F3] flex items-center justify-between text-[12px] text-[#525866]">
            <span>Total active new-patient pipeline</span>
            <span className="font-bold text-[#111315] tabular-nums">
              {rupees(newDeals.reduce((s, d) => s + (d.value || 0), 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom 12-Column Row: Doctor Performance Table + Medoria Insights Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Columns: Doctor Performance */}
        <div className="lg:col-span-7 card !p-0 overflow-hidden">
          <div className="p-5 pb-3.5 border-b border-[#E6E7EA] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                DOCTOR UTILIZATION &amp; CHAIR LOAD
              </div>
              <p className="text-[12.5px] text-[#667085] mt-0.5">
                Completed consultations, active bookings, and billed revenue per clinician
              </p>
            </div>
            <Link href="/today" className="btn-ghost btn-sm">
              Schedule ›
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Site</th>
                  <th>Booked</th>
                  <th>Completed</th>
                  <th>Load</th>
                </tr>
              </thead>
              <tbody>
                {state.doctors.map((d) => {
                  const docAppts = state.appointments.filter(
                    (a) => a.doctorId === d.id && a.status !== "cancelled",
                  );
                  const docDone = docAppts.filter((a) => a.status === "completed").length;
                  const pct = docAppts.length
                    ? Math.round((docDone / docAppts.length) * 100)
                    : 0;
                  const site = state.sites.find((s) => s.id === d.siteIds[0]);

                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={d.name} size={32} />
                          <div>
                            <div className="font-semibold text-[13.5px] text-[#111315] flex items-center gap-1.5">
                              <span>{d.name}</span>
                              {d.visiting && (
                                <span className="chip sm no-dot">Visiting</span>
                              )}
                            </div>
                            <div className="text-[11.5px] text-[#667085]">{d.specialty}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-[12.5px] text-[#525866]">
                        {site?.name.split(",")[0] ?? site?.name}
                      </td>
                      <td className="tabular-nums font-semibold">{docAppts.length}</td>
                      <td className="tabular-nums text-[#067647] font-semibold">{docDone}</td>
                      <td className="w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#F2F3F5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#18181B] rounded-full"
                              style={{ width: `${Math.max(15, pct)}%` }}
                            />
                          </div>
                          <span className="text-[11.5px] font-semibold text-[#525866] tabular-nums w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Columns: Medoria Insights Box & WhatsApp Cost Ledger */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                INSIGHTS BOX
              </span>
              <span className="chip sm ok">Real-time</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA] flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#FFFAEB] border border-[#FEDF89] text-[#B54708] inline-flex items-center justify-center shrink-0 text-sm">
                  💡
                </span>
                <div>
                  <div className="font-semibold text-[13px] text-[#111315]">
                    Follow-up Recovery Opportunity
                  </div>
                  <div className="text-[12px] text-[#667085] mt-0.5">
                    {openSteps} patients have open next-step treatments or 6-month recalls waiting
                    to be booked.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA] flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647] inline-flex items-center justify-center shrink-0 text-sm">
                  🛡️
                </span>
                <div>
                  <div className="font-semibold text-[13px] text-[#111315]">
                    H1–H10 Safety Handoff SLA
                  </div>
                  <div className="text-[12px] text-[#667085] mt-0.5">
                    {openHandoffs} open handoffs · {resolvedHandoffs} resolved. AI automatically
                    pauses on clinical risk, fee waiver asks, or voice notes.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA] flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#EFF8FF] border border-[#B2DDFF] text-[#175CD3] inline-flex items-center justify-center shrink-0 text-sm">
                  💬
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-[13px] text-[#111315]">
                    WhatsApp Per-Message Cost Ledger
                  </div>
                  <div className="text-[12px] text-[#667085] mt-0.5">
                    Utility ({rupeesPaise(RATES.utility)}): {waUtil} sent · Marketing (
                    {rupeesPaise(RATES.marketing)}): {waMkt} sent · 24h Service (₹0):{" "}
                    {waService} sent.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
