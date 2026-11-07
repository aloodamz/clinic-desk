"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { doctorName, STAGE_LABEL, stepStage } from "@/lib/selectors";
import { diffDays, fmtDate, todayKey } from "@/lib/format";
import { Avatar, KpiCard, KpiIcons } from "@/components/ui";
import type { NextStep, NextStepStatus } from "@/lib/types";

const STAGE_CHIP: Record<string, string> = {
  close_due: "bad",
  call_task: "warn",
  due_today: "warn",
  slots_due: "info",
  slots_sent: "info",
  reminder_sent: "ok",
  booked: "ok",
  done: "ok",
  closed: "no-dot",
};

export default function FollowUpsPage() {
  const {
    state,
    user,
    role,
    sendStepSlots,
    sendStepReminder,
    markCallDone,
    setStepStatus,
    toast,
  } = useStore();

  const [statusFilter, setStatusFilter] = useState<"open" | NextStepStatus | "all">("open");
  const [docFilter, setDocFilter] = useState<string>("all");
  const [closingStep, setClosingStep] = useState<NextStep | null>(null);

  if (!state || !user) return null;

  const scoped = state.nextSteps
    .filter((s) => (role === "doctor" && user.doctorId ? s.doctorId === user.doctorId : true))
    .filter((s) => (docFilter === "all" ? true : s.doctorId === docFilter));

  const openList = scoped.filter((s) => s.status === "open");
  const overdueList = openList.filter((s) => diffDays(s.dueDate, todayKey()) > 0);
  const bookedList = scoped.filter((s) => s.status === "booked");
  const doneList = scoped.filter((s) => s.status === "done");

  const list = scoped
    .filter((s) => (statusFilter === "all" ? true : s.status === statusFilter))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            CONSULTING ROOM · NEXT STEPS &amp; RECALLS
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Follow-ups
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            Next steps set at the end of a visit: two slots 2 days before due, a reminder on the
            due date, a call task at Day +3, and closure at Day +14.
          </p>
        </div>

        {role !== "doctor" && (
          <select
            aria-label="Filter by doctor"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="text-[13px] bg-white"
          >
            <option value="all">All Doctors</option>
            {state.doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="OPEN NEXT STEPS"
          value={openList.length}
          sublabel="Waiting to be booked"
          trend={overdueList.length > 0 ? `${overdueList.length} overdue` : "On track"}
          trendTone={overdueList.length > 0 ? "warn" : "ok"}
          icon={KpiIcons.calendar}
        />
        <KpiCard
          label="OVERDUE"
          value={overdueList.length}
          sublabel="Past target due date"
          trend={overdueList.length > 0 ? "Call needed" : "Zero overdue"}
          trendTone={overdueList.length > 0 ? "bad" : "ok"}
          icon={KpiIcons.alert}
        />
        <KpiCard
          label="BOOKED"
          value={bookedList.length}
          sublabel="Slot confirmed on calendar"
          trend="Converted"
          trendTone="ok"
          icon={KpiIcons.check}
        />
        <KpiCard
          label="COMPLETED"
          value={doneList.length}
          sublabel="Treatment step finished"
          trend="Closed loop"
          trendTone="neutral"
          icon={KpiIcons.users}
        />
      </div>

      {/* Filter Bar + Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="p-4 border-b border-[#E6E7EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="seg-group flex-wrap">
            {(
              [
                { id: "open", label: `Open (${openList.length})` },
                { id: "booked", label: `Booked (${bookedList.length})` },
                { id: "done", label: `Done (${doneList.length})` },
                {
                  id: "closed",
                  label: `Closed (${scoped.filter((s) => s.status === "closed").length})`,
                },
                { id: "all", label: `All (${scoped.length})` },
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

          <div className="text-[12px] text-[#667085]">
            Ladder stages: <span className="font-semibold text-[#111315]">-2d Slots</span> ·{" "}
            <span className="font-semibold text-[#111315]">0d Reminder</span> ·{" "}
            <span className="font-semibold text-[#111315]">+3d Call</span> ·{" "}
            <span className="font-semibold text-[#111315]">+14d Close</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Next Clinical Step</th>
                <th>Doctor</th>
                <th>Due Date</th>
                <th>Ladder Stage</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const p = state.patients.find((x) => x.id === s.patientId)!;
                const stage = stepStage(s);
                const overdueDays = diffDays(s.dueDate, todayKey());

                return (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.name} size={32} />
                        <div>
                          <Link
                            href={`/patients?id=${p.id}`}
                            className="font-semibold text-[13.5px] text-[#111315] hover:underline block"
                          >
                            {p.name}
                          </Link>
                          <div className="text-[11.5px] text-[#667085] tabular-nums">
                            {p.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold text-[13.5px] text-[#111315]">{s.label}</div>
                      {s.closeReason && (
                        <div className="text-[11.5px] text-[#667085]">
                          Reason: {s.closeReason}
                        </div>
                      )}
                    </td>
                    <td className="text-[13px] text-[#525866]">
                      {doctorName(state, s.doctorId)}
                    </td>
                    <td>
                      <div className="tabular-nums font-medium text-[13px] text-[#111315]">
                        {fmtDate(s.dueDate)}
                      </div>
                      {s.status === "open" && overdueDays > 0 && (
                        <span className="text-[11px] font-semibold text-[#B42318]">
                          Overdue by {overdueDays}d
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`chip sm ${STAGE_CHIP[stage] ?? "no-dot"}`}>
                        {STAGE_LABEL[stage]}
                      </span>
                    </td>
                    <td className="text-right">
                      {s.status === "open" ? (
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => {
                              const r = sendStepSlots(s.id);
                              toast(
                                r.ok
                                  ? `Sent 2 slots to ${p.name}.`
                                  : `Blocked: ${r.detail}`,
                                r.ok ? "ok" : "warn",
                              );
                            }}
                          >
                            Send 2 Slots
                          </button>
                          {stage === "due_today" && (
                            <button
                              type="button"
                              className="btn-ghost btn-sm"
                              onClick={() => {
                                const r = sendStepReminder(s.id);
                                toast(
                                  r.ok ? "Due reminder sent." : `Blocked: ${r.detail}`,
                                  r.ok ? "ok" : "warn",
                                );
                              }}
                            >
                              Remind
                            </button>
                          )}
                          {stage === "call_task" && (
                            <button
                              type="button"
                              className="btn-ghost btn-sm"
                              onClick={() => {
                                markCallDone(s.id);
                                toast(`Logged follow-up call for ${p.name}.`, "ok");
                              }}
                            >
                              Mark Called
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => {
                              setStepStatus(s.id, "done");
                              toast(`Marked "${s.label}" done.`, "ok");
                            }}
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-xs text-[#667085]"
                            onClick={() => setClosingStep(s)}
                          >
                            Close…
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#868C98] capitalize">
                          {s.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[#868C98] py-10">
                    No follow-ups match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {closingStep && (
        <CloseStepModal
          step={closingStep}
          onClose={() => setClosingStep(null)}
        />
      )}
    </div>
  );
}

function CloseStepModal({
  step,
  onClose,
}: {
  step: NextStep;
  onClose: () => void;
}) {
  const { setStepStatus, toast } = useStore();
  const [reason, setReason] = useState("Patient completed treatment elsewhere");

  function submit() {
    if (!reason.trim()) return;
    setStepStatus(step.id, "closed", reason.trim());
    toast(`Follow-up closed with reason: "${reason.trim()}".`, "ok");
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal !max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-[18px] text-[#111315] mb-1">
          Close Follow-up Step
        </h2>
        <p className="text-[12.5px] text-[#667085] mb-3.5">
          Every unbooked follow-up must be closed with an auditable reason.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Close Reason
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
              disabled={!reason.trim()}
              onClick={submit}
            >
              Close Follow-up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
