"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { doctorName } from "@/lib/selectors";
import { FDI, TREATMENTS, treatmentCost } from "@/lib/dentalPack";
import { fmtDate, rupees, uid } from "@/lib/format";
import { Avatar } from "@/components/ui";
import type { PlanStatus } from "@/lib/types";

const STATUS_CHIP: Record<PlanStatus, string> = {
  draft: "no-dot",
  sent: "info",
  partly_accepted: "warn",
  accepted: "ok",
  declined: "bad",
  expired: "bad",
};

export default function PlansPage() {
  const { state, sendEstimate, setPlanItems, unlockEstimate, toast } = useStore();
  const [selId, setSelId] = useState<string | null>(state?.plans[0]?.id ?? null);
  const [selectedTooth, setSelectedTooth] = useState<string>("36");
  const [newProcedure, setNewProcedure] = useState<string>("Root canal");
  const [newCost, setNewCost] = useState<string>(String(treatmentCost("Root canal")));
  const [createOpen, setCreateOpen] = useState(false);

  if (!state) return null;

  const sel = state.plans.find((p) => p.id === selId) ?? state.plans[0] ?? null;
  const selPatient = sel ? state.patients.find((p) => p.id === sel.patientId) : null;
  const teethInPlan = new Set((sel?.items ?? []).map((it) => it.tooth).filter(Boolean));

  function handlePresetSelect(proc: string) {
    setNewProcedure(proc);
    setNewCost(String(treatmentCost(proc)));
  }

  function addItemToPlan() {
    if (!sel) return;
    const next = [
      ...sel.items,
      {
        id: uid("pi"),
        tooth: selectedTooth || undefined,
        treatment: newProcedure,
        cost: Number(newCost) || 0,
      },
    ];
    setPlanItems(sel.id, next);
    toast(`Added ${newProcedure} (tooth ${selectedTooth}) to plan.`, "ok");
  }

  function removeItemFromPlan(itemId: string) {
    if (!sel) return;
    setPlanItems(
      sel.id,
      sel.items.filter((i) => i.id !== itemId),
    );
    toast("Removed item from plan.", "ok");
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            CONSULTING ROOM · FDI CHART &amp; ESTIMATES
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Treatment Plans &amp; Estimates
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            Build multi-tooth treatment plans and share 4-digit OTP-protected estimate links (valid
            14 days, locks after 5 wrong tries).
          </p>
        </div>

        <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
          + New Treatment Plan
        </button>
      </div>

      {/* Master-Detail 12-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 5 Columns: Plans List */}
        <div className="lg:col-span-5 table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient &amp; Plan</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.plans.map((pl) => {
                const p = state.patients.find((x) => x.id === pl.patientId)!;
                const total = pl.items.reduce((s, i) => s + i.cost, 0);
                const active = sel?.id === pl.id;
                return (
                  <tr
                    key={pl.id}
                    onClick={() => setSelId(pl.id)}
                    className={`cursor-pointer ${active ? "active-row" : ""}`}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.name} size={34} />
                        <div>
                          <div className="font-semibold text-[13.5px] text-[#111315]">
                            {p.name}
                          </div>
                          <div className="text-[12px] text-[#667085]">
                            {pl.title} · {pl.items.length} items
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="tabular-nums font-bold text-[#111315]">{rupees(total)}</td>
                    <td>
                      <span className={`chip sm ${STATUS_CHIP[pl.status]}`}>
                        {pl.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right 7 Columns: Plan Detail, FDI Chart & OTP Link */}
        {sel && selPatient && (
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Plan Header Card */}
            <div className="card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar name={selPatient.name} size={42} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-[17px] text-[#111315]">{sel.title}</h2>
                      <span className={`chip sm ${STATUS_CHIP[sel.status]}`}>
                        {sel.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#667085] mt-0.5">
                      {selPatient.name} · {doctorName(state, sel.doctorId)} · Created{" "}
                      {fmtDate(sel.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      const est = sendEstimate(sel.id);
                      toast(
                        est.res.ok
                          ? `Estimate link sent · 4-digit code: ${est.code}`
                          : `Estimate created (code ${est.code}), WhatsApp blocked: ${est.res.detail}`,
                        est.res.ok ? "ok" : "warn",
                      );
                    }}
                  >
                    {sel.estimate ? "Resend Estimate Link" : "Send Estimate Link"}
                  </button>
                </div>
              </div>

              {/* OTP Estimate Link Box */}
              {sel.estimate && (
                <div className="bg-[#F8F8F6] border border-[#E6E7EA] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[12.5px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#111315]">
                        Patient Portal: /e/{sel.estimate.token}
                      </span>
                      <span className="chip sm core">OTP Code: {sel.estimate.code}</span>
                      {sel.estimate.locked && (
                        <span className="chip sm bad">Locked (5 wrong tries)</span>
                      )}
                    </div>
                    <div className="text-[#667085] text-[11.5px] mt-0.5">
                      Valid until {fmtDate(sel.estimate.validUntil)} · Attempts:{" "}
                      {sel.estimate.attempts}/5
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sel.estimate.locked && (
                      <button
                        type="button"
                        className="btn-ghost btn-xs"
                        onClick={() => {
                          unlockEstimate(sel.id);
                          toast("Estimate link unlocked & attempt counter reset.", "ok");
                        }}
                      >
                        Unlock Link
                      </button>
                    )}
                    <Link
                      href={`/e/${sel.estimate.token}`}
                      className="btn-ghost btn-sm"
                    >
                      Open Patient View ↗
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive FDI Tooth Chart Card */}
            <div className="card flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                    FDI TOOTH CHART (ADULT 18–48)
                  </span>
                  <p className="text-[12px] text-[#667085]">
                    Click a tooth number below to target it, then add a procedure to the plan.
                  </p>
                </div>
                <span className="chip sm no-dot">Selected: Tooth #{selectedTooth}</span>
              </div>

              <div className="bg-[#F8F8F6] border border-[#E6E7EA] rounded-xl p-3 flex flex-col gap-2 overflow-x-auto">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#868C98] text-center">
                  Upper Arch (Maxillary 18 – 28)
                </div>
                <div className="flex items-center justify-center gap-1 min-w-[520px]">
                  {FDI.upper.map((t) => {
                    const isSelected = selectedTooth === t;
                    const inPlan = teethInPlan.has(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTooth(t)}
                        className={`w-7 h-8 rounded-lg text-[11px] font-bold tabular-nums transition cursor-pointer border ${
                          isSelected
                            ? "bg-[#18181B] text-white border-[#18181B] shadow-xs scale-105"
                            : inPlan
                            ? "bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]"
                            : "bg-white text-[#525866] border-[#E6E7EA] hover:border-[#18181B]/40"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-dashed border-[#D0D5DD] my-1" />

                <div className="flex items-center justify-center gap-1 min-w-[520px]">
                  {FDI.lower.map((t) => {
                    const isSelected = selectedTooth === t;
                    const inPlan = teethInPlan.has(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTooth(t)}
                        className={`w-7 h-8 rounded-lg text-[11px] font-bold tabular-nums transition cursor-pointer border ${
                          isSelected
                            ? "bg-[#18181B] text-white border-[#18181B] shadow-xs scale-105"
                            : inPlan
                            ? "bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]"
                            : "bg-white text-[#525866] border-[#E6E7EA] hover:border-[#18181B]/40"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#868C98] text-center">
                  Lower Arch (Mandibular 48 – 38)
                </div>
              </div>

              {/* Add Procedure Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-[11.5px] font-semibold text-[#525866] mb-1">
                    Tooth
                  </label>
                  <input
                    className="w-full tabular-nums text-center font-bold"
                    value={selectedTooth}
                    onChange={(e) => setSelectedTooth(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-[11.5px] font-semibold text-[#525866] mb-1">
                    Procedure
                  </label>
                  <select
                    className="w-full"
                    value={newProcedure}
                    onChange={(e) => handlePresetSelect(e.target.value)}
                  >
                    {TREATMENTS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11.5px] font-semibold text-[#525866] mb-1">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full tabular-nums"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="btn w-full"
                    onClick={addItemToPlan}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Plan Items Table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tooth</th>
                    <th>Treatment / Procedure</th>
                    <th>Patient Choice</th>
                    <th className="text-right">Cost</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sel.items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <span className="chip sm no-dot font-mono">
                          {it.tooth ? `#${it.tooth}` : "Full"}
                        </span>
                      </td>
                      <td className="font-semibold text-[#111315]">{it.treatment}</td>
                      <td>
                        {it.accepted === true ? (
                          <span className="chip sm ok">Accepted</span>
                        ) : it.accepted === false ? (
                          <span className="chip sm bad">Declined</span>
                        ) : (
                          <span className="chip sm no-dot">Pending</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums font-semibold">
                        {rupees(it.cost)}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => removeItemFromPlan(it.id)}
                          className="text-[12px] text-[#B42318] hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#FAFAFA] font-bold">
                    <td colSpan={3}>Total Treatment Estimate</td>
                    <td className="text-right tabular-nums text-[15px]">
                      {rupees(sel.items.reduce((s, i) => s + i.cost, 0))}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <NewPlanModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setSelId(id)}
        />
      )}
    </div>
  );
}

function NewPlanModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { state, createPlan, setPlanItems, toast } = useStore();
  const [patientId, setPatientId] = useState(state!.patients[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(state!.doctors[0]?.id ?? "d_khan");
  const [title, setTitle] = useState("Lower molar root canal + crown");
  const [tooth, setTooth] = useState("36");
  const [treatment, setTreatment] = useState("Root canal");
  const [cost, setCost] = useState(String(treatmentCost("Root canal")));

  function submit() {
    if (!patientId || !title.trim()) return;
    const plan = createPlan(patientId, doctorId, title.trim());
    setPlanItems(plan.id, [
      {
        id: uid("pi"),
        tooth: tooth.trim() || undefined,
        treatment,
        cost: Number(cost) || 0,
      },
    ]);
    toast(`Created treatment plan "${plan.title}".`, "ok");
    onCreated(plan.id);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal !max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-[18px] text-[#111315] mb-3.5">New Treatment Plan</h2>
        <div className="flex flex-col gap-3">
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
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Plan Title
            </label>
            <input
              className="w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">
                First Tooth
              </label>
              <input
                className="w-full"
                value={tooth}
                onChange={(e) => setTooth(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">
                Procedure
              </label>
              <select
                className="w-full"
                value={treatment}
                onChange={(e) => {
                  setTreatment(e.target.value);
                  setCost(String(treatmentCost(e.target.value)));
                }}
              >
                {TREATMENTS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">
                Cost (₹)
              </label>
              <input
                type="number"
                className="w-full"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#F0F1F3]">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={submit}>
              Create Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
