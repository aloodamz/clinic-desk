"use client";

/*
 * Client-side store for the demo. All data lives in localStorage until the
 * API is wired. Every action here maps to a future API call; keep the names.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { aiAnswer, detectLang, isStop, pickReply } from "./ai";
import { now, nowIso, setRealClock } from "./clock";
import { AFTERCARE, treatmentCost, treatmentMinutes } from "./dentalPack";
import { addDays, dayKey, fmtDay, fmtTime12, rupees, todayKey, uid } from "./format";
import { HOLDING_REPLY, RECORDS_REPLY, SAFETY_REPLY, checkHandoff, isUnreadable } from "./handoff";
import { clash, doctorName, findSlots, hasOpenPlan, invoiceTotals } from "./selectors";
import { STATE_VERSION, buildSeed } from "./seed";
import { sendGate, type GateResult } from "./sendGate";
import { RATES, TEMPLATES, renderTemplate } from "./templates";
import type {
  AppState, Appointment, Board, ClinicSettings, Conversation, Deal, Doctor, Chair, FeeWaiver, Invoice, Message,
  MsgAuthor, NextStep, Patient, Plan, PlanItem, Role, Site, StaffUser, TemplateCategory,
} from "./types";

const KEY = "clinicdesk-staff-state";
const USER_KEY = "clinicdesk-staff-user";
const CLOCK_KEY = "clinicdesk-real-clock";

type Draft = AppState;

/* ---------------- pure helpers that work on a draft ---------------- */

function log(s: Draft, text: string) {
  s.activity.unshift({ id: uid("ac"), at: nowIso(), text });
  s.activity = s.activity.slice(0, 60);
}

function convForPatient(s: Draft, patientId: string): Conversation {
  let c = s.conversations.find((x) => x.patientId === patientId && x.channel === "whatsapp") ?? s.conversations.find((x) => x.patientId === patientId);
  if (!c) {
    const p = s.patients.find((x) => x.id === patientId)!;
    c = { id: uid("cv"), patientId, contactName: p.name, phone: p.phone, channel: "whatsapp", lang: p.lang, mode: "ai", booked: false, unread: 0, messages: [], unreadableCount: 0 };
    s.conversations.push(c);
  }
  return c;
}

interface OutOpts {
  text: string;
  author: MsgAuthor;
  authorName?: string;
  template?: string;
  category: TemplateCategory;
  urgent?: boolean;
}

/** Everything leaves through here: the send gate decides, the row is saved either way. */
function pushOut(s: Draft, c: Conversation, o: OutOpts): GateResult {
  const patient = c.patientId ? s.patients.find((p) => p.id === c.patientId) : undefined;
  const res = sendGate({
    text: o.text, category: o.category, consent: patient?.consent, lastInboundAt: c.lastInboundAt, now: now(),
    contactHours: s.settings.contactHours, urgent: o.urgent,
  });
  const msg: Message = {
    id: uid("m"), dir: "out", author: o.author, authorName: o.authorName, text: o.text, at: nowIso(),
    template: o.template, category: o.category, status: res.ok ? "sent" : "blocked",
    blockReason: res.ok ? undefined : res.reason, blockDetail: res.ok ? undefined : res.detail,
    cost: res.ok ? RATES[o.category] : 0,
  };
  c.messages.push(msg);
  if (!res.ok) log(s, `Message to ${c.contactName} blocked: ${res.detail}`);
  return res;
}

function sendTemplate(s: Draft, patientId: string, name: string, params: string[], urgent = false): GateResult {
  const c = convForPatient(s, patientId);
  const p = s.patients.find((x) => x.id === patientId)!;
  const t = TEMPLATES[name]!;
  return pushOut(s, c, { text: renderTemplate(name, params, p.lang), author: "system", authorName: "Template", template: name, category: t.category, urgent });
}

function moveDeal(s: Draft, patientId: string, board: Board, stage: string) {
  const d = s.deals.find((x) => x.patientId === patientId && x.board === board);
  if (d && d.stage !== stage) {
    d.stage = stage;
    d.stageSince = nowIso();
  }
}

