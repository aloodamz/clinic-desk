/*
 * Handoff rules H1 to H10. Plain word checks that run before any AI call.
 * A false alarm costs a phone call; a missed urgent case costs a patient.
 * Frontend mirror of apps/api/src/rules/handoff.ts for the demo simulator.
 */
import type { HandoffRule, Role } from "./types";

export interface RuleDef {
  rule: HandoffRule;
  when: string;
  goesTo: Role[];
  aiStops: boolean;
  priority: "high" | "normal";
  note?: string;
  words: RegExp[];
}

const w = (...xs: string[]) => xs.map((x) => new RegExp(`(^|[^a-z\\u0900-\\u097F])${x}`, "i"));

export const RULES: RuleDef[] = [
  {
    rule: "H1", when: "Urgent symptom (pain, swelling, bleeding, injury)", goesTo: ["doctor", "owner"], aiStops: true, priority: "high",
    words: w("swell", "swollen", "bleed", "blood", "injur", "accident", "broke", "severe pain", "unbearable", "sujh", "soojh", "sooj", "khoon", "dard bahut", "bahut dard", "fever", "pus", "मवाद", "सूज", "खून", "दर्द"),
  },
  {
    rule: "H2", when: "Clinical question, treatment or medicine", goesTo: ["doctor", "counsellor", "front_desk", "owner"], aiStops: false, priority: "normal",
    words: w("medicine", "tablet", "antibiotic", "painkiller", "which treatment", "should i take", "dawai", "dawa", "goli", "दवा", "is it normal", "kya karu"),
  },
  {
    rule: "H3", when: "Complaint, anger or a problem after treatment", goesTo: ["owner"], aiStops: true, priority: "high",
    words: w("complain", "worst", "angry", "pathetic", "rude", "refund", "cheat", "bekar", "ghatiya", "shikayat", "शिकायत", "problem after", "still hurts after"),
  },
  {
    rule: "H4", when: "Asks for a person or asks if this is a bot", goesTo: ["front_desk", "owner"], aiStops: true, priority: "normal",
    words: w("real person", "human", "are you a bot", "is this a bot", "talk to someone", "call me", "insaan", "kisi se baat", "robot"),
  },
  {
    rule: "H5", when: "Price talk, discount, \"too expensive\"", goesTo: ["counsellor", "front_desk", "owner"], aiStops: true, priority: "normal",
    words: w("price", "cost", "how much", "discount", "expensive", "kharcha", "kitna", "kitne", "paisa", "rate", "charges", "खर्च", "कितना", "sasta", "mehenga"),
  },
  {
    rule: "H6", when: "Big case: implant, braces, aligners, full mouth, jaw surgery", goesTo: ["counsellor", "front_desk", "owner"], aiStops: false, priority: "normal",
    words: w("implant", "braces", "aligner", "full mouth", "jaw surgery", "invisalign", "denture"),
  },
  {
    rule: "H7", when: "Voice note or two unreadable messages", goesTo: ["front_desk", "owner"], aiStops: true, priority: "normal",
    words: [],
  },
  {
    rule: "H8", when: "Records, X-rays, reports or bills requested", goesTo: ["front_desk", "owner"], aiStops: false, priority: "normal", note: "72 hour deadline",
    words: w("x-ray", "xray", "report", "records", "prescription copy", "my bill", "invoice copy", "रिपोर्ट"),
  },
  {
    rule: "H9", when: "Patient has an open treatment plan", goesTo: ["counsellor", "doctor", "front_desk", "owner"], aiStops: false, priority: "normal",
    words: [],
  },
  {
    rule: "H10", when: "Child or someone who cannot decide alone", goesTo: ["front_desk", "owner"], aiStops: false, priority: "normal", note: "Guardian gets consent and estimate",
    words: w("my son", "my daughter", "my child", "my kid", "beta", "beti", "bachcha", "bachche", "baccha", "years old", "saal ka", "saal ki", "बच्च"),
  },
];

export const ruleDef = (r: HandoffRule) => RULES.find((x) => x.rule === r)!;

export interface HandoffContext {
  isVoiceNote?: boolean;
  unreadableCount: number;
  hasOpenPlan: boolean;
}

/** Is a message unreadable (no letters at all, or a stray emoji/garble)? */
export function isUnreadable(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return !/[a-z\u0900-\u097F0-9]{2,}/i.test(t);
}

/** Returns the first rule that fires, in rule order, or null if the AI may answer. */
export function checkHandoff(text: string, ctx: HandoffContext): RuleDef | null {
  if (ctx.isVoiceNote) return ruleDef("H7");
  if (isUnreadable(text) && ctx.unreadableCount + 1 >= 2) return ruleDef("H7");
  for (const r of RULES) {
    if (r.words.some((re) => re.test(text))) return r;
  }
  if (ctx.hasOpenPlan) return ruleDef("H9");
  return null;
}

export const SAFETY_REPLY = {
  en: "Thank you for telling us. We are passing this to the doctor now and the clinic will call you shortly. If it is getting worse, please come to the clinic or go to the nearest hospital.",
  hi: "बताने के लिए धन्यवाद। हम यह अभी डॉक्टर को भेज रहे हैं, क्लिनिक जल्द ही आपको फ़ोन करेगा। अगर तकलीफ़ बढ़ रही है तो कृपया क्लिनिक आएं या नज़दीकी अस्पताल जाएं।",
};

export const HOLDING_REPLY = {
  en: "Thank you. A member of our team will reply to you here shortly.",
  hi: "धन्यवाद। हमारी टीम का कोई सदस्य जल्द ही यहीं जवाब देगा।",
};

export const RECORDS_REPLY = {
  en: "Thank you. We have noted your request and the clinic will share it within 72 hours.",
  hi: "धन्यवाद। हमने आपका अनुरोध नोट कर लिया है, क्लिनिक 72 घंटे के अंदर इसे भेज देगा।",
};

