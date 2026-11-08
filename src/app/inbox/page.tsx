"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MdOutlineWarningAmber, MdChevronLeft } from "react-icons/md";
import { useStore } from "@/lib/store";
import { doctorName } from "@/lib/selectors";
import { ago, fmtDay, fmtTime, rupeesPaise } from "@/lib/format";
import { TEMPLATES } from "@/lib/templates";
import { Avatar } from "@/components/ui";

const QUICK_TEMPLATES: { name: string; label: string }[] = [
  { name: "appointment_booked", label: "Confirm Visit" },
  { name: "reminder_24h", label: "24h Reminder" },
  { name: "next_step_slots", label: "Offer Next Step" },
  { name: "checkup_recall", label: "6m Recall" },
  { name: "payment_link", label: "Payment Link" },
];

export default function InboxPage() {
  const {
    state,
    staffSend,
    staffSendTemplate,
    offerSlots,
    takeOver,
    handBack,
    markRead,
    resolveHandoff,
    toast,
  } = useStore();

  const sorted = [...(state?.conversations ?? [])].sort((a, b) =>
    (b.lastInboundAt ?? "").localeCompare(a.lastInboundAt ?? ""),
  );
  const [selId, setSelId] = useState<string | null>(sorted[0]?.id ?? null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "staff" | "ai">("all");
  const [draft, setDraft] = useState("");

  const filtered = sorted.filter((c) => {
    if (modeFilter === "staff" && c.mode !== "staff") return false;
    if (modeFilter === "ai" && c.mode !== "ai") return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  });

  const sel = state.conversations.find((c) => c.id === selId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (sel && sel.unread > 0) markRead(sel.id);
  }, [sel, markRead]);

  const linkedPatient = sel?.patientId
    ? state.patients.find((p) => p.id === sel.patientId)
    : undefined;
  const openHandoff = sel
    ? state.handoffs.find((h) => h.conversationId === sel.id && h.status === "open")
    : undefined;
  const patientAppts = linkedPatient
    ? state.appointments.filter((a) => a.patientId === linkedPatient.id)
    : [];

  function handleSendTemplate(tpl: string) {
    if (!sel) return;
    const doc = linkedPatient?.assignedDoctorId
      ? doctorName(state!, linkedPatient.assignedDoctorId)
      : "Dr Imran Khan";
    const r = staffSendTemplate(sel.id, tpl, [
      sel.contactName,
      "Consultation",
      "tomorrow, 11:00 am",
      doc,
    ]);
    if (r.ok) {
      toast(`Template "${tpl}" sent.`, "ok");
    } else {
      toast(`Send Gate Blocked (${r.reason}): ${r.detail}`, "warn");
    }
  }

  return (
    <div className="w-full h-[calc(100vh-108px)] min-h-[580px] bg-white border border-[#E6E7EA] rounded-2xl overflow-hidden flex shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
      {/* Left Column: Conversation List */}
      <div
        className={`${
          mobileShowThread ? "hidden md:flex" : "flex"
        } w-full md:w-[320px] shrink-0 md:border-r border-[#E6E7EA] flex-col bg-white`}
      >
        <div className="p-3.5 border-b border-[#E6E7EA] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-[16px] text-[#111315]">Inbox</h1>
              <span className="chip sm no-dot tabular-nums">{filtered.length}</span>
            </div>
            <span className="text-[11px] font-semibold text-[#067647] inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" /> 24h Gate Active
            </span>
          </div>

          <input
            type="search"
            aria-label="Search conversations"
            placeholder="Search patient, phone, message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full !py-1.5 !text-[12.5px]"
          />

          <div className="seg-group w-full">
            {(
              [
                { id: "all", label: "All" },
                {
                  id: "staff",
                  label: `Staff (${state.conversations.filter((c) => c.mode === "staff").length})`,
                },
                {
                  id: "ai",
                  label: `AI (${state.conversations.filter((c) => c.mode === "ai").length})`,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setModeFilter(t.id)}
                className={`seg-btn flex-1 justify-center !py-1 !text-[11.5px] ${
                  modeFilter === t.id ? "active" : ""
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F0F1F3]">
          {filtered.map((c) => {
            const last = c.messages[c.messages.length - 1];
            const active = c.id === sel?.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelId(c.id);
                  setMobileShowThread(true);
                }}
                className={`w-full text-left p-3.5 cursor-pointer transition-colors ${
                  active ? "bg-[#F4F4F1]" : "hover:bg-[#FAFAFA]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar name={c.contactName} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-[13.5px] text-[#111315] truncate">
                        {c.contactName}
                      </span>
                      <span className="text-[11px] text-[#868C98] shrink-0">
                        {last ? ago(last.at) : ""}
                      </span>
                    </div>

                    <div className="text-[12px] text-[#667085] truncate mt-0.5">
                      {last
                        ? `${last.dir === "in" ? "" : "↗ "}${last.text}`
                        : "No messages yet"}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span
                        className={`chip sm ${
                          c.mode === "staff" ? "warn" : c.mode === "ai" ? "ok" : "no-dot"
                        }`}
                      >
                        {c.mode === "staff"
                          ? "Waiting for staff"
                          : c.mode === "ai"
                          ? "AI replying"
                          : "Closed"}
                      </span>
                      <span className="chip sm no-dot uppercase">
                        {c.channel === "whatsapp"
                          ? "WA"
                          : c.channel === "instagram"
                          ? "IG"
                          : c.channel}
                      </span>
                      <span className="chip sm no-dot uppercase">{c.lang}</span>
                      {c.unread > 0 && (
                        <span className="ml-auto bg-[#D92D20] text-white text-[10.5px] font-bold px-1.5 py-0.5 rounded-full">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[13px] text-[#868C98]">
              No conversations match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Center Column: Active Thread & Composer */}
      {sel ? (
        <div
          className={`${
            mobileShowThread ? "flex" : "hidden md:flex"
          } flex-1 flex-col min-w-0 bg-[#FAFAFA]`}
        >
          {/* Thread Header */}
          <div className="px-4 sm:px-5 py-3 bg-white border-b border-[#E6E7EA] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileShowThread(false)}
                className="btn-ghost btn-xs md:hidden"
                aria-label="Back to conversation list"
              >
                <MdChevronLeft size={14} className="inline -mt-0.5" /> Chats
              </button>
              <Avatar name={sel.contactName} size={36} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[14.5px] text-[#111315] truncate">
                    {sel.contactName}
                  </span>
                  <span className={`chip sm ${sel.mode === "staff" ? "warn" : "ok"}`}>
                    {sel.mode === "staff" ? "Waiting for staff" : "AI Haiku 4.5"}
                  </span>
                </div>
                <div className="text-[12px] text-[#667085] truncate">
                  {sel.phone} · {sel.channel} · {sel.lang === "hi" ? "Hindi" : "English"}
                  {sel.lastInboundAt ? ` · Last inbound ${ago(sel.lastInboundAt)}` : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  const docId = linkedPatient?.assignedDoctorId ?? state.doctors[0]!.id;
                  const r = offerSlots(sel.id, docId, "Consultation");
                  toast(
                    r.ok ? "Offered 2 appointment slots." : `Blocked: ${r.detail}`,
                    r.ok ? "ok" : "warn",
                  );
                }}
              >
                + Offer 2 Slots
              </button>
              {sel.mode === "ai" ? (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    takeOver(sel.id);
                    toast("Thread taken over by staff. AI paused.", "ok");
                  }}
                >
                  Take over
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    handBack(sel.id);
                    toast("Thread handed back to AI receptionist.", "ok");
                  }}
                >
                  Hand back to AI
                </button>
              )}
            </div>
          </div>

          {/* Open Handoff Banner if present */}
          {openHandoff && (
            <div className="bg-[#FFFAEB] border-b border-[#FEDF89] px-5 py-2.5 flex items-center justify-between gap-3">
              <div className="text-[12.5px] text-[#B54708]">
                <span className="font-bold">Safety Handoff {openHandoff.rule}:</span> &ldquo;
                {openHandoff.excerpt}&rdquo;
              </div>
              <button
                type="button"
                className="btn-ghost btn-xs"
                onClick={() => {
                  resolveHandoff(openHandoff.id, "Resolved from Inbox thread", true);
                  toast("Handoff resolved & AI resumed.", "ok");
                }}
              >
                Resolve &amp; Resume AI
              </button>
            </div>
          )}

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {sel.messages.map((m) => {
              const isIn = m.dir === "in";
              const isStaff = m.author === "staff";
              const isSystem = m.author === "system";
              return (
                <div
                  key={m.id}
                  className={`max-w-[76%] rounded-2xl px-4 py-2.5 text-[13.5px] shadow-2xs ${
                    isIn
                      ? "self-start bg-white border border-[#E6E7EA] text-[#111315]"
                      : m.status === "blocked"
                      ? "self-end bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318]"
                      : isStaff
                      ? "self-end bg-[#18181B] text-white"
                      : isSystem
                      ? "self-end bg-[#EFF8FF] border border-[#B2DDFF] text-[#111315]"
                      : "self-end bg-[#ECFDF3] border border-[#ABEFC6] text-[#111315]"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between gap-3 text-[11px] mb-1 ${
                      isStaff && m.status !== "blocked" ? "text-zinc-300" : "text-[#667085]"
                    }`}
                  >
                    <span className="font-bold uppercase tracking-wider">
                      {isIn
                        ? sel.contactName
                        : m.authorName ?? m.author}
                      {m.template ? ` · ${m.template}` : ""}
                    </span>
                    <span className="tabular-nums">
                      {fmtTime(m.at)}
                      {typeof m.cost === "number" && m.cost > 0 ? ` · ${rupeesPaise(m.cost)}` : ""}
                    </span>
                  </div>
                  <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  {m.status === "blocked" && (
                    <div className="mt-1.5 text-[11.5px] font-semibold text-[#B42318] flex items-start gap-1">
                      <MdOutlineWarningAmber size={13} className="mt-[1px] shrink-0" />
                      <span>Blocked by Send Gate ({m.blockReason}): {m.blockDetail}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Composer & Quick Templates Footer */}
          <div className="p-3.5 bg-white border-t border-[#E6E7EA] flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#868C98] mr-1 shrink-0">
                Templates:
              </span>
              {QUICK_TEMPLATES.map((t) => {
                const spec = TEMPLATES[t.name];
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => handleSendTemplate(t.name)}
                    title={spec ? `${spec.about} (${spec.category})` : t.label}
                    className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg bg-[#F8F8F6] hover:bg-[#EDEDEB] border border-[#E6E7EA] text-[#111315] whitespace-nowrap cursor-pointer transition"
                  >
                    + {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1"
                placeholder={`Reply to ${sel.contactName} as staff (Send Gate checks prohibited claims like "painless" or "guaranteed")…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    const r = staffSend(sel.id, draft.trim());
                    setDraft("");
                    toast(
                      r.ok ? "Reply sent." : `Blocked by Send Gate: ${r.detail}`,
                      r.ok ? "ok" : "warn",
                    );
                  }
                }}
              />
              <button
                type="button"
                className="btn"
                disabled={!draft.trim()}
                onClick={() => {
                  if (!draft.trim()) return;
                  const r = staffSend(sel.id, draft.trim());
                  setDraft("");
                  toast(
                    r.ok ? "Reply sent." : `Blocked by Send Gate: ${r.detail}`,
                    r.ok ? "ok" : "warn",
                  );
                }}
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#868C98]">
          Select a conversation to view messages
        </div>
      )}

      {/* Right Column: Patient Context Mini-Dossier */}
      {sel && (
        <div className="w-[285px] shrink-0 border-l border-[#E6E7EA] bg-white hidden xl:flex flex-col p-4 gap-4 overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#868C98]">
            PATIENT CONTEXT
          </div>

          {linkedPatient ? (
            <>
              <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA] flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <Avatar name={linkedPatient.name} size={36} />
                  <div className="min-w-0">
                    <div className="font-bold text-[14px] text-[#111315] truncate">
                      {linkedPatient.name}
                    </div>
                    <div className="text-[11.5px] text-[#667085]">
                      {doctorName(state, linkedPatient.assignedDoctorId)}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/patients?id=${linkedPatient.id}`}
                  className="btn-ghost btn-xs w-full mt-1"
                >
                  Open Patient Record ›
                </Link>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#868C98] mb-2">
                  SEND GATE &amp; DPDP CONSENT
                </div>
                <div className="flex flex-col gap-1.5 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#525866]">Appointment Reminders</span>
                    <span className={`chip sm ${linkedPatient.consent.reminders ? "ok" : "bad"}`}>
                      {linkedPatient.consent.reminders ? "Opted in" : "Off"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#525866]">Marketing &amp; Recalls</span>
                    <span className={`chip sm ${linkedPatient.consent.marketing ? "ok" : "no-dot"}`}>
                      {linkedPatient.consent.marketing ? "Opted in" : "Off"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#525866]">STOP Opt-out</span>
                    <span className={`chip sm ${linkedPatient.consent.optedOut ? "bad" : "ok"}`}>
                      {linkedPatient.consent.optedOut ? "Opted Out" : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#868C98] mb-2">
                  RECENT &amp; UPCOMING VISITS
                </div>
                <div className="flex flex-col gap-2">
                  {patientAppts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-xl border border-[#E6E7EA] text-[12px] flex flex-col gap-0.5"
                    >
                      <div className="font-semibold text-[#111315]">{a.treatment}</div>
                      <div className="text-[#667085]">
                        {fmtDay(a.start)} ({a.status.replace("_", " ")})
                      </div>
                    </div>
                  ))}
                  {patientAppts.length === 0 && (
                    <div className="text-[12px] text-[#868C98]">No appointments recorded.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA] text-[12.5px] text-[#525866] flex flex-col gap-2">
              <div className="font-semibold text-[#111315]">Unlinked Caller / Lead</div>
              <p>
                {sel.contactName} ({sel.phone}) reached out via {sel.channel}.
              </p>
              <Link href="/patients" className="btn-ghost btn-xs w-full">
                Add to Patients ›
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
