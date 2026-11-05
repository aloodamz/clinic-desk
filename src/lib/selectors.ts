import { addDays, diffDays, dayKey, ist, minutesOf, todayKey, weekday, fmtDay, fmtTime12 } from "./format";
import type { AppState, Appointment, FeeWaiver, Invoice, NextStep } from "./types";

export function invoiceTotals(inv: Invoice, waivers: FeeWaiver[]) {
  const gross = inv.lines.reduce((s, l) => s + l.amount, 0);
  const approved = waivers.filter((w) => w.invoiceId === inv.id && w.status === "approved");
  const waived = approved.reduce((s, w) => s + w.amount, 0);
  const net = Math.max(0, gross - waived);
  const paid = inv.payments.filter((p) => !p.refunded).reduce((s, p) => s + p.amount, 0);
  const refunded = inv.payments.filter((p) => p.refunded).reduce((s, p) => s + p.amount, 0);
  return { gross, waived, net, paid, refunded, due: Math.max(0, net - paid), approved };
}

export type StepStage = "waiting" | "slots_due" | "slots_sent" | "due_today" | "reminder_sent" | "call_task" | "close_due" | "booked" | "done" | "closed";

export const STAGE_LABEL: Record<StepStage, string> = {
  waiting: "Waiting",
  slots_due: "Send slots",
  slots_sent: "Slots sent",
  due_today: "Due today",
  reminder_sent: "Reminder sent",
  call_task: "Call patient",
  close_due: "Close with reason",
  booked: "Booked",
  done: "Done",
  closed: "Closed",
};

/** Where an open next step sits on the AI follow-up ladder: -2 slots, 0 reminder, +3 call, +14 close. */
export function stepStage(s: NextStep, today = todayKey()): StepStage {
  if (s.status !== "open") return s.status;
  const delta = diffDays(s.dueDate, today); // positive = overdue days
  if (delta >= 14) return "close_due";
  if (delta >= 3) return s.callTaskDone ? "reminder_sent" : "call_task";
  if (delta >= 0) return s.reminderSentAt ? "reminder_sent" : "due_today";
  if (delta >= -2) return s.slotsSentAt ? "slots_sent" : "slots_due";
  return "waiting";
}

function apptEnd(a: Appointment): number {
  return new Date(a.start).getTime() + a.durationMin * 60000;
}

const ACTIVE: Appointment["status"][] = ["booked", "confirmed", "checked_in", "in_chair", "completed"];

/** Database-style no double booking: a doctor or a chair can't hold two live visits at once. */
export function clash(state: AppState, cand: { id?: string; doctorId: string; chairId?: string; start: string; durationMin: number }): Appointment | null {
  const s = new Date(cand.start).getTime();
  const e = s + cand.durationMin * 60000;
  for (const a of state.appointments) {
    if (a.id === cand.id || !ACTIVE.includes(a.status)) continue;
    const as = new Date(a.start).getTime();
    const ae = apptEnd(a);
    if (s < ae && as < e && (a.doctorId === cand.doctorId || (cand.chairId && a.chairId === cand.chairId))) return a;
  }
  return null;
}

function isClinicOpen(state: AppState, day: string): boolean {
  if (state.settings.holidays.some((h) => h.date === day)) return false;
  return state.settings.hours[weekday(day)]?.open ?? false;
}

export interface Slot {
  start: string;
  doctorId: string;
  chairId?: string;
  siteId: string;
  label: string;
}

/** Find the next free slots with a doctor, from a given day, inside clinic hours. */
export function findSlots(state: AppState, doctorId: string, fromDay: string, count = 2, minutes = 30, afterIso?: string): Slot[] {
  const doc = state.doctors.find((d) => d.id === doctorId);
  if (!doc) return [];
  const siteId = doc.siteIds[0]!;
  const chairs = state.chairs.filter((c) => c.siteId === siteId);
  const out: Slot[] = [];
  const after = afterIso ? new Date(afterIso).getTime() : 0;
  for (let i = 0; i < 30 && out.length < count; i++) {
    const day = addDays(fromDay, i);
    if (!isClinicOpen(state, day) || !doc.days.includes(weekday(day))) continue;
    const h = state.settings.hours[weekday(day)]!;
    for (let t = minutesOf(h.from); t + minutes <= minutesOf(h.to) && out.length < count; t += 30) {
      if (t >= 13 * 60 && t < 14 * 60) continue; // lunch
      const hh = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      const start = ist(day, hh);
      if (new Date(start).getTime() <= after) continue;
      let chairId: string | undefined;
      if (chairs.length) {
        const free = chairs.find((c) => !clash(state, { doctorId, chairId: c.id, start, durationMin: minutes }));
        if (!free) continue;
        chairId = free.id;
      } else if (clash(state, { doctorId, start, durationMin: minutes })) continue;
      // Keep offered slots at least 90 minutes apart so the choice is real.
      const prev = out[out.length - 1];
      if (prev && dayKey(prev.start) === day && new Date(start).getTime() - new Date(prev.start).getTime() < 90 * 60000) continue;
      out.push({ start, doctorId, chairId, siteId, label: `${fmtDay(start)}, ${fmtTime12(start)}` });
    }
  }
  return out;
}

export function doctorName(state: AppState, id?: string) {
  return state.doctors.find((d) => d.id === id)?.name ?? "No doctor";
}

export function staffName(state: AppState, id?: string) {
  return state.staff.find((s) => s.id === id)?.name ?? "Unknown";
}

export function chairName(state: AppState, id?: string) {
  return state.chairs.find((c) => c.id === id)?.name ?? "No chair";
}

export function hasOpenPlan(state: AppState, patientId?: string) {
  if (!patientId) return false;
  return state.plans.some((p) => p.patientId === patientId && (p.status === "sent" || p.status === "partly_accepted"));
}