function bookFromSlot(s: Draft, c: Conversation, idx: 0 | 1): Appointment | null {
  const slot = c.pendingSlots?.[idx];
  if (!slot || !c.patientId) return null;
  const treatment = c.pendingTreatment ?? "Consultation";
  const minutes = treatmentMinutes(treatment);
  if (clash(s, { doctorId: slot.doctorId, chairId: slot.chairId, start: slot.start, durationMin: minutes })) return null;
  const p = s.patients.find((x) => x.id === c.patientId)!;
  const isNew = !s.appointments.some((a) => a.patientId === p.id && a.status === "completed");
  const appt: Appointment = {
    id: uid("a"), patientId: p.id, doctorId: slot.doctorId, chairId: slot.chairId, siteId: slot.siteId, start: slot.start,
    durationMin: minutes, treatment, status: "booked", isNewPatient: isNew, confirmCallDone: false,
  };
  s.appointments.push(appt);
  c.booked = true;
  if (c.pendingStepId) {
    const st = s.nextSteps.find((x) => x.id === c.pendingStepId);
    if (st) st.status = "booked";
  }
  c.pendingSlots = undefined;
  c.pendingTreatment = undefined;
  c.pendingStepId = undefined;
  sendTemplate(s, p.id, "appointment_booked", [p.name, treatment, `${fmtDay(slot.start)}, ${fmtTime12(slot.start)}`, doctorName(s, slot.doctorId)]);
  moveDeal(s, p.id, "new", "Booked");
  log(s, `${p.name} booked ${treatment} for ${fmtDay(slot.start)} ${fmtTime12(slot.start)}.`);
  return appt;
}

function nextInvoiceNumber(s: Draft) {
  return Math.max(1000, ...s.invoices.map((i) => i.number)) + 1;
}

/* ---------------- the store ---------------- */

interface NewAppointment {
  patientId: string;
  doctorId: string;
  chairId?: string;
  siteId: string;
  start: string;
  treatment: string;
  durationMin: number;
}

interface Toast {
  id: string;
  text: string;
  kind: "ok" | "warn" | "bad";
}

