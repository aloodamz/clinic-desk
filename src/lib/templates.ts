import type { Lang, TemplateCategory } from "./types";

export interface TemplateDef {
  name: string;
  category: TemplateCategory;
  en: string;
  hi: string;
  /** Short staff-facing description. */
  about: string;
}

/** WhatsApp templates, wording as in apps/api/src/gate/templates.ts. */
export const TEMPLATES: Record<string, TemplateDef> = {
  appointment_booked: {
    name: "appointment_booked", category: "utility", about: "Sent once a slot is saved.",
    en: "Hello {{1}}, your appointment for {{2}} is booked for {{3}} with {{4}}. If you need to change it, reply here or call the clinic.",
    hi: "नमस्ते {{1}}, आपकी {{2}} की अपॉइंटमेंट {{3}} को {{4}} के साथ बुक हो गई है। बदलाव करना हो तो यहीं जवाब दें या क्लिनिक को फ़ोन करें।",
  },
  reminder_24h: {
    name: "reminder_24h", category: "utility", about: "Day before. Reply 1 confirms, 2 reschedules.",
    en: "Hello {{1}}, a reminder that your {{2}} appointment is coming up on {{3}}. Reply 1 to confirm or 2 to change the time.",
    hi: "नमस्ते {{1}}, याद दिलाना था कि आपकी {{2}} की अपॉइंटमेंट {{3}} को है। पक्का करने के लिए 1 भेजें, समय बदलना हो तो 2 भेजें।",
  },
  reminder_2h: {
    name: "reminder_2h", category: "utility", about: "Two hours before the visit.",
    en: "Hello {{1}}, your appointment at the clinic is today at {{2}}. We look forward to seeing you.",
    hi: "नमस्ते {{1}}, आज {{2}} पर क्लिनिक में आपकी अपॉइंटमेंट है। हम आपका इंतज़ार करेंगे।",
  },
  missed_you: {
    name: "missed_you", category: "utility", about: "No-show, with two new slots.",
    en: "Hello {{1}}, we missed you at your appointment today. Would one of these times suit you? 1) {{2}} 2) {{3}}. Reply 1 or 2 and we will book it.",
    hi: "नमस्ते {{1}}, आज आप अपनी अपॉइंटमेंट पर नहीं आ पाए। इनमें से कोई समय ठीक रहेगा? 1) {{2}} 2) {{3}}। 1 या 2 भेजें, हम बुक कर देंगे।",
  },
  missed_call_reply: {
    name: "missed_call_reply", category: "utility", about: "Reply to a missed call on the tracked number.",
    en: "Sorry, we missed your call to {{1}}. How can we help? Reply here and we will get back to you, or tell us a good time for a call.",
    hi: "क्षमा करें, {{1}} में आपकी कॉल हम उठा नहीं पाए। हम आपकी क्या मदद कर सकते हैं? यहीं जवाब दें, या बताएं कि फ़ोन करने का कौन सा समय ठीक रहेगा।",
  },
  estimate_ready: {
    name: "estimate_ready", category: "utility", about: "Code-protected estimate link.",
    en: "Hello {{1}}, your treatment estimate is ready. You can see the details and accept it here: {{2}}",
    hi: "नमस्ते {{1}}, आपके इलाज का अनुमानित खर्च तैयार है। पूरा ब्यौरा देखने और मंज़ूरी देने के लिए यह लिंक खोलें: {{2}}",
  },
  payment_link: {
    name: "payment_link", category: "utility", about: "Payment link for a bill.",
    en: "Hello {{1}}, here is your payment link for ₹{{2}}: {{3}}",
    hi: "नमस्ते {{1}}, ₹{{2}} के भुगतान का लिंक: {{3}}",
  },
  payment_received: {
    name: "payment_received", category: "utility", about: "Receipt after payment.",
    en: "Hello {{1}}, we have received ₹{{2}}. Your receipt number is {{3}}. Thank you.",
    hi: "नमस्ते {{1}}, हमें ₹{{2}} मिल गए हैं। आपकी रसीद संख्या {{3}} है। धन्यवाद।",
  },
  aftercare_surgery: {
    name: "aftercare_surgery", category: "utility", about: "Care steps from the dental pack.",
    en: "Hello {{1}}, here are your care steps after {{2}}: {{3}}",
    hi: "नमस्ते {{1}}, {{2}} के बाद ध्यान रखने की बातें: {{3}}",
  },
  next_day_checkin: {
    name: "next_day_checkin", category: "utility", about: "Day after the visit.",
    en: "Hello {{1}}, how are you feeling after your {{2}} yesterday? If you have any worry, reply here and the clinic will call you.",
    hi: "नमस्ते {{1}}, कल के {{2}} के बाद आप कैसा महसूस कर रहे हैं? कोई चिंता हो तो यहीं जवाब दें, क्लिनिक आपको फ़ोन करेगा।",
  },
  treatment_followup: {
    name: "treatment_followup", category: "utility", about: "Gentle reminder about advised treatment.",
    en: "Hello {{1}}, this is a gentle reminder about your {{2}}, which the doctor advised. {{3}}",
    hi: "नमस्ते {{1}}, डॉक्टर ने जो {{2}} बताया था, उसकी एक छोटी सी याद। {{3}}",
  },
  visit_summary: {
    name: "visit_summary", category: "utility", about: "Each next step with its date. Sent once.",
    en: "Hello {{1}}, thank you for visiting {{2}} today. Your next steps: {{3}}",
    hi: "नमस्ते {{1}}, आज {{2}} के पास आने के लिए धन्यवाद। आपके अगले कदम: {{3}}",
  },
  next_step_slots: {
    name: "next_step_slots", category: "utility", about: "Two slots, two days before due.",
    en: "Hello {{1}}, your {{2}} is due on {{3}}. Would one of these suit you? {{4}} Reply 1 or 2.",
    hi: "नमस्ते {{1}}, आपका {{2}} {{3}} को होना है। इनमें से कोई समय ठीक रहेगा? {{4}} 1 या 2 भेजें।",
  },
  next_step_reminder: {
    name: "next_step_reminder", category: "utility", about: "Due day, once.",
    en: "Hello {{1}}, your {{2}} is due today. Reply here and we will find a time.",
    hi: "नमस्ते {{1}}, आपका {{2}} आज होना है। यहीं जवाब दें, हम समय तय कर देंगे।",
  },
  review_request: {
    name: "review_request", category: "marketing", about: "Google review link. Consent only.",
    en: "Hello {{1}}, thank you for visiting us. If you have a minute, please share your honest feedback here: {{2}} Reply STOP to stop these messages.",
    hi: "नमस्ते {{1}}, हमारे क्लिनिक आने के लिए धन्यवाद। अगर आपके पास एक मिनट हो तो अपनी सच्ची राय यहां बताएं: {{2}} ऐसे संदेश बंद करने के लिए STOP भेजें।",
  },
  checkup_recall: {
    name: "checkup_recall", category: "marketing", about: "6 month recall. Consent only.",
    en: "Hello {{1}}, it is time for your regular check-up at {{2}}. Reply here to book a visit. Reply STOP to stop these messages.",
    hi: "नमस्ते {{1}}, {{2}} में आपकी नियमित जांच का समय हो गया है। समय तय करने के लिए यहीं जवाब दें। ऐसे संदेश बंद करने के लिए STOP भेजें।",
  },
};

/** Meta India rates from 1 Oct 2026, before GST. Never sell "unlimited". */
export const RATES = { marketing: 0.86, utility: 0.12, service: 0 } as const;
export const FREE_SERVICE_PER_MONTH = 1000;

export function renderTemplate(name: string, params: string[], lang: Lang): string {
  const t = TEMPLATES[name];
  if (!t) return params.join(" ");
  const body = lang === "hi" ? t.hi : t.en;
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}

