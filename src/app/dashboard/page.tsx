"use client";

import { useState } from "react";
import Link from "next/link";
import { MdOutlineLightbulb, MdOutlineShield, MdOutlineChatBubbleOutline } from "react-icons/md";
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

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  const weeklyDays = DAY_NAMES.map((day, dow) => {
    const dayAppts = scopedAppts.filter(
      (a) => a.status !== "cancelled" && new Date(a.start).getDay() === dow,
    );
    const completed = dayAppts.filter((a) => a.status === "completed").length;
    const booked = dayAppts.filter((a) => a.status !== "completed").length;
    const inquiry = state.conversations.filter(
      (c) => c.lastInboundAt && new Date(c.lastInboundAt).getDay() === dow,
    ).length;
    return { day, completed, booked, inquiry };
  });

  const openHandoffs = state.handoffs.filter((h) => h.status === "open").length;
  const highPriorityHandoffs = state.handoffs.filter(
    (h) => h.status === "open" && h.priority === "high",
  ).length;
  const openSteps = state.nextSteps.filter((n) => n.status === "open").length;
  const pendingWaivers = state.waivers.filter((w) => w.status === "pending").length;
  const paidInvoicesCount = state.invoices.filter((i) =>
    filterDocId ? i.doctorId === filterDocId && i.status === "paid" : i.status === "paid",
  ).length;
  const unpaidInvoicesCount = state.invoices.filter((i) =>
    filterDocId ? i.doctorId === filterDocId && i.status !== "paid" : i.status !== "paid",
  ).length;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            OVERVIEW · {state.settings.clinicName.toUpperCase()}
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Dashboard
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            {isFunnelOnly
              ? "New-patient funnel, recall progress, and WhatsApp message costs."
              : "Collections, pending bills, new-patient funnel, and doctor load."}
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
                All doctors
              </button>
              <button
                type="button"
                onClick={() => setScope("mine")}
                className={`seg-btn ${scope === "mine" ? "active" : ""}`}
              >
                My patients
              </button>
            </div>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const rows = [
                isFunnelOnly
                  ? ["Doctor", "Specialty", "Booked Visits", "Completed Visits"]
                  : ["Doctor", "Specialty", "Booked Visits", "Completed Visits", "Collected (INR)"],
                ...state.doctors.map((d) => {
                  const docAppts = state.appointments.filter(
                    (a) => a.doctorId === d.id && a.status !== "cancelled",
                  );
                  const docDone = docAppts.filter((a) => a.status === "completed").length;
                  const docCollected = state.invoices
                    .filter((inv) => inv.doctorId === d.id)
                    .reduce((s, inv) => s + invoiceTotals(inv, state.waivers).paid, 0);
                  return isFunnelOnly
                    ? [d.name, d.specialty, String(docAppts.length), String(docDone)]
                    : [
                        d.name,
                        d.specialty,
                        String(docAppts.length),
                        String(docDone),
                        String(docCollected),
                      ];
                }),
              ];
              const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "clinicdesk-summary.csv";
              link.click();
              URL.revokeObjectURL(url);
              toast("Downloaded clinicdesk-summary.csv.", "ok");
            }}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isFunnelOnly ? (
          <>
            <KpiCard
              label="NEW PATIENT LEADS"
              value={newDeals.length}
              sublabel="On the new-patient board"
              trend={`${newDeals.filter((d) => d.stage === "Booked" || d.stage === "Showed").length} booked/showed`}
              trendTone="info"
              icon={KpiIcons.users}
            />
            <KpiCard
              label="OPEN NEXT STEPS"
              value={openSteps}
              sublabel="Follow-ups & recalls due"
              trend={openSteps > 0 ? "Needs follow-up" : "Clear"}
              trendTone={openSteps > 0 ? "warn" : "ok"}
              icon={KpiIcons.note}
            />
          </>
        ) : (
          <>
            <KpiCard
              label="COLLECTED"
              value={rupees(collected)}
              sublabel={
                waivedTotal > 0
                  ? `After ${rupees(waivedTotal)} in approved waivers`
                  : "Across all recorded receipts"
              }
              trend={`${paidInvoicesCount} paid`}
              trendTone="ok"
              icon={KpiIcons.rupee}
            />
            <KpiCard
              label="PENDING DUES"
              value={rupees(due)}
              sublabel="Unpaid or part-paid bills"
              trend={due > 0 ? `${unpaidInvoicesCount} open` : "Clear"}
              trendTone={due > 0 ? "warn" : "ok"}
              icon={KpiIcons.note}
            />
          </>
        )}
        <KpiCard
          label="VISITS COMPLETED"
          value={completedVisits}
          sublabel={`Of ${scheduledVisits} non-cancelled visits`}
          trend={`${scheduledVisits ? Math.round((completedVisits / scheduledVisits) * 100) : 0}% done`}
          trendTone="ok"
          icon={KpiIcons.check}
        />
        <KpiCard
          label="WHATSAPP SPEND"
          value={rupeesPaise(waTotal)}
          sublabel={`${waMkt} marketing · ${waUtil} utility · ${waService} free`}
          trend="Meta India tariff"
          trendTone="neutral"
          icon={KpiIcons.message}
        />
      </div>

      {/* Middle 12-Column Row: Weekly Stacked Chart + New Patient Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7">
          <WeeklyStackedChart
            days={weeklyDays}
            totalLabel={`${scheduledVisits} Visits`}
            deltaLabel={`${completedVisits} completed`}
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
              Where first-time patients sit between enquiry and completed treatment.
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

      {/* Bottom 12-Column Row: By Doctor Table + Clinic Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Columns: By Doctor */}
        <div className="lg:col-span-7 card !p-0 overflow-hidden">
          <div className="p-5 pb-3.5 border-b border-[#E6E7EA] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                BY DOCTOR &amp; SITE
              </div>
              <p className="text-[12.5px] text-[#667085] mt-0.5">
                {isFunnelOnly
                  ? "Booked and completed visits per doctor"
                  : "Booked visits, completed visits, and collected amount per doctor"}
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
                  <th>Done</th>
                  {!isFunnelOnly && <th>Collected</th>}
                  <th>Completion</th>
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
                  const docCollected = state.invoices
                    .filter((inv) => inv.doctorId === d.id)
                    .reduce((s, inv) => s + invoiceTotals(inv, state.waivers).paid, 0);

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
                      {!isFunnelOnly && (
                        <td className="tabular-nums font-semibold text-[#111315]">
                          {rupees(docCollected)}
                        </td>
                      )}
                      <td className="w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#F2F3F5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#18181B] rounded-full transition-all"
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

        {/* Right 5 Columns: Operational Summary */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                OPEN WORK ACROSS THE DESK
              </span>
              <span className="chip sm no-dot">Today</span>
            </div>

            <div className="flex flex-col divide-y divide-[#F0F1F3]">
              <div className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                <span className="text-[#B54708] inline-flex items-center justify-center shrink-0 mt-0.5">
                  <MdOutlineLightbulb size={17} />
                </span>
                <div>
                  <div className="font-semibold text-[13px] text-[#111315]">
                    {openSteps} open next steps &amp; recalls
                  </div>
                  <div className="text-[12px] text-[#667085] mt-0.5">
                    Second sittings, crown fittings, stitch removals, and 6-month check-ups waiting
                    for a confirmed slot.
                  </div>
                </div>
              </div>

              <div className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                <span className="text-[#067647] inline-flex items-center justify-center shrink-0 mt-0.5">
                  <MdOutlineShield size={17} />
                </span>
                <div>
                  <div className="font-semibold text-[13px] text-[#111315]">
                    {openHandoffs} open handoffs ({highPriorityHandoffs} urgent) · {pendingWaivers}{" "}
                    pending waivers
                  </div>
                  <div className="text-[12px] text-[#667085] mt-0.5">
                    Chats where the AI stepped back for pain/swelling (H1), price talk (H5), or
                    records requests (H8).
                  </div>
                </div>
              </div>

              <div className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                <span className="text-[#175CD3] inline-flex items-center justify-center shrink-0 mt-0.5">
                  <MdOutlineChatBubbleOutline size={17} />
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-[13px] text-[#111315]">
                    WhatsApp message breakdown
                  </div>
                  <div className="text-[12px] text-[#667085] mt-0.5">
                    Utility ({rupeesPaise(RATES.utility)}): {waUtil} sent · Marketing (
                    {rupeesPaise(RATES.marketing)}): {waMkt} sent · 24h free replies (₹0):{" "}
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