function useStoreImpl() {
  const [state, setState] = useState<AppState | null>(null);
  const [userId, setUserId] = useState<string>("u_owner");
  const [realClock, setRealClockState] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ref = useRef<AppState | null>(null);

  // One-time hydration from localStorage, which doesn't exist during SSR and
  // so cannot be read synchronously during the initial render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const rc = localStorage.getItem(CLOCK_KEY) === "1";
    setRealClock(rc);
    setRealClockState(rc);
    let s: AppState | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed.version === STATE_VERSION) s = parsed;
      }
    } catch {
      /* corrupt state, reseed */
    }
    if (!s) s = buildSeed();
    ref.current = s;
    setState(s);
    const u = localStorage.getItem(USER_KEY);
    if (u && s.staff.some((x) => x.id === u)) setUserId(u);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const mutate = useCallback(<R,>(recipe: (s: Draft) => R): R => {
    const draft = structuredClone(ref.current!) as Draft;
    const r = recipe(draft);
    ref.current = draft;
    setState(draft);
    try {
      localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* storage full: demo only */
    }
    return r;
  }, []);

  const user: StaffUser | undefined = state?.staff.find((u) => u.id === userId) ?? state?.staff[0];
  const role: Role = user?.role ?? "owner";

  const actions = useMemo(() => {
    const me = () => ref.current!.staff.find((u) => u.id === userId)!;
    const meLabel = () => {
      const u = me();
      const roleName = { owner: "Owner", doctor: "Doctor", front_desk: "Front desk", counsellor: "Counsellor", assistant: "Assistant", msm_support: "MSM" }[u.role];
      return `${u.name} (${roleName})`;
    };

    return {
      setUser(id: string) {
        setUserId(id);
        localStorage.setItem(USER_KEY, id);
      },
      resetDemo() {
        const s = buildSeed();
        ref.current = s;
        setState(s);
        localStorage.setItem(KEY, JSON.stringify(s));
      },
      setRealClock(v: boolean) {
        localStorage.setItem(CLOCK_KEY, v ? "1" : "0");
        setRealClock(v);
        setRealClockState(v);
      },

      /* ----- Today ----- */
      setApptStatus(id: string, status: Appointment["status"]) {
        mutate((s) => {
          const a = s.appointments.find((x) => x.id === id)!;
          a.status = status;
          const p = s.patients.find((x) => x.id === a.patientId)!;
          if (status === "checked_in") {
            log(s, `${p.name} checked in.`);
            moveDeal(s, p.id, "new", "Showed");
            moveDeal(s, p.id, "recall", "Showed");
          }
          if (status === "in_chair") log(s, `${p.name} is in the chair.`);
          if (status === "confirmed") log(s, `${p.name} confirmed.`);
          if (status === "cancelled") log(s, `${p.name}'s ${a.treatment} cancelled.`);
        });
      },
      toggleConfirmCall(id: string) {
        mutate((s) => {
          const a = s.appointments.find((x) => x.id === id)!;
          a.confirmCallDone = !a.confirmCallDone;
          if (a.confirmCallDone && a.status === "booked") a.status = "confirmed";
        });
      },
      markNoShow(id: string) {
        return mutate((s) => {
          const a = s.appointments.find((x) => x.id === id)!;
          a.status = "no_show";
          const p = s.patients.find((x) => x.id === a.patientId)!;
          const slots = findSlots(s, a.doctorId, addDays(todayKey(), 1), 2, a.durationMin);
          const c = convForPatient(s, p.id);
          const res = sendTemplate(s, p.id, "missed_you", [p.name, slots[0]?.label ?? "", slots[1]?.label ?? ""]);
          if (res.ok) {
            c.pendingSlots = slots;
            c.pendingTreatment = a.treatment;
          }
          moveDeal(s, p.id, "new", "No-show");
          log(s, `${p.name} marked no-show. missed_you ${res.ok ? "sent" : "blocked"}.`);
          return res;
        });
      },
      endVisit(id: string, steps: { label: string; days: number }[], noMoreVisits: boolean) {
        return mutate((s) => {
          const a = s.appointments.find((x) => x.id === id)!;
          const p = s.patients.find((x) => x.id === a.patientId)!;
          a.status = "completed";
          a.noMoreVisits = noMoreVisits;
          const created: NextStep[] = steps.map((st) => ({
            id: uid("n"), patientId: p.id, doctorId: a.doctorId, siteId: a.siteId, label: st.label,
            createdAt: nowIso(), dueDate: addDays(todayKey(), st.days), status: "open",
          }));
          s.nextSteps.push(...created);
          const results: GateResult[] = [];
          if (created.length) {
            const list = created.map((st, i) => `${i + 1}) ${st.label}, by ${fmtDay(st.dueDate)}`).join("  ");
            results.push(sendTemplate(s, p.id, "visit_summary", [p.name, doctorName(s, a.doctorId), list]));
            if (!s.deals.some((d) => d.patientId === p.id && d.board === "followup" && !["Done", "Not interested"].includes(d.stage))) {
              s.deals.push({ id: uid("dl"), patientId: p.id, board: "followup", stage: "Advised", stageSince: nowIso(), treatment: created[0]!.label, source: "Next step", note: "" });
            }
          }
          const care = AFTERCARE[a.treatment];
          if (care) results.push(sendTemplate(s, p.id, "aftercare_surgery", [p.name, a.treatment.toLowerCase(), care]));
          // Draft bill for the visit.
          if (!s.invoices.some((i) => i.patientId === p.id && dayKey(i.createdAt) === todayKey() && i.status === "draft")) {
            const inv: Invoice = {
              id: uid("i"), number: nextInvoiceNumber(s), patientId: p.id, doctorId: a.doctorId, siteId: a.siteId, createdAt: nowIso(),
              lines: [{ id: uid("l"), label: a.treatment, amount: (s.plans.flatMap((pl) => pl.items).find((it) => it.treatment === a.treatment)?.cost ?? 0) || defaultCost(a.treatment) }],
              payments: [], status: "draft",
            };
            s.invoices.push(inv);
          }
          moveDeal(s, p.id, "new", noMoreVisits ? "Completed" : created.length ? "In treatment" : "Completed");
          log(s, `${p.name}'s visit ended with ${created.length} next step${created.length === 1 ? "" : "s"}${noMoreVisits ? " (no more visits)" : ""}.`);
          return results;
        });
      },
      bookAppointment(n: NewAppointment) {
        return mutate((s) => {
          const c = clash(s, n);
          if (c) return { ok: false as const, clash: c };
          const p = s.patients.find((x) => x.id === n.patientId)!;
          const isNew = !s.appointments.some((a) => a.patientId === p.id && a.status === "completed");
          const appt: Appointment = { id: uid("a"), ...n, status: "booked", isNewPatient: isNew, confirmCallDone: false };
          s.appointments.push(appt);
          const res = sendTemplate(s, p.id, "appointment_booked", [p.name, n.treatment, `${fmtDay(n.start)}, ${fmtTime12(n.start)}`, doctorName(s, n.doctorId)]);
          if (!s.deals.some((d) => d.patientId === p.id && d.board === "new")) {
            s.deals.push({ id: uid("dl"), patientId: p.id, board: "new", stage: "Booked", stageSince: nowIso(), treatment: n.treatment, source: p.source, note: "" });
          } else moveDeal(s, p.id, "new", "Booked");
          log(s, `Booked ${p.name}: ${n.treatment}, ${fmtDay(n.start)} ${fmtTime12(n.start)}.`);
          return { ok: true as const, appt, gate: res };
        });
      },
      reschedule(id: string, start: string, chairId?: string) {
        return mutate((s) => {
          const a = s.appointments.find((x) => x.id === id)!;
          const c = clash(s, { id, doctorId: a.doctorId, chairId: chairId ?? a.chairId, start, durationMin: a.durationMin });
          if (c) return { ok: false as const, clash: c };
          a.start = start;
          if (chairId) a.chairId = chairId;
          a.status = "booked";
          const p = s.patients.find((x) => x.id === a.patientId)!;
          sendTemplate(s, p.id, "appointment_booked", [p.name, a.treatment, `${fmtDay(start)}, ${fmtTime12(start)}`, doctorName(s, a.doctorId)]);
          return { ok: true as const };
        });
      },

      /* ----- Inbox ----- */
      markRead(convId: string) {
        if (ref.current?.conversations.find((c) => c.id === convId)?.unread === 0) return;
        mutate((s) => {
          const c = s.conversations.find((x) => x.id === convId);
          if (c) c.unread = 0;
        });
      },
      takeOver(convId: string) {
        mutate((s) => {
          const c = s.conversations.find((x) => x.id === convId)!;
          c.mode = "staff";
          log(s, `${me().name} took over the chat with ${c.contactName}.`);
        });
      },
      handBack(convId: string) {
        mutate((s) => {
          const c = s.conversations.find((x) => x.id === convId)!;
          c.mode = "ai";
          s.handoffs.filter((h) => h.conversationId === convId && h.status === "open").forEach((h) => {
            h.status = "resolved";
            h.resolvedAt = nowIso();
            h.resolvedBy = userId;
            h.note = h.note ?? "Handed back to the AI";
          });
          log(s, `${me().name} handed ${c.contactName} back to the AI.`);
        });
      },
      closeConversation(convId: string) {
        mutate((s) => {
          const c = s.conversations.find((x) => x.id === convId)!;
          c.mode = "closed";
        });
      },
      staffSend(convId: string, text: string) {
        return mutate((s) => {
          const c = s.conversations.find((x) => x.id === convId)!;
          if (c.mode === "ai") c.mode = "staff";
          return pushOut(s, c, { text, author: "staff", authorName: meLabel(), category: "service" });
        });
      },
      staffSendTemplate(convId: string, name: string, params: string[]) {
        return mutate((s) => {
          const c = s.conversations.find((x) => x.id === convId)!;
          const t = TEMPLATES[name]!;
          return pushOut(s, c, { text: renderTemplate(name, params, c.lang), author: "staff", authorName: meLabel(), template: name, category: t.category });
        });
      },
      offerSlots(convId: string, doctorId: string, treatment: string) {
        return mutate((s) => {
          const c = s.conversations.find((x) => x.id === convId)!;
          const slots = findSlots(s, doctorId, todayKey(), 2, treatmentMinutes(treatment), nowIso());
          c.pendingSlots = slots;
          c.pendingTreatment = treatment;
          const text = c.lang === "hi"
            ? `${treatment} ke liye ${doctorName(s, doctorId)} ke saath: 1) ${slots[0]?.label} 2) ${slots[1]?.label}. 1 ya 2 bhejein.`
            : `For ${treatment.toLowerCase()} with ${doctorName(s, doctorId)}: 1) ${slots[0]?.label} 2) ${slots[1]?.label}. Reply 1 or 2.`;
          return pushOut(s, c, { text, author: "staff", authorName: meLabel(), category: "service" });
        });
      },
      /** Demo only: pretend a patient sent a message. Runs the real pipeline: rules first, then AI. */
      simulateInbound(convId: string, text: string, opts: { voice?: boolean } = {}) {
        return mutate((s) => {
          const c = s.conversations.find((x) => x.id === convId)!;
          const body = opts.voice ? "🎤 Voice note (0:14)" : text;
          c.messages.push({ id: uid("m"), dir: "in", author: "patient", text: body, at: nowIso(), status: "received" });
          c.lastInboundAt = nowIso();
          c.unread += 1;
          if (c.mode === "closed") c.mode = "ai";
          if (!opts.voice) c.lang = detectLang(text, c.lang);
          const patient = c.patientId ? s.patients.find((p) => p.id === c.patientId) : undefined;

          if (patient && isStop(text)) {
            patient.consent.optedOut = true;
            patient.consent.marketing = false;
            log(s, `${patient.name} replied STOP. Marketing messages stopped.`);
            return { kind: "stop" as const };
          }

          // A reply of 1 or 2 to offered slots books straight away.
          const pick = pickReply(text);
          if (pick && c.pendingSlots?.length) {
            const appt = bookFromSlot(s, c, pick === 1 ? 0 : 1);
            if (appt) return { kind: "booked" as const };
          }
          // Reply 1 or 2 to a reminder_24h.
          if (pick && patient) {
            const lastTpl = [...c.messages].reverse().find((m) => m.dir === "out" && m.template);
            if (lastTpl?.template === "reminder_24h") {
              const appt = s.appointments
                .filter((a) => a.patientId === patient.id && a.status === "booked" && new Date(a.start).getTime() > now().getTime())
                .sort((x, y) => x.start.localeCompare(y.start))[0];
              if (appt && pick === 1) {
                appt.status = "confirmed";
                log(s, `${patient.name} confirmed by WhatsApp.`);
                return { kind: "confirmed" as const };
              }
            }
          }

          const unreadable = !opts.voice && isUnreadable(text);
          const rule = checkHandoff(text, { isVoiceNote: opts.voice, unreadableCount: c.unreadableCount, hasOpenPlan: hasOpenPlan(s, c.patientId) });
          c.unreadableCount = unreadable ? c.unreadableCount + 1 : 0;

          if (rule) {
            const existing = s.handoffs.find((h) => h.conversationId === c.id && h.status === "open" && h.rule === rule.rule);
            if (!existing) {
              s.handoffs.push({
                id: uid("h"), conversationId: c.id, rule: rule.rule, excerpt: body.slice(0, 140), priority: rule.priority, createdAt: nowIso(),
                status: "open", aiStopped: rule.aiStops,
                deadline: rule.rule === "H8" ? new Date(now().getTime() + 72 * 3600000).toISOString() : undefined,
              });
            }
            if (rule.aiStops) c.mode = "staff";
            const reply = rule.rule === "H1" ? SAFETY_REPLY : rule.rule === "H8" ? RECORDS_REPLY : HOLDING_REPLY;
            pushOut(s, c, { text: reply[c.lang], author: "system", authorName: rule.rule === "H1" ? "Safety reply" : "Holding reply", category: "service", urgent: true });
            log(s, `${rule.rule} fired for ${c.contactName}. ${rule.aiStops ? "AI stopped." : "AI continues."}`);
            if (rule.aiStops || rule.rule === "H8") return { kind: "handoff" as const, rule: rule.rule };
          }

          if (c.mode !== "ai") return { kind: "staff" as const };

          // AI front desk turn.
          const doctorId = patient?.assignedDoctorId ?? "d_khan";
          const slots = findSlots(s, doctorId, todayKey(), 2, 30, nowIso());
          const openDays = s.settings.hours.some((h, i) => i === 0 && h.open) ? "every day" : "Monday to Saturday, 10 am to 6 pm";
          const turn = aiAnswer(text, c.lang, s.settings.clinicName, openDays, slots, doctorName(s, doctorId));
          if (turn.offerSlots) {
            c.pendingSlots = slots;
            c.pendingTreatment = turn.treatment ?? c.pendingTreatment ?? "Consultation";
          }
          pushOut(s, c, { text: turn.text, author: "ai", authorName: "AI front desk", category: "service" });
          return { kind: rule ? ("handoff" as const) : ("ai" as const), rule: rule?.rule };
        });
      },

      /* ----- Handoffs ----- */
      resolveHandoff(id: string, note: string, handBackToAi: boolean) {
        mutate((s) => {
          const h = s.handoffs.find((x) => x.id === id)!;
          h.status = "resolved";
          h.note = note;
          h.resolvedAt = nowIso();
          h.resolvedBy = userId;
          const c = s.conversations.find((x) => x.id === h.conversationId)!;
          if (handBackToAi && !s.handoffs.some((x) => x.conversationId === c.id && x.status === "open")) c.mode = "ai";
          log(s, `${h.rule} for ${c.contactName} resolved by ${me().name}.`);
        });
      },

      /* ----- Patients ----- */
      addPatient(p: Omit<Patient, "id" | "createdAt" | "doctorHistory">) {
        return mutate((s) => {
          const np: Patient = { ...p, id: uid("p"), createdAt: nowIso(), doctorHistory: [{ doctorId: p.assignedDoctorId, from: nowIso(), reason: "First visit", by: userId }] };
          s.patients.push(np);
          s.deals.push({ id: uid("dl"), patientId: np.id, board: "new", stage: "Enquiry", stageSince: nowIso(), treatment: "Consultation", source: p.source, note: "" });
          log(s, `New patient ${np.name} added.`);
          return np;
        });
      },
      updatePatient(id: string, patch: Partial<Patient>) {
        mutate((s) => {
          const p = s.patients.find((x) => x.id === id)!;
          Object.assign(p, patch);
        });
      },
      reassignDoctor(id: string, doctorId: string, reason: string) {
        mutate((s) => {
          const p = s.patients.find((x) => x.id === id)!;
          p.assignedDoctorId = doctorId;
          p.doctorHistory.push({ doctorId, from: nowIso(), reason, by: userId });
          log(s, `${p.name} moved to ${doctorName(s, doctorId)}: ${reason}.`);
        });
      },

      /* ----- Pipeline ----- */
      moveDealStage(id: string, stage: string) {
        mutate((s) => {
          const d = s.deals.find((x) => x.id === id)!;
          if (d.stage === stage) return;
          d.stage = stage;
          d.stageSince = nowIso();
        });
      },
      updateDeal(id: string, patch: Partial<Deal>) {
        mutate((s) => Object.assign(s.deals.find((x) => x.id === id)!, patch));
      },

      /* ----- Plans ----- */
      createPlan(patientId: string, doctorId: string, title: string) {
        return mutate((s) => {
          const pl: Plan = { id: uid("pl"), patientId, doctorId, title, items: [], status: "draft", createdAt: nowIso() };
          s.plans.push(pl);
          return pl;
        });
      },
      updatePlan(id: string, patch: Partial<Plan>) {
        mutate((s) => Object.assign(s.plans.find((x) => x.id === id)!, patch));
      },
      setPlanItems(id: string, items: PlanItem[]) {
        mutate((s) => {
          s.plans.find((x) => x.id === id)!.items = items;
        });
      },
      sendEstimate(id: string) {
        return mutate((s) => {
          const pl = s.plans.find((x) => x.id === id)!;
          const p = s.patients.find((x) => x.id === pl.patientId)!;
          const token = `est-${Math.random().toString(36).slice(2, 8)}`;
          const code = String(Math.floor(1000 + Math.random() * 9000));
          pl.estimate = { token, code, sentAt: nowIso(), validUntil: addDays(todayKey(), 14), attempts: 0, locked: false };
          pl.status = "sent";
          pl.items.forEach((i) => (i.accepted = undefined));
          const link = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${token}`;
          const res = sendTemplate(s, p.id, "estimate_ready", [p.guardianName ? `${p.guardianName.split(" (")[0]}` : p.name, link]);
          moveDeal(s, p.id, "new", "Plan given");
          log(s, `Estimate ${rupees(pl.items.reduce((a, b) => a + b.cost, 0))} sent to ${p.name}.`);
          return { res, code, token };
        });
      },
      /** Public estimate page: code check, locks after 5 wrong tries. */
      verifyEstimateCode(token: string, code: string): "ok" | "wrong" | "locked" | "expired" | "missing" {
        return mutate((s) => {
          const pl = s.plans.find((x) => x.estimate?.token === token);
          if (!pl?.estimate) return "missing";
          const e = pl.estimate;
          if (e.locked) return "locked";
          if (e.validUntil < todayKey()) return "expired";
          if (e.code === code.trim()) return "ok";
          e.attempts += 1;
          if (e.attempts >= 5) e.locked = true;
          return e.locked ? "locked" : "wrong";
        });
      },
      acceptEstimate(token: string, itemIds: string[]) {
        mutate((s) => {
          const pl = s.plans.find((x) => x.estimate?.token === token)!;
          pl.items.forEach((i) => (i.accepted = itemIds.includes(i.id)));
          pl.status = itemIds.length === 0 ? "declined" : itemIds.length === pl.items.length ? "accepted" : "partly_accepted";
          pl.estimate!.acceptedAt = nowIso();
          const p = s.patients.find((x) => x.id === pl.patientId)!;
          if (itemIds.length) moveDeal(s, p.id, "new", "In treatment");
          log(s, `${p.name} ${pl.status === "declined" ? "declined" : "accepted"} the estimate (${itemIds.length} of ${pl.items.length} items).`);
        });
      },
      unlockEstimate(id: string) {
        mutate((s) => {
          const e = s.plans.find((x) => x.id === id)!.estimate!;
          e.locked = false;
          e.attempts = 0;
        });
      },

      /* ----- Follow-ups ----- */
      setStepStatus(id: string, status: NextStep["status"], reason?: string) {
        mutate((s) => {
          const st = s.nextSteps.find((x) => x.id === id)!;
          st.status = status;
          if (reason) st.closeReason = reason;
          const p = s.patients.find((x) => x.id === st.patientId)!;
          if (status === "done") moveDeal(s, p.id, "followup", "Done");
          if (status === "booked") moveDeal(s, p.id, "followup", "Booked");
          if (status === "closed") moveDeal(s, p.id, "followup", "Not interested");
          log(s, `${p.name}: "${st.label}" marked ${status}${reason ? ` (${reason})` : ""}.`);
        });
      },
      sendStepSlots(id: string) {
        return mutate((s) => {
          const st = s.nextSteps.find((x) => x.id === id)!;
          const p = s.patients.find((x) => x.id === st.patientId)!;
          const from = st.dueDate < todayKey() ? addDays(todayKey(), 1) : st.dueDate;
          const slots = findSlots(s, st.doctorId, from, 2, 30, nowIso());
          const c = convForPatient(s, p.id);
          const res = sendTemplate(s, p.id, "next_step_slots", [p.name, st.label, fmtDay(st.dueDate), `1) ${slots[0]?.label} with ${doctorName(s, st.doctorId)}  2) ${slots[1]?.label}`]);
          if (res.ok) {
            st.slotsSentAt = nowIso();
            c.pendingSlots = slots;
            c.pendingTreatment = st.label;
            c.pendingStepId = st.id;
          }
          return res;
        });
      },
      sendStepReminder(id: string) {
        return mutate((s) => {
          const st = s.nextSteps.find((x) => x.id === id)!;
          const p = s.patients.find((x) => x.id === st.patientId)!;
          const res = sendTemplate(s, p.id, "next_step_reminder", [p.name, st.label]);
          if (res.ok) st.reminderSentAt = nowIso();
          return res;
        });
      },
      markCallDone(id: string) {
        mutate((s) => {
          const st = s.nextSteps.find((x) => x.id === id)!;
          st.callTaskDone = true;
        });
      },

      /* ----- Billing ----- */
      createInvoice(patientId: string, doctorId: string, lines: { label: string; amount: number }[]) {
        return mutate((s) => {
          const inv: Invoice = {
            id: uid("i"), number: nextInvoiceNumber(s), patientId, doctorId, siteId: s.doctors.find((d) => d.id === doctorId)?.siteIds[0] ?? "s_clinic",
            createdAt: nowIso(), lines: lines.map((l) => ({ id: uid("l"), ...l })), payments: [], status: "draft",
          };
          s.invoices.push(inv);
          return inv;
        });
      },
      setInvoiceLines(id: string, lines: Invoice["lines"]) {
        mutate((s) => {
          s.invoices.find((x) => x.id === id)!.lines = lines;
        });
      },
      sendPaymentLink(id: string) {
        return mutate((s) => {
          const inv = s.invoices.find((x) => x.id === id)!;
          const t = invoiceTotals(inv, s.waivers);
          const p = s.patients.find((x) => x.id === inv.patientId)!;
          const res = sendTemplate(s, p.id, "payment_link", [p.name, t.due.toLocaleString("en-IN"), `https://pay.clinicdesk.in/${inv.number}`]);
          if (res.ok) {
            inv.paymentLinkSentAt = nowIso();
            if (inv.status === "draft") inv.status = "sent";
          }
          return res;
        });
      },
      recordPayment(id: string, amount: number, method: "link" | "cash" | "upi" | "card") {
        return mutate((s) => {
          const inv = s.invoices.find((x) => x.id === id)!;
          const receiptNo = `R-${inv.number}${inv.payments.length ? String.fromCharCode(65 + inv.payments.length) : ""}`;
          inv.payments.push({ id: uid("py"), amount, at: nowIso(), method, receiptNo });
          const t = invoiceTotals(inv, s.waivers);
          inv.status = t.due <= 0 ? "paid" : "part_paid";
          const p = s.patients.find((x) => x.id === inv.patientId)!;
          const res = sendTemplate(s, p.id, "payment_received", [p.name, amount.toLocaleString("en-IN"), receiptNo]);
          log(s, `${rupees(amount)} received from ${p.name} (${method}). Receipt ${receiptNo}.`);
          return { receiptNo, res };
        });
      },
      refundPayment(invoiceId: string, paymentId: string) {
        mutate((s) => {
          const inv = s.invoices.find((x) => x.id === invoiceId)!;
          const py = inv.payments.find((x) => x.id === paymentId)!;
          py.refunded = true;
          const t = invoiceTotals(inv, s.waivers);
          inv.status = t.paid === 0 ? "refunded" : t.due > 0 ? "part_paid" : "paid";
          log(s, `Refund of ${rupees(py.amount)} on invoice ${inv.number}.`);
        });
      },
      requestWaiver(w: Omit<FeeWaiver, "id" | "status" | "createdAt" | "requestedBy">) {
        return mutate((s) => {
          const fw: FeeWaiver = { ...w, id: uid("w"), status: "pending", createdAt: nowIso(), requestedBy: userId };
          s.waivers.push(fw);
          const inv = s.invoices.find((x) => x.id === w.invoiceId)!;
          log(s, `Fee waiver of ${rupees(w.amount)} asked on invoice ${inv.number}. Waiting on ${doctorName(s, w.approverDoctorId)}.`);
          return fw;
        });
      },

      /* ----- Approvals ----- */
      decideWaiver(id: string, approve: boolean, via: "app" | "whatsapp" = "app") {
        mutate((s) => {
          const w = s.waivers.find((x) => x.id === id)!;
          w.status = approve ? "approved" : "declined";
          w.decidedAt = nowIso();
          w.via = via;
          const approver = s.staff.find((u) => u.doctorId === w.approverDoctorId);
          w.decidedBy = via === "whatsapp" ? approver?.id ?? userId : userId;
          const inv = s.invoices.find((x) => x.id === w.invoiceId)!;
          const t = invoiceTotals(inv, s.waivers);
          if (inv.payments.length && t.due <= 0) inv.status = "paid";
          log(s, `Waiver of ${rupees(w.amount)} ${approve ? "approved" : "declined"} by ${doctorName(s, w.approverDoctorId)}${via === "whatsapp" ? " on WhatsApp" : ""}.`);
        });
      },

      /* ----- Settings ----- */
      updateSettings(patch: Partial<ClinicSettings>) {
        mutate((s) => Object.assign(s.settings, patch));
      },
      upsertDoctor(d: Doctor) {
        mutate((s) => {
          const i = s.doctors.findIndex((x) => x.id === d.id);
          if (i >= 0) s.doctors[i] = d;
          else s.doctors.push(d);
        });
      },
      upsertChair(c: Chair) {
        mutate((s) => {
          const i = s.chairs.findIndex((x) => x.id === c.id);
          if (i >= 0) s.chairs[i] = c;
          else s.chairs.push(c);
        });
      },
      removeChair(id: string) {
        mutate((s) => {
          s.chairs = s.chairs.filter((c) => c.id !== id);
        });
      },
      upsertSite(site: Site) {
        mutate((s) => {
          const i = s.sites.findIndex((x) => x.id === site.id);
          if (i >= 0) s.sites[i] = site;
          else s.sites.push(site);
        });
      },
      upsertStaff(u: StaffUser) {
        mutate((s) => {
          const i = s.staff.findIndex((x) => x.id === u.id);
          if (i >= 0) s.staff[i] = u;
          else s.staff.push(u);
        });
      },
      /** Demo: run the timers that would fire as background jobs (reminders, next steps, recalls). */
      runJobs() {
        return mutate((s) => {
          const T = todayKey();
          let sent = 0;
          let blocked = 0;
          const count = (r: GateResult) => (r.ok ? sent++ : blocked++);
          // 24 hour reminders for tomorrow.
          for (const a of s.appointments) {
            if (dayKey(a.start) !== addDays(T, 1) || a.status !== "booked") continue;
            const p = s.patients.find((x) => x.id === a.patientId)!;
            const c = convForPatient(s, p.id);
            if (c.messages.some((m) => m.template === "reminder_24h" && dayKey(m.at) === T)) continue;
            count(sendTemplate(s, p.id, "reminder_24h", [p.name, a.treatment, `${fmtDay(a.start)}, ${fmtTime12(a.start)}`]));
          }
          // Next steps ladder.
          for (const st of s.nextSteps) {
            if (st.status !== "open") continue;
            const p = s.patients.find((x) => x.id === st.patientId)!;
            if (!st.slotsSentAt && st.dueDate <= addDays(T, 2) && st.dueDate >= T) {
              const slots = findSlots(s, st.doctorId, st.dueDate, 2, 30, nowIso());
              const r = sendTemplate(s, p.id, "next_step_slots", [p.name, st.label, fmtDay(st.dueDate), `1) ${slots[0]?.label}  2) ${slots[1]?.label}`]);
              count(r);
              if (r.ok) {
                st.slotsSentAt = nowIso();
                const c = convForPatient(s, p.id);
                c.pendingSlots = slots;
                c.pendingTreatment = st.label;
                c.pendingStepId = st.id;
              }
            } else if (!st.reminderSentAt && st.dueDate === T) {
              const r = sendTemplate(s, p.id, "next_step_reminder", [p.name, st.label]);
              count(r);
              if (r.ok) st.reminderSentAt = nowIso();
            }
          }
          // Recalls due.
          for (const d of s.deals.filter((x) => x.board === "recall" && x.stage === "Due")) {
            const p = s.patients.find((x) => x.id === d.patientId)!;
            const r = sendTemplate(s, p.id, "checkup_recall", [p.name, s.settings.clinicName]);
            count(r);
            if (r.ok) {
              d.stage = "Sent";
              d.stageSince = nowIso();
            }
          }
          log(s, `Jobs ran: ${sent} sent, ${blocked} blocked by the send gate.`);
          return { sent, blocked };
        });
      },
    };
  }, [mutate, userId]);

  return { state, user, role, userId, realClock, toasts, toast, ready: !!state, ...actions };
}

function defaultCost(treatment: string) {
  return treatmentCost(treatment);
}

export type Store = ReturnType<typeof useStoreImpl>;

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreImpl();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store & { state: AppState; user: StaffUser } {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s as Store & { state: AppState; user: StaffUser };
}

