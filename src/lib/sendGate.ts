/*
 * The send gate. Every outgoing message passes it: consent, 24 hour window,
 * contact hours, claims check. A fail is saved as blocked with the reason.
 * Frontend mirror of apps/api/src/gate/sendGate.ts.
 */
import { TZ } from "./clock";
import { minutesOf } from "./format";
import type { BlockReason, Consent, TemplateCategory } from "./types";

/** Words a clinic may not promise. "Free" is banned too: a waiver is never called free. */
const CLAIMS = [/\bpainless\b/i, /\bguarantee/i, /\b100\s?%/i, /\bbest\b/i, /\bfree\b/i, /\bcure[sd]?\b/i, /\bno pain\b/i, /\bpermanent\b/i, /\bcheapest\b/i];

export interface GateInput {
  text: string;
  /** "service" is a free-form reply inside the 24 hour window. */
  category: TemplateCategory;
  consent?: Consent;
  lastInboundAt?: string;
  now: Date;
  contactHours: { from: string; to: string };
  /** Staff alerts and urgent safety replies skip contact hours. */
  urgent?: boolean;
}

export type GateResult = { ok: true } | { ok: false; reason: BlockReason; detail: string };

function claimsHit(text: string): string | null {
  for (const re of CLAIMS) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

function istMinutes(d: Date): number {
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return minutesOf(s);
}

export function sendGate(i: GateInput): GateResult {
  if (i.consent?.optedOut) return { ok: false, reason: "opted_out", detail: "Patient replied STOP." };

  if (i.category === "marketing" && !i.consent?.marketing) {
    return { ok: false, reason: "no_consent", detail: "No consent for marketing messages." };
  }
  if (i.category === "utility" && i.consent && !i.consent.reminders) {
    return { ok: false, reason: "no_consent", detail: "No consent for reminders." };
  }

  if (i.category === "service") {
    const last = i.lastInboundAt ? new Date(i.lastInboundAt).getTime() : 0;
    if (!last || i.now.getTime() - last > 24 * 3600 * 1000) {
      return { ok: false, reason: "window_closed", detail: "Last patient message is over 24 hours old. Use a template." };
    }
  }

  if (!i.urgent && i.category !== "service") {
    const m = istMinutes(i.now);
    if (m < minutesOf(i.contactHours.from) || m >= minutesOf(i.contactHours.to)) {
      return { ok: false, reason: "outside_contact_hours", detail: `Contact hours are ${i.contactHours.from} to ${i.contactHours.to}.` };
    }
  }

  const hit = claimsHit(i.text);
  if (hit) return { ok: false, reason: "claims_blocked", detail: `The word "${hit}" is not allowed.` };

  return { ok: true };
}

