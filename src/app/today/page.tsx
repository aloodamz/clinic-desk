"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdClose, MdOutlineWarningAmber } from "react-icons/md";
import { useStore } from "@/lib/store";
import { chairName, clash, doctorName } from "@/lib/selectors";
import { addDays, dayKey, fmtDay, fmtTime, fmtTime12, ist, rupees, todayKey } from "@/lib/format";
import { TREATMENTS, treatmentCost, treatmentMinutes } from "@/lib/dentalPack";
import { Avatar, DateStrip, KpiCard, KpiIcons, PackedActivityChart } from "@/components/ui";
import type { Appointment, ApptStatus } from "@/lib/types";

const STATUS_CHIP: Record<ApptStatus, { label: string; cls: string }> = {
  booked: { label: "Booked", cls: "" },
  confirmed: { label: "Confirmed", cls: "info" },
  checked_in: { label: "Waiting", cls: "warn" },
  in_chair: { label: "In Progress", cls: "info" },
  completed: { label: "Completed", cls: "ok" },
  no_show: { label: "No-show", cls: "bad" },
  cancelled: { label: "Cancelled", cls: "bad" },
};

export default function TodayPage() {
  const router = useRouter();
  const {
    state,
    user,
    role,
    setApptStatus,
    toggleConfirmCall,
    markNoShow,
    toast,
  } = useStore();

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [docFilter, setDocFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [endingAppt, setEndingAppt] = useState<Appointment | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  if (!state || !user) return null;

  // Count appointments by date for DateStrip dots
  const countsByDate: Record<string, number> = {};
  for (const a of state.appointments) {
    if (a.status !== "cancelled") {
      const k = dayKey(a.start);
      countsByDate[k] = (countsByDate[k] ?? 0) + 1;
    }
  }

  const dayAppts = state.appointments
    .filter((a) => dayKey(a.start) === selectedDate)
    .filter((a) => (role === "doctor" && user.doctorId ? a.doctorId === user.doctorId : true))
    .filter((a) => (docFilter === "all" ? true : a.doctorId === docFilter))
    .sort((a, b) => a.start.localeCompare(b.start));

  const filteredAppts = dayAppts.filter((a) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "waiting") return a.status === "checked_in" || a.status === "in_chair";
    if (statusFilter === "upcoming") return a.status === "booked" || a.status === "confirmed";
    if (statusFilter === "done") return a.status === "completed";
    return true;
  });

  const booked = dayAppts.filter((a) => a.status !== "cancelled").length;
  const seen = dayAppts.filter((a) => a.status === "completed").length;
  const waiting = dayAppts.filter((a) => a.status === "checked_in" || a.status === "in_chair").length;

  const tomorrowKey = addDays(todayKey(), 1);
  const tomorrowNewCalls = state.appointments.filter(
    (a) =>
      dayKey(a.start) === tomorrowKey &&
      a.isNewPatient &&
      a.status === "booked" &&
      !a.confirmCallDone,
  );

  const openHandoffs = state.handoffs.filter((h) => h.status === "open");
  const pendingWaivers = state.waivers.filter((w) => w.status === "pending");
  const firstStart = dayAppts[0]?.start;

  // Compute Patient Activity breakdown for PackedActivityChart
  const totalDay = Math.max(1, dayAppts.length);
  const procCount = dayAppts.filter((a) =>
    /root canal|crown|implant|extraction|wisdom|filling/i.test(a.treatment),
  ).length;
  const consultCount = dayAppts.filter((a) =>
    /consult|braces/i.test(a.treatment),
  ).length;
  const cleanCount = Math.max(0, dayAppts.length - procCount - consultCount);

  const p0 = dayAppts.length > 0 ? Math.round((procCount / totalDay) * 100) : 0;
  const p1 = dayAppts.length > 0 ? Math.round((consultCount / totalDay) * 100) : 0;
  const p2 = dayAppts.length > 0 ? Math.max(0, 100 - p0 - p1) : 0;

  const attentionItems = [
    ...openHandoffs.map((h) => {
      const conv = state.conversations.find((c) => c.id === h.conversationId);
      return {
        id: h.id,
        title: conv?.contactName ?? "Patient thread",
        detail: `${h.rule} · "${h.excerpt}"`,
        badge: `Handoff ${h.rule}`,
        tone: "bad" as const,
        href: "/handoffs",
      };
    }),
    ...pendingWaivers.map((w) => {
      const inv = state.invoices.find((i) => i.id === w.invoiceId);
      const pat = state.patients.find((p) => p.id === inv?.patientId);
      return {
        id: w.id,
        title: pat?.name ?? "Invoice waiver",
        detail: `Waive ${rupees(w.amount)} · ${w.reason}`,
        badge: "Waiver",
        tone: "warn" as const,
        href: "/approvals",
      };
    }),
  ].slice(0, 5);

  const firstName = user.name.replace(/^Dr\.?\s+/i, "").split(" ")[0];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Greeting & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            GOOD MORNING · {state.sites[0]?.name.toUpperCase()}
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            {firstName}, here is your day
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            {fmtDay(selectedDate)} · {booked} booked
            {firstStart ? ` · first patient at ${fmtTime12(firstStart)}` : " · no appointments scheduled"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {role !== "doctor" && (
            <select
              aria-label="Filter by doctor"
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="text-[13px] font-medium bg-white"
            >
              <option value="all">All Doctors ({state.doctors.length})</option>
              {state.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.specialty}
                </option>
              ))}
            </select>
          )}
          {role !== "counsellor" && role !== "assistant" && (
            <button
              type="button"
              className="btn"
              onClick={() => setBookingOpen(true)}
            >
              + Book Visit
            </button>
          )}
        </div>
      </div>

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="BOOKED"
          value={booked}
          sublabel="Not cancelled today"
          trend={`${dayAppts.filter((a) => a.isNewPatient).length} new`}
          trendTone="ok"
          icon={KpiIcons.calendar}
        />
        <KpiCard
          label="SEEN"
          value={seen}
          sublabel="Consultations closed"
          trend={`${booked ? Math.round((seen / booked) * 100) : 0}% done`}
          trendTone="neutral"
          icon={KpiIcons.check}
        />
        <KpiCard
          label="WAITING"
          value={waiting}
          sublabel="Checked in & in chair"
          trend={waiting > 0 ? "Active now" : "Clear"}
          trendTone={waiting > 0 ? "warn" : "ok"}
          icon={KpiIcons.hourglass}
        />
        <KpiCard
          label="NEEDS ACTION"
          value={openHandoffs.length + pendingWaivers.length}
          sublabel="Handoffs & fee waivers"
          trend={openHandoffs.length > 0 ? `${openHandoffs.length} open` : "All clear"}
          trendTone={openHandoffs.length > 0 ? "bad" : "ok"}
          icon={KpiIcons.alert}
          onClick={() => router.push("/handoffs")}
        />
      </div>

      {/* Main 12-Column Split Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Columns: DateStrip + Schedule Table + Doctor Shift Strip */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="card !p-0 overflow-hidden">
            {/* Schedule Header + Medoria DateStrip */}
            <div className="p-4 pb-3.5 border-b border-[#E6E7EA] flex flex-col gap-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                    CHAIR SCHEDULE
                  </span>
                  <span className="chip sm no-dot tabular-nums">{filteredAppts.length} visits</span>
                </div>

                <div className="seg-group self-start">
                  {[
                    { id: "all", label: "All" },
                    { id: "waiting", label: "Waiting / In Chair" },
                    { id: "upcoming", label: "Booked" },
                    { id: "done", label: "Completed" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`seg-btn ${statusFilter === tab.id ? "active" : ""}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <DateStrip
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                countsByDate={countsByDate}
              />
            </div>

            {/* Pulse Clinic Schedule Table */}
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Patient &amp; Time</th>
                    <th>Type / Reason</th>
                    <th>Status</th>
                    <th>Room / Doctor</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppts.map((a) => {
                    const p = state.patients.find((x) => x.id === a.patientId)!;
                    const st = STATUS_CHIP[a.status];
                    const endIso = new Date(
                      new Date(a.start).getTime() + a.durationMin * 60000,
                    ).toISOString();
                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={p.name} size={34} />
                            <div>
                              <Link
                                href={`/patients?id=${p.id}`}
                                className="font-semibold text-[13.5px] text-[#111315] hover:underline leading-snug block"
                              >
                                {p.name}
                              </Link>
                              <div className="text-[11.5px] text-[#868C98] font-mono tabular-nums">
                                {fmtTime(a.start)} – {fmtTime(endIso)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-[13.5px] text-[#111315]">
                            {a.isNewPatient ? `New patient · ${a.treatment}` : a.treatment}
                          </div>
                          {p.notes && (
                            <div className="text-[12px] text-[#667085] truncate max-w-[210px]">
                              {p.notes}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`chip sm ${st.cls}`}>{st.label}</span>
                        </td>
                        <td>
                          <div className="text-[13px] font-medium text-[#111315]">
                            {a.chairId ? chairName(state, a.chairId) : "Hospital OT"}
                          </div>
                          <div className="text-[11.5px] text-[#667085]">
                            {doctorName(state, a.doctorId)}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {(a.status === "booked" || a.status === "confirmed") && (
                              <>
                                <button
                                  type="button"
                                  className="btn-ghost btn-sm"
                                  onClick={() => {
                                    setApptStatus(a.id, "checked_in");
                                    toast(`${p.name} checked in.`, "ok");
                                  }}
                                >
                                  Check in
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost btn-xs text-[#667085]"
                                  title="Mark no-show & send 2 reschedule slots"
                                  onClick={() => {
                                    const r = markNoShow(a.id);
                                    toast(
                                      r.ok
                                        ? "Marked no-show · 2 new slots sent on WhatsApp."
                                        : `Marked no-show (WhatsApp blocked: ${r.detail}).`,
                                      "warn",
                                    );
                                  }}
                                >
                                  No-show
                                </button>
                              </>
                            )}
                            {a.status === "checked_in" && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => {
                                  setApptStatus(a.id, "in_chair");
                                  toast(`${p.name} seated in chair.`, "ok");
                                }}
                              >
                                Start
                              </button>
                            )}
                            {a.status === "in_chair" && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setEndingAppt(a)}
                              >
                                End visit…
                              </button>
                            )}
                            {a.status === "completed" && (
                              <Link
                                href={`/patients?id=${p.id}`}
                                className="text-[12px] font-semibold text-[#667085] hover:text-[#111315] px-2 py-1"
                              >
                                Dossier ›
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAppts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-[#868C98] py-10">
                        No appointments match this filter on {fmtDay(selectedDate)}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mitrasehat Doctor Roster & Shift Load Strip */}
          <div className="card">
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                DOCTORS ON DUTY
              </div>
              <span className="text-[12px] text-[#667085]">
                Click a doctor card to filter the schedule
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {state.doctors.map((d) => {
                const docAppts = state.appointments.filter(
                  (a) =>
                    dayKey(a.start) === selectedDate &&
                    a.doctorId === d.id &&
                    a.status !== "cancelled",
                );
                const docDone = docAppts.filter((a) => a.status === "completed").length;
                const activeFilter = docFilter === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDocFilter(activeFilter ? "all" : d.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      activeFilter
                        ? "bg-[#18181B] text-white border-[#18181B]"
                        : "bg-[#F8F8F6] hover:bg-white border-[#E6E7EA]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={d.name} size={34} />
                      <div className="min-w-0">
                        <div
                          className={`font-semibold text-[13.5px] truncate ${
                            activeFilter ? "text-white" : "text-[#111315]"
                          }`}
                        >
                          {d.name}
                        </div>
                        <div
                          className={`text-[11.5px] truncate ${
                            activeFilter ? "text-zinc-300" : "text-[#667085]"
                          }`}
                        >
                          {d.specialty}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px] pt-1.5 border-t border-current/10">
                      <span className={activeFilter ? "text-zinc-300" : "text-[#525866]"}>
                        {docAppts.length} booked · {docDone} seen
                      </span>
                      {d.visiting ? (
                        <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                          Visiting
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-semibold text-[#067647]">● Active</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Columns: PackedActivityChart + Needs Your Attention + Evening Call Strip */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <PackedActivityChart
            segments={[
              { label: "Procedures", pct: p0, count: procCount, color: "#2D6A4F" },
              { label: "Consultations", pct: p1, count: consultCount, color: "#18181B" },
              { label: "Check-ups", pct: p2, count: cleanCount, color: "#8D99AE" },
            ]}
          />

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                NEEDS YOUR ATTENTION
              </span>
              <Link
                href="/handoffs"
                className="text-[11.5px] font-semibold text-[#525866] hover:text-[#111315]"
              >
                View all ›
              </Link>
            </div>

            <div className="list">
              {attentionItems.map((it) => (
                <Link
                  key={it.id}
                  href={it.href}
                  className="flex items-center justify-between gap-3 hover:bg-[#F8F8F6] -mx-2 px-2 rounded-lg transition"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px] text-[#111315] truncate">
                      {it.title}
                    </div>
                    <div className="text-[12px] text-[#667085] truncate">{it.detail}</div>
                  </div>
                  <span className={`chip sm shrink-0 ${it.tone}`}>{it.badge}</span>
                </Link>
              ))}
              {attentionItems.length === 0 && (
                <p className="text-[13px] text-[#868C98] py-4 text-center">
                  All clear — no open handoffs or pending approvals.
                </p>
              )}
            </div>
          </div>

          {tomorrowNewCalls.length > 0 && (
            <div className="card">
              <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866] mb-1">
                TOMORROW&apos;S NEW PATIENT CALLS
              </div>
              <p className="text-[12px] text-[#667085] mb-3">
                Confirm first-time patients by phone the evening before their visit:
              </p>
              <div className="list">
                {tomorrowNewCalls.map((a) => {
                  const p = state.patients.find((x) => x.id === a.patientId)!;
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-[13px] text-[#111315] truncate">
                          {p.name}
                        </div>
                        <div className="text-[11.5px] text-[#667085]">
                          {fmtTime12(a.start)} · {a.treatment}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost btn-xs shrink-0"
                        onClick={() => {
                          toggleConfirmCall(a.id);
                          toast(`Marked confirmation call done for ${p.name}.`, "ok");
                        }}
                      >
                        Mark Called
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {endingAppt && (
        <EndVisitModal appt={endingAppt} onClose={() => setEndingAppt(null)} />
      )}
      {bookingOpen && (
        <NewBookingModal
          defaultDate={selectedDate}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  );
}

function EndVisitModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { state, endVisit, toast } = useStore();
  const patient = state!.patients.find((p) => p.id === appt.patientId)!;

  const [stepLabel, setStepLabel] = useState(
    appt.treatment === "Root canal" ? "Crown fitting" : "Review",
  );
  const [stepDays, setStepDays] = useState("7");
  const [noMoreVisits, setNoMoreVisits] = useState(false);

  function submit() {
    const steps = noMoreVisits || !stepLabel.trim()
      ? []
      : [{ label: stepLabel.trim(), days: Number(stepDays) || 7 }];
    endVisit(appt.id, steps, noMoreVisits);
    toast(
      `Visit completed for ${patient.name} · Draft invoice & WhatsApp summary created.`,
      "ok",
    );
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal !max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#868C98]">
              End-of-Visit Checkout (4-Step Automation)
            </div>
            <h2 className="font-bold text-[18px] text-[#111315] mt-0.5">
              {patient.name} · {appt.treatment}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[#E6E7EA] text-[#667085] hover:text-[#111315] inline-flex items-center justify-center cursor-pointer"
          >
            <MdClose size={15} />
          </button>
        </div>

        <label className="flex items-center gap-2 text-[13px] font-medium text-[#111315] mb-3.5 p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA] cursor-pointer">
          <input
            type="checkbox"
            checked={noMoreVisits}
            onChange={(e) => setNoMoreVisits(e.target.checked)}
          />
          <span>Treatment finished — no more visits needed (only 6m recall)</span>
        </label>

        {!noMoreVisits && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">
                Next Clinical Step
              </label>
              <input
                className="w-full"
                value={stepLabel}
                onChange={(e) => setStepLabel(e.target.value)}
                placeholder="e.g. Crown prep, Stitch removal, Second sitting"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">
                Due In (Days)
              </label>
              <input
                type="number"
                className="w-full tabular-nums"
                value={stepDays}
                onChange={(e) => setStepDays(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="bg-[#F8F8F6] border border-[#E6E7EA] rounded-xl p-3 mb-4 text-[12px] text-[#525866] flex flex-col gap-1">
          <div className="font-semibold text-[#111315]">Automated Post-Visit Workflow:</div>
          <div>1. Marks appointment Completed</div>
          <div>2. Creates draft Invoice ({rupees(treatmentCost(appt.treatment))})</div>
          <div>3. Sends visit summary &amp; aftercare steps via WhatsApp (checked by Send Gate)</div>
          <div>4. Adds next step to Follow-ups &amp; Pipeline board</div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={submit}>
            Complete Visit
          </button>
        </div>
      </div>
    </div>
  );
}

function NewBookingModal({
  defaultDate,
  onClose,
}: {
  defaultDate: string;
  onClose: () => void;
}) {
  const { state, bookAppointment, toast } = useStore();
  const [patientId, setPatientId] = useState(state!.patients[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(state!.doctors[0]?.id ?? "d_khan");
  const [chairId, setChairId] = useState(state!.chairs[0]?.id ?? "c1");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:30");
  const [treatment, setTreatment] = useState("Consultation");
  const [durationMin, setDurationMin] = useState(treatmentMinutes("Consultation"));

  const startIso = ist(date, time);
  const conflict = clash(state!, {
    doctorId,
    chairId,
    start: startIso,
    durationMin,
  });

  function handleTreatmentChange(val: string) {
    setTreatment(val);
    setDurationMin(treatmentMinutes(val));
  }

  function submit() {
    if (!patientId) return;
    const siteId = state!.doctors.find((d) => d.id === doctorId)?.siteIds[0] ?? "s_clinic";
    const res = bookAppointment({
      patientId,
      doctorId,
      chairId,
      siteId,
      start: startIso,
      treatment,
      durationMin,
    });
    if (!res.ok) {
      toast("Double-booking prevented: Doctor or Chair is already busy at that time.", "bad");
      return;
    }
    toast("Appointment booked & WhatsApp confirmation sent.", "ok");
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#868C98]">
              Front Desk &amp; Chair Scheduling
            </div>
            <h2 className="font-bold text-[18px] text-[#111315] mt-0.5">Book New Visit</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[#E6E7EA] text-[#667085] hover:text-[#111315] inline-flex items-center justify-center cursor-pointer"
          >
            <MdClose size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">Patient</label>
            <select
              className="w-full"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              {state!.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">Doctor</label>
              <select
                className="w-full"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                {state!.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">Chair</label>
              <select
                className="w-full"
                value={chairId}
                onChange={(e) => setChairId(e.target.value)}
              >
                {state!.chairs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">Date</label>
              <input
                type="date"
                className="w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">Time</label>
              <input
                type="time"
                className="w-full"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                step={10}
                className="w-full"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value) || 30)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Treatment / Procedure
            </label>
            <select
              className="w-full"
              value={treatment}
              onChange={(e) => handleTreatmentChange(e.target.value)}
            >
              {TREATMENTS.map((k) => (
                <option key={k} value={k}>
                  {k} ({treatmentMinutes(k)}m · {rupees(treatmentCost(k))})
                </option>
              ))}
            </select>
          </div>

          {conflict && (
            <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium flex items-start gap-1.5">
              <MdOutlineWarningAmber size={15} className="mt-[1px] shrink-0" />
              <span>
                Schedule Conflict: {doctorName(state!, conflict.doctorId)} or{" "}
                {chairName(state!, conflict.chairId)} already has a {conflict.treatment} visit at{" "}
                {fmtTime12(conflict.start)}.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#F0F1F3]">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              disabled={Boolean(conflict)}
              onClick={submit}
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
