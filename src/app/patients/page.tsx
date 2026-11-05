"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { chairName, doctorName, invoiceTotals, staffName } from "@/lib/selectors";
import { age, fmtDate, fmtDay, fmtTime12, ist, rupees, todayKey } from "@/lib/format";
import { Avatar } from "@/components/ui";

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#667085]">Loading patients…</div>}>
      <PatientsContent />
    </Suspense>
  );
}

function PatientsContent() {
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");

  const { state, user, role, updatePatient, toast } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "marketing" | "hi">("all");
  const [selId, setSelId] = useState<string | null>(urlId ?? state?.patients[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState<"visits" | "plans" | "invoices" | "audit">("visits");
  const [addOpen, setAddOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  if (!state || !user) return null;

  const visible = state.patients.filter((p) => {
    if (role === "doctor" && user.doctorId) {
      return p.assignedDoctorId === user.doctorId;
    }
    return true;
  });

  const list = visible.filter((p) => {
    if (filter === "marketing" && !p.consent.marketing) return false;
    if (filter === "hi" && p.lang !== "hi") return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.phone.includes(s) ||
      p.source.toLowerCase().includes(s) ||
      p.notes.toLowerCase().includes(s)
    );
  });

  const effectiveId = urlId && visible.some((p) => p.id === urlId) ? urlId : selId;
  const sel = visible.find((p) => p.id === effectiveId) ?? list[0] ?? visible[0] ?? null;

  const selAppts = sel
    ? state.appointments
        .filter((a) => a.patientId === sel.id)
        .sort((a, b) => b.start.localeCompare(a.start))
    : [];
  const selPlans = sel ? state.plans.filter((pl) => pl.patientId === sel.id) : [];
  const selInvoices = sel ? state.invoices.filter((i) => i.patientId === sel.id) : [];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            CARE &amp; AI DESK · CLINICAL RECORDS
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Patients &amp; Dossiers
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            {role === "doctor"
              ? "Showing patients assigned to you. Reassignments are logged with reason."
              : "Complete patient directory with DPDP 2023 consent controls, treatment plans, and billing history."}
          </p>
        </div>

        <button type="button" className="btn" onClick={() => setAddOpen(true)}>
          + Add Patient
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E6E7EA] rounded-2xl p-3.5">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <input
            type="search"
            className="w-full"
            placeholder="Search by patient name, phone, source, or notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="seg-group self-start">
          {[
            { id: "all", label: `All (${visible.length})` },
            {
              id: "marketing",
              label: `Marketing Opt-in (${visible.filter((p) => p.consent.marketing).length})`,
            },
            {
              id: "hi",
              label: `Hindi (${visible.filter((p) => p.lang === "hi").length})`,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id as "all" | "marketing" | "hi")}
              className={`seg-btn ${filter === t.id ? "active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Master-Detail 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 5 Columns: Patient Directory Table */}
        <div className="lg:col-span-5 table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Primary Doctor</th>
                <th>Lang</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const active = sel?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelId(p.id)}
                    className={`cursor-pointer ${active ? "active-row" : ""}`}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.name} size={34} />
                        <div>
                          <div className="font-semibold text-[13.5px] text-[#111315]">
                            {p.name}
                          </div>
                          <div className="text-[11.5px] text-[#667085] tabular-nums">
                            {p.gender}, {age(p.dob)}y · {p.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-[12.5px] font-medium text-[#111315]">
                        {doctorName(state, p.assignedDoctorId)}
                      </div>
                      <span className="text-[11px] text-[#667085]">{p.source}</span>
                    </td>
                    <td>
                      <span className="chip sm no-dot uppercase">{p.lang}</span>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-[#868C98] py-8">
                    No patients match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right 7 Columns: Selected Patient Dossier */}
        {sel && (
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Dossier Identity Card */}
            <div className="card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3.5">
                  <Avatar name={sel.name} size={48} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-[18px] text-[#111315]">{sel.name}</h2>
                      <span className="chip sm no-dot">
                        {sel.gender} · {age(sel.dob)} yrs
                      </span>
                      <span className="chip sm no-dot uppercase">
                        {sel.lang === "hi" ? "Hindi" : "English"}
                      </span>
                      {sel.guardianName && (
                        <span className="chip sm warn">Guardian: {sel.guardianName}</span>
                      )}
                    </div>
                    <div className="text-[13px] text-[#667085] mt-0.5 tabular-nums">
                      {sel.phone} · Source: {sel.source} · Added {fmtDate(sel.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setReassignOpen(true)}
                  >
                    Reassign Doctor…
                  </button>
                  <Link href="/inbox" className="btn btn-sm">
                    Open Chat
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#F0F1F3]">
                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#868C98]">
                    Primary Doctor
                  </div>
                  <div className="font-bold text-[13.5px] text-[#111315] mt-0.5">
                    {doctorName(state, sel.assignedDoctorId)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#868C98]">
                    Clinical Notes
                  </div>
                  <div className="font-semibold text-[12.5px] text-[#111315] mt-0.5 truncate">
                    {sel.notes || "Standard dental care"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#868C98]">
                    Total Visits &amp; Plans
                  </div>
                  <div className="font-bold text-[13.5px] text-[#111315] mt-0.5 tabular-nums">
                    {selAppts.length} visits · {selPlans.length} plans
                  </div>
                </div>
              </div>
            </div>

            {/* DPDP 2023 Consent Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                    DPDP 2023 WHATSAPP CONSENT &amp; SEND GATE
                  </span>
                  <p className="text-[12px] text-[#667085]">
                    Consent asked {fmtDate(sel.consent.askedAt)}. Outbound templates check these
                    flags before sending.
                  </p>
                </div>
                <span className={`chip sm ${sel.consent.optedOut ? "bad" : "ok"}`}>
                  {sel.consent.optedOut ? "STOP Opted Out" : "Gate Active"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    sel.consent.reminders
                      ? "bg-[#ECFDF3]/50 border-[#ABEFC6]"
                      : "bg-[#F8F8F6] border-[#E6E7EA]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={sel.consent.reminders}
                    onChange={(e) => {
                      updatePatient(sel.id, {
                        consent: { ...sel.consent, reminders: e.target.checked },
                      });
                      toast(`Updated Reminders consent for ${sel.name}.`, "ok");
                    }}
                  />
                  <div>
                    <div className="font-semibold text-[13px] text-[#111315]">
                      Visit Reminders
                    </div>
                    <div className="text-[11.5px] text-[#667085]">
                      24h &amp; 2h utility reminders
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    sel.consent.marketing
                      ? "bg-[#ECFDF3]/50 border-[#ABEFC6]"
                      : "bg-[#F8F8F6] border-[#E6E7EA]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={sel.consent.marketing}
                    onChange={(e) => {
                      updatePatient(sel.id, {
                        consent: { ...sel.consent, marketing: e.target.checked },
                      });
                      toast(`Updated Marketing & Recall consent for ${sel.name}.`, "ok");
                    }}
                  />
                  <div>
                    <div className="font-semibold text-[13px] text-[#111315]">
                      Marketing &amp; Recalls
                    </div>
                    <div className="text-[11.5px] text-[#667085]">
                      6m check-up recalls &amp; reviews
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    sel.consent.optedOut
                      ? "bg-[#FEF3F2] border-[#FECDCA]"
                      : "bg-[#F8F8F6] border-[#E6E7EA]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={sel.consent.optedOut}
                    onChange={(e) => {
                      updatePatient(sel.id, {
                        consent: { ...sel.consent, optedOut: e.target.checked },
                      });
                      toast(
                        e.target.checked
                          ? `${sel.name} marked opted-out.`
                          : `Cleared STOP opt-out for ${sel.name}.`,
                        "ok",
                      );
                    }}
                  />
                  <div>
                    <div className="font-semibold text-[13px] text-[#111315]">
                      STOP Opt-Out Flag
                    </div>
                    <div className="text-[11.5px] text-[#667085]">
                      Blocks all non-urgent messages
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Clinical History Tabs Card */}
            <div className="card !p-0 overflow-hidden">
              <div className="p-3.5 border-b border-[#E6E7EA] flex items-center justify-between flex-wrap gap-2">
                <div className="seg-group">
                  {(
                    [
                      { id: "visits", label: `Visits (${selAppts.length})` },
                      { id: "plans", label: `Treatment Plans (${selPlans.length})` },
                      { id: "invoices", label: `Invoices (${selInvoices.length})` },
                      { id: "audit", label: `Doctor Log (${sel.doctorHistory.length})` },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`seg-btn ${activeTab === t.id ? "active" : ""}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                {activeTab === "visits" && (
                  <div className="list">
                    {selAppts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[13.5px] text-[#111315]">
                            {a.treatment}
                          </div>
                          <div className="text-[12px] text-[#667085]">
                            {fmtDay(a.start)}, {fmtTime12(a.start)} ·{" "}
                            {doctorName(state, a.doctorId)} ·{" "}
                            {a.chairId ? chairName(state, a.chairId) : "Hospital OT"}
                          </div>
                        </div>
                        <span
                          className={`chip sm ${
                            a.status === "completed"
                              ? "ok"
                              : a.status === "in_chair"
                              ? "info"
                              : a.status === "checked_in"
                              ? "warn"
                              : a.status === "no_show" || a.status === "cancelled"
                              ? "bad"
                              : ""
                          }`}
                        >
                          {a.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                    {selAppts.length === 0 && (
                      <p className="text-[13px] text-[#868C98] py-4 text-center">
                        No visits recorded for this patient.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "plans" && (
                  <div className="list">
                    {selPlans.map((pl) => {
                      const total = pl.items.reduce((s, i) => s + i.cost, 0);
                      return (
                        <div key={pl.id} className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-[13.5px] text-[#111315]">
                              {pl.title}
                            </div>
                            <div className="text-[12px] text-[#667085]">
                              {pl.items.length} items · Total {rupees(total)}
                              {pl.estimate ? ` · OTP Code: ${pl.estimate.code}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="chip sm no-dot">
                              {pl.status.replace("_", " ")}
                            </span>
                            {pl.estimate && (
                              <Link
                                href={`/e/${pl.estimate.token}`}
                                className="btn-ghost btn-xs"
                              >
                                Patient Link ↗
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {selPlans.length === 0 && (
                      <p className="text-[13px] text-[#868C98] py-4 text-center">
                        No treatment plans created yet.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "invoices" && (
                  <div className="list">
                    {selInvoices.map((inv) => {
                      const t = invoiceTotals(inv, state.waivers);
                      return (
                        <div key={inv.id} className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-[13.5px] text-[#111315]">
                              Invoice #{inv.number}
                            </div>
                            <div className="text-[12px] text-[#667085] tabular-nums">
                              Net {rupees(t.net)} · Paid {rupees(t.paid)} · Due {rupees(t.due)}
                              {t.waived > 0 ? ` · Fee waived ${rupees(t.waived)}` : ""}
                            </div>
                          </div>
                          <Link href="/billing" className="btn-ghost btn-xs">
                            View in Billing ›
                          </Link>
                        </div>
                      );
                    })}
                    {selInvoices.length === 0 && (
                      <p className="text-[13px] text-[#868C98] py-4 text-center">
                        No invoices found.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "audit" && (
                  <div className="list">
                    {sel.doctorHistory.map((h, i) => (
                      <div key={i} className="text-[12.5px] text-[#525866]">
                        <div className="font-semibold text-[#111315]">
                          Assigned to {doctorName(state, h.doctorId)}
                        </div>
                        <div className="text-[#667085]">
                          Reason: &ldquo;{h.reason}&rdquo; · By {staffName(state, h.by)} on{" "}
                          {fmtDate(h.from)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {addOpen && <AddPatientModal onClose={() => setAddOpen(false)} onCreated={setSelId} />}
      {reassignOpen && sel && (
        <ReassignDoctorModal
          patientId={sel.id}
          patientName={sel.name}
          currentDoctorId={sel.assignedDoctorId}
          onClose={() => setReassignOpen(false)}
        />
      )}
    </div>
  );
}

function AddPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { state, addPatient, toast } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 98450 ");
  const [dob, setDob] = useState("1992-05-15");
  const [gender, setGender] = useState<"F" | "M" | "O">("F");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [assignedDoctorId, setAssignedDoctorId] = useState(
    state!.doctors[0]?.id ?? "d_khan",
  );
  const [source, setSource] = useState("Walk-in");
  const [notes, setNotes] = useState("");

  function submit() {
    if (!name.trim()) return;
    const p = addPatient({
      name: name.trim(),
      phone: phone.trim(),
      dob,
      gender,
      lang,
      assignedDoctorId,
      source,
      notes: notes.trim(),
      consent: {
        reminders: true,
        marketing: true,
        askedAt: ist(todayKey(), "10:00"),
        optedOut: false,
      },
    });
    toast(`${p.name} added to Patient Directory.`, "ok");
    onCreated(p.id);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal !max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-[18px] text-[#111315] mb-3.5">Add New Patient</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Full Name
            </label>
            <input
              className="w-full"
              placeholder="e.g. Meera Krishnan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              WhatsApp Phone Number
            </label>
            <input
              className="w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">DOB</label>
              <input
                type="date"
                className="w-full"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">
                Gender
              </label>
              <select
                className="w-full"
                value={gender}
                onChange={(e) => setGender(e.target.value as "F" | "M" | "O")}
              >
                <option value="F">Female</option>
                <option value="M">Male</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#525866] mb-1">
                Language
              </label>
              <select
                className="w-full"
                value={lang}
                onChange={(e) => setLang(e.target.value as "en" | "hi")}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Primary Doctor
            </label>
            <select
              className="w-full"
              value={assignedDoctorId}
              onChange={(e) => setAssignedDoctorId(e.target.value)}
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
              Lead Source
            </label>
            <select
              className="w-full"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="Walk-in">Walk-in</option>
              <option value="Google search">Google search</option>
              <option value="Instagram">Instagram</option>
              <option value="Referral">Referral</option>
              <option value="Website">Website</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Clinical Note (optional)
            </label>
            <input
              className="w-full"
              placeholder="e.g. Mild anxiety with injections"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#F0F1F3]">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              disabled={!name.trim()}
              onClick={submit}
            >
              Create Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReassignDoctorModal({
  patientId,
  patientName,
  currentDoctorId,
  onClose,
}: {
  patientId: string;
  patientName: string;
  currentDoctorId: string;
  onClose: () => void;
}) {
  const { state, reassignDoctor, toast } = useStore();
  const [newDocId, setNewDocId] = useState(
    state!.doctors.find((d) => d.id !== currentDoctorId)?.id ?? currentDoctorId,
  );
  const [reason, setReason] = useState("");

  function submit() {
    if (!reason.trim() || newDocId === currentDoctorId) return;
    reassignDoctor(patientId, newDocId, reason.trim());
    toast(`Reassigned ${patientName} to ${doctorName(state!, newDocId)}.`, "ok");
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal !max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-[18px] text-[#111315] mb-1">
          Reassign Primary Doctor
        </h2>
        <p className="text-[12.5px] text-[#667085] mb-3.5">
          Every doctor reassignment is permanently logged in the patient&apos;s audit trail.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              New Primary Doctor
            </label>
            <select
              className="w-full"
              value={newDocId}
              onChange={(e) => setNewDocId(e.target.value)}
            >
              {state!.doctors
                .filter((d) => d.id !== currentDoctorId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1">
              Clinical / Operational Reason (required)
            </label>
            <input
              className="w-full"
              placeholder="e.g. Referred for prosthodontic implant crown"
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
              disabled={!reason.trim() || newDocId === currentDoctorId}
              onClick={submit}
            >
              Confirm Reassignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
