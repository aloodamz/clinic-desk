/*
 * Fake AI front desk for demo mode (the real one is Claude Haiku behind the API).
 * It answers in the patient's language, never diagnoses, never names a medicine,
 * and offers two slots.
 */
import type { Lang, PendingSlot } from "./types";

const HINGLISH = /\b(mujhe|kal|aaj|chahiye|kya|hai|hain|nahi|kab|kitne|baje|theek|ji|haan|dant|daant|aap)\b/i;

export function detectLang(text: string, fallback: Lang): Lang {
  if (/[\u0900-\u097F]/.test(text) || HINGLISH.test(text)) return "hi";
  if (/[a-z]{3,}/i.test(text)) return "en";
  return fallback;
}

export function pickReply(text: string): 1 | 2 | null {
  const t = text.trim().toLowerCase();
  if (/^(1|one|ek|pehla|first|१)\b/.test(t)) return 1;
  if (/^(2|two|do|doosra|dusra|second|२)\b/.test(t)) return 2;
  return null;
}

export function isStop(text: string) {
  return /^\s*stop\s*$/i.test(text);
}

export interface AiTurn {
  text: string;
  offerSlots: boolean;
  treatment?: string;
}

function guessTreatment(text: string): string {
  const t = text.toLowerCase();
  if (/clean|scal|safai/.test(t)) return "Check-up and cleaning";
  if (/check|jaanch|janch/.test(t)) return "Check-up and cleaning";
  if (/fill/.test(t)) return "Filling";
  if (/whiten|white/.test(t)) return "Teeth whitening";
  if (/root canal|rct/.test(t)) return "Root canal";
  return "Consultation";
}

export function aiAnswer(text: string, lang: Lang, clinic: string, hours: string, slots: PendingSlot[], doctor: string): AiTurn {
  const t = text.toLowerCase();
  const s1 = slots[0]?.label ?? "";
  const s2 = slots[1]?.label ?? "";

  if (/sunday|ravivar|open|khula|timing|hours|samay/.test(t)) {
    return lang === "hi"
      ? { text: `${clinic} ${hours} khula rehta hai. Kya aap aana chahenge? 1) ${s1} 2) ${s2}. 1 ya 2 bhejein.`, offerSlots: true }
      : { text: `${clinic} is open ${hours}. Would you like to visit? 1) ${s1} 2) ${s2}. Reply 1 or 2.`, offerSlots: true };
  }
  if (/where|address|location|kahan|kaha/.test(t)) {
    return lang === "hi"
      ? { text: `Hum 100 Feet Road, Indiranagar mein hain. Kya main aapke liye time book karoon? 1) ${s1} 2) ${s2}`, offerSlots: true }
      : { text: `We are on 100 Feet Road, Indiranagar. Shall I book a time for you? 1) ${s1} 2) ${s2}`, offerSlots: true };
  }
  if (/thank|dhanyavad|shukriya|ok\b|okay/.test(t)) {
    return lang === "hi" ? { text: "Dhanyavaad! Kuch aur chahiye ho to yahin likhiye.", offerSlots: false } : { text: "You're welcome. Message here any time if you need anything else.", offerSlots: false };
  }
  const treatment = guessTreatment(text);
  return lang === "hi"
    ? { text: `Namaste! ${treatment} ke liye ${doctor} ke saath yeh samay khaali hain: 1) ${s1} 2) ${s2}. Kaun sa theek rahega? 1 ya 2 bhejein.`, offerSlots: true, treatment }
    : { text: `Hello! For a ${treatment.toLowerCase()} with ${doctor}, these times are free: 1) ${s1} 2) ${s2}. Which one suits you? Reply 1 or 2.`, offerSlots: true, treatment };
}

