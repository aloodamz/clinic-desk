/*
 * Seed data for the City Dental demo clinic. Everything is built relative to
 * the demo clock so "today" always has a full schedule.
 */
import { now } from "./clock";
import { addDays, dayKey, ist } from "./format";
import type {
  AppState,
  Appointment,
  Conversation,
  Deal,
  FeeWaiver,
  Handoff,
  Invoice,
  Message,
  NextStep,
  Patient,
  Plan,
} from "./types";

export const STATE_VERSION = 3;

export function buildSeed(): AppState {
  const N = now();
  const T = dayKey(N);
  const d = (n: number) => addDays(T, n);
  const minsAgo = (m: number) => new Date(N.getTime() - m * 60000).toISOString();
  const hoursAgo = (h: number) => minsAgo(h * 60);

  const consentYes = { reminders: true, marketing: true, askedAt: ist(d(-60), "10:00"), optedOut: false };
  const consentRem = { reminders: true, marketing: false, askedAt: ist(d(-30), "10:00"), optedOut: false };

  const p = (
    id: string, name: string, phone: string, lang: "en" | "hi", dob: string, gender: "F" | "M",
    doc: string, source: string, extra: Partial<Patient> = {},
  ): Patient => ({
    id, name, phone, lang, dob, gender, assignedDoctorId: doc, source, notes: "",
    doctorHistory: [{ doctorId: doc, from: ist(d(-120), "10:00"), reason: "First visit", by: "u_fd" }],
    consent: consentYes, createdAt: ist(d(-120), "10:00"), ...extra,
  });

  const patients: Patient[] = [
    p("p_meera", "Meera Devi", "+91 98450 11223", "hi", "1979-03-14", "F", "d_khan", "Google search", { familyId: "f_devi", notes: "Prefers Hindi. Mild anxiety with injections." }),
    p("p_rahul", "Rahul Verma", "+91 99000 22334", "en", "1990-07-02", "M", "d_khan", "Google Maps"),
    p("p_ashok", "Ashok Kumar", "+91 98860 33445", "hi", "1968-11-20", "M", "d_khan", "Facebook ad", { consent: consentRem }),
    p("p_priya", "Priya Singh", "+91 90080 44556", "en", "1996-01-30", "F", "d_nair", "Instagram", { createdAt: ist(d(-1), "18:00") }),
    p("p_anjali", "Anjali Gupta", "+91 97400 55667", "en", "1988-05-09", "F", "d_nair", "Referral"),
    p("p_vikram", "Vikram Rao", "+91 98440 66778", "en", "1983-09-17", "M", "d_nair", "Website"),
    p("p_sana", "Sana Shaikh", "+91 96320 77889", "hi", "1992-12-03", "F", "d_khan", "Google search"),
    p("p_rohan", "Rohan Das", "+91 98455 88990", "en", "2016-04-22", "M", "d_khan", "Referral", { guardianName: "Moumita Das (mother)", familyId: "f_das" }),
    p("p_kavita", "Kavita Joshi", "+91 99860 99001", "en", "1975-08-11", "F", "d_khan", "Walk-in"),
    p("p_deepak", "Deepak Yadav", "+91 90350 10112", "hi", "1985-02-25", "M", "d_khan", "Missed call", { createdAt: ist(d(-2), "14:05") }),
    p("p_neha", "Neha Kapoor", "+91 98451 21223", "en", "1994-06-18", "F", "d_nair", "Website"),
    p("p_suresh", "Suresh Patel", "+91 97411 32334", "en", "1971-10-05", "M", "d_mehta", "Referral"),
    p("p_farhan", "Farhan Ali", "+91 99001 43445", "en", "2001-03-28", "M", "d_nair", "Instagram", { createdAt: ist(d(-1), "20:10") }),
    p("p_lakshmi", "Lakshmi Iyer", "+91 98862 54556", "en", "1962-07-07", "F", "d_khan", "Walk-in", { consent: { ...consentRem, marketing: false } }),
    p("p_moumita", "Moumita Das", "+91 98455 88990", "en", "1987-01-12", "F", "d_khan", "Referral", { familyId: "f_das" }),
    p("p_gopal", "Gopal Devi", "+91 98450 11224", "hi", "1975-06-01", "M", "d_khan", "Referral", { familyId: "f_devi", consent: { ...consentYes, optedOut: true } }),
  ];
  // Meera's doctor changed once, to show history.
  patients[0]!.doctorHistory = [
    { doctorId: "d_nair", from: ist(d(-200), "10:00"), reason: "First visit", by: "u_fd" },
    { doctorId: "d_khan", from: ist(d(-40), "12:00"), reason: "Moved to Dr Khan for gum treatment", by: "u_owner" },
  ];

  const a = (
    id: string, patientId: string, doctorId: string, day: string, time: string, minutes: number,
    treatment: string, status: Appointment["status"], chairId?: string, extra: Partial<Appointment> = {},
  ): Appointment => ({
    id, patientId, doctorId, chairId, siteId: chairId ? "s_clinic" : doctorId === "d_mehta" ? "s_hosp" : "s_clinic",
    start: ist(day, time), durationMin: minutes, treatment, status, isNewPatient: false, confirmCallDone: false, ...extra,
  });

  const appointments: Appointment[] = [
    // Today
    a("a1", "p_neha", "d_nair", T, "10:00", 30, "Scaling", "completed", "c2"),
    a("a2", "p_meera", "d_khan", T, "10:00", 30, "Consultation", "in_chair", "c1"),
    a("a3", "p_rahul", "d_khan", T, "11:00", 60, "Root canal", "confirmed", "c1"),
    a("a4", "p_anjali", "d_nair", T, "11:30", 30, "Check-up and cleaning", "checked_in", "c2"),
    a("a5", "p_vikram", "d_nair", T, "12:00", 30, "Filling", "booked", "c2"),
    a("a6", "p_suresh", "d_mehta", T, "13:00", 60, "Wisdom tooth removal", "confirmed"),
    a("a7", "p_sana", "d_khan", T, "14:00", 30, "Check-up and cleaning", "booked", "c1"),
    a("a8", "p_kavita", "d_khan", T, "15:00", 45, "Crown", "confirmed", "c1"),
    a("a9", "p_deepak", "d_khan", T, "16:00", 20, "Consultation", "booked", "c1", { isNewPatient: true, confirmCallDone: true }),
    a("a10", "p_rohan", "d_khan", T, "17:00", 30, "Filling", "booked", "c2"),
    // Tomorrow: new patients need an evening confirmation call
    a("a11", "p_priya", "d_nair", d(1), "11:00", 20, "Consultation", "booked", "c2", { isNewPatient: true }),
    a("a12", "p_farhan", "d_nair", d(1), "12:00", 30, "Braces consultation", "booked", "c2", { isNewPatient: true }),
    a("a13", "p_lakshmi", "d_khan", d(1), "16:00", 30, "Check-up and cleaning", "booked", "c1"),
    a("a14", "p_ashok", "d_khan", d(1), "11:00", 20, "Consultation", "booked", "c1"),
    // Past
    a("a20", "p_rahul", "d_khan", d(-8), "11:00", 60, "Root canal", "completed", "c1"),
    a("a21", "p_kavita", "d_khan", d(-21), "15:00", 60, "Root canal", "completed", "c1"),
    a("a22", "p_meera", "d_khan", d(-40), "12:00", 30, "Scaling", "completed", "c1"),
    a("a23", "p_lakshmi", "d_khan", d(-180), "16:00", 30, "Check-up and cleaning", "completed", "c1"),
    a("a24", "p_vikram", "d_nair", d(-3), "12:00", 30, "Consultation", "no_show", "c2"),
    a("a25", "p_anjali", "d_nair", d(-190), "11:00", 30, "Scaling", "completed", "c2"),
    a("a26", "p_ashok", "d_khan", d(-14), "11:00", 20, "Consultation", "completed", "c1"),
    a("a27", "p_suresh", "d_khan", d(-10), "10:30", 20, "Consultation", "completed", "c1"),
    a("a28", "p_moumita", "d_khan", d(-17), "17:00", 30, "Filling", "completed", "c2"),
    a("a29", "p_gopal", "d_khan", d(-24), "12:00", 30, "Extraction", "completed", "c1"),
  ];

  const m = (dir: "in" | "out", author: Message["author"], text: string, at: string, extra: Partial<Message> = {}): Message => ({
    id: "m_" + Math.random().toString(36).slice(2, 9), dir, author, text, at,
    status: dir === "in" ? "received" : "read", category: dir === "out" ? "service" : undefined, cost: 0, ...extra,
  });

  const conversations: Conversation[] = [
    {
      id: "cv_sana", patientId: "p_sana", contactName: "Sana Shaikh", phone: "+91 96320 77889", channel: "whatsapp", lang: "hi",
      mode: "staff", booked: true, unread: 2, lastInboundAt: minsAgo(8), unreadableCount: 0,
      messages: [
        m("in", "patient", "Namaste, mera appointment aaj 2 baje hai na?", minsAgo(14)),
        m("out", "ai", "Ji haan Sana ji, aaj 2:00 baje Dr Khan ke saath aapka check-up hai.", minsAgo(13), { authorName: "AI front desk" }),
        m("in", "patient", "Raat se gaal sujh gaya hai aur dard bhi hai", minsAgo(8)),
        m("out", "system", "बताने के लिए धन्यवाद। हम यह अभी डॉक्टर को भेज रहे हैं, क्लिनिक जल्द ही आपको फ़ोन करेगा। अगर तकलीफ़ बढ़ रही है तो कृपया क्लिनिक आएं या नज़दीकी अस्पताल जाएं।", minsAgo(8), { authorName: "Safety reply" }),
      ],
    },
    {
      id: "cv_ashok", patientId: "p_ashok", contactName: "Ashok Kumar", phone: "+91 98860 33445", channel: "whatsapp", lang: "hi",
      mode: "staff", booked: false, unread: 1, lastInboundAt: minsAgo(25), unreadableCount: 0,
      messages: [
        m("in", "patient", "Doctor ne implant bola tha pichli baar", hoursAgo(26)),
        m("out", "staff", "Ji Ashok ji, Dr Khan ne plan banaya hai. Counsellor aapko call karengi.", hoursAgo(25.5), { authorName: "Farah (Counsellor)" }),
        m("in", "patient", "Root canal ka kharcha kitna hoga? Implant bahut mehenga hai", minsAgo(25)),
        m("out", "system", "धन्यवाद। हमारी टीम का कोई सदस्य जल्द ही यहीं जवाब देगा।", minsAgo(25), { authorName: "Holding reply" }),
      ],
    },
    {
      id: "cv_meera", patientId: "p_meera", contactName: "Meera Devi", phone: "+91 98450 11223", channel: "whatsapp", lang: "hi",
      mode: "ai", booked: true, unread: 0, lastInboundAt: hoursAgo(20), unreadableCount: 0,
      messages: [
        m("in", "patient", "Mujhe check-up ke liye kal ka time chahiye", hoursAgo(20.2)),
        m("out", "ai", "Namaste Meera ji. Kal 10:00 baje ya 12:00 baje, kaun sa theek rahega? 1 ya 2 bhejein.", hoursAgo(20.2), { authorName: "AI front desk" }),
        m("in", "patient", "1", hoursAgo(20)),
        m("out", "system", "नमस्ते Meera Devi, आपकी Consultation की अपॉइंटमेंट " + "आज 10:00 am को Dr Imran Khan के साथ बुक हो गई है। बदलाव करना हो तो यहीं जवाब दें या क्लिनिक को फ़ोन करें।", hoursAgo(20), { template: "appointment_booked", category: "utility", cost: 0.12, authorName: "Template" }),
        m("out", "system", "नमस्ते Meera Devi, आज 10:00 am पर क्लिनिक में आपकी अपॉइंटमेंट है। हम आपका इंतज़ार करेंगे।", hoursAgo(2.7), { template: "reminder_2h", category: "utility", cost: 0.12, authorName: "Template" }),
      ],
    },
    {
      id: "cv_farhan", patientId: "p_farhan", contactName: "Farhan Ali", phone: "+91 99001 43445", channel: "instagram", lang: "en",
      mode: "ai", booked: true, unread: 1, lastInboundAt: minsAgo(4), unreadableCount: 0,
      messages: [
        m("in", "patient", "Hi, do you do braces? My teeth are a bit crooked", hoursAgo(14.5)),
        m("out", "ai", "Hi Farhan, yes, Dr Priya Nair sees braces cases. Would tomorrow 12:00 pm or Saturday 11:00 am work for a braces consultation? Reply 1 or 2.", hoursAgo(14.5), { authorName: "AI front desk" }),
        m("in", "patient", "1", hoursAgo(14.4)),
        m("out", "ai", "Done. You are booked for tomorrow 12:00 pm with Dr Priya Nair.", hoursAgo(14.4), { authorName: "AI front desk" }),
        m("in", "patient", "Also are aligners better than braces?", minsAgo(4)),
      ],
    },
    {
      id: "cv_lakshmi", patientId: "p_lakshmi", contactName: "Lakshmi Iyer", phone: "+91 98862 54556", channel: "whatsapp", lang: "en",
      mode: "ai", booked: true, unread: 0, lastInboundAt: hoursAgo(19), unreadableCount: 0,
      messages: [
        m("in", "patient", "Please send my x-ray report from last visit, I need it for my insurance", hoursAgo(19)),
        m("out", "system", "Thank you. We have noted your request and the clinic will share it within 72 hours.", hoursAgo(19), { authorName: "Holding reply" }),
      ],
    },
    {
      id: "cv_priya", patientId: "p_priya", contactName: "Priya Singh", phone: "+91 90080 44556", channel: "website", lang: "en",
      mode: "closed", booked: true, unread: 0, lastInboundAt: hoursAgo(16), unreadableCount: 0,
      messages: [
        m("in", "patient", "Website booking: Consultation, tomorrow 11:00 am. Note: tooth sensitivity on the left side.", hoursAgo(16.5)),
        m("out", "system", "Hello Priya Singh, your appointment for Consultation is booked for tomorrow, 11:00 am with Dr Priya Nair. If you need to change it, reply here or call the clinic.", hoursAgo(16.5), { template: "appointment_booked", category: "utility", cost: 0.12, authorName: "Template" }),
        m("in", "patient", "Thanks!", hoursAgo(16)),
      ],
    },
    {
      id: "cv_vikram", patientId: "p_vikram", contactName: "Vikram Rao", phone: "+91 98440 66778", channel: "whatsapp", lang: "en",
      mode: "staff", booked: true, unread: 0, lastInboundAt: hoursAgo(5), unreadableCount: 0,
      messages: [
        m("out", "system", "Hello Vikram Rao, we missed you at your appointment today. Would one of these times suit you? 1) Thu, 12:00 pm 2) Fri, 4:00 pm. Reply 1 or 2 and we will book it.", ist(d(-3), "13:00"), { template: "missed_you", category: "utility", cost: 0.12, authorName: "Template" }),
        m("in", "patient", "1. Will the filling hurt?", hoursAgo(5)),
        m("out", "staff", "Don't worry, it's a completely painless procedure with our best dentist!", hoursAgo(4.9), { authorName: "Sunita (Front desk)", status: "blocked", blockReason: "claims_blocked", blockDetail: 'The word "painless" is not allowed.' }),
        m("out", "staff", "Booked for Thursday 12:00 pm with Dr Priya Nair. The doctor will explain each step and you can ask her anything on the day.", hoursAgo(4.8), { authorName: "Sunita (Front desk)" }),
      ],
    },
    {
      id: "cv_missed", contactName: "Unknown caller", phone: "+91 90190 65667", channel: "call", lang: "en",
      mode: "ai", booked: false, unread: 1, lastInboundAt: minsAgo(35), unreadableCount: 0,
      messages: [
        m("in", "patient", "Missed call to the clinic number (14 s ring).", minsAgo(36)),
        m("out", "system", "Sorry, we missed your call to City Dental. How can we help? Reply here and we will get back to you, or tell us a good time for a call.", minsAgo(36), { template: "missed_call_reply", category: "utility", cost: 0.12, authorName: "Template" }),
        m("in", "patient", "Is the clinic open on Sunday?", minsAgo(35)),
        m("out", "ai", "We are open Monday to Saturday, 10:00 am to 6:00 pm, and closed on Sunday. Would you like a time on Saturday? 1) 11:00 am 2) 12:30 pm", minsAgo(35), { authorName: "AI front desk" }),
      ],
    },
    {
      id: "cv_kavita", patientId: "p_kavita", contactName: "Kavita Joshi", phone: "+91 99860 99001", channel: "whatsapp", lang: "en",
      mode: "ai", booked: true, unread: 0, lastInboundAt: ist(d(-6), "18:20"), unreadableCount: 0,
      messages: [
        m("in", "patient", "Can I come for the crown on Thursday afternoon?", ist(d(-6), "18:10")),
        m("out", "ai", "Yes Kavita. Thursday 3:00 pm with Dr Khan is free. Shall I book it? Reply 1 for yes.", ist(d(-6), "18:11"), { authorName: "AI front desk" }),
        m("in", "patient", "1", ist(d(-6), "18:20")),
        m("out", "system", "Hello Kavita Joshi, a reminder that your Crown appointment is coming up on today, 3:00 pm. Reply 1 to confirm or 2 to change the time.", hoursAgo(20), { template: "reminder_24h", category: "utility", cost: 0.12, authorName: "Template" }),
      ],
    },
  ];

  const handoffs: Handoff[] = [
    { id: "h1", conversationId: "cv_sana", rule: "H1", excerpt: "Raat se gaal sujh gaya hai aur dard bhi hai", priority: "high", createdAt: minsAgo(8), status: "open", aiStopped: true },
    { id: "h2", conversationId: "cv_ashok", rule: "H5", excerpt: "Root canal ka kharcha kitna hoga? Implant bahut mehenga hai", priority: "normal", createdAt: minsAgo(25), status: "open", aiStopped: true },
    { id: "h3", conversationId: "cv_lakshmi", rule: "H8", excerpt: "Please send my x-ray report from last visit", priority: "normal", createdAt: hoursAgo(19), status: "open", aiStopped: false, deadline: new Date(new Date(hoursAgo(19)).getTime() + 72 * 3600000).toISOString() },
    { id: "h4", conversationId: "cv_farhan", rule: "H6", excerpt: "Also are aligners better than braces?", priority: "normal", createdAt: minsAgo(4), status: "open", aiStopped: false },
    { id: "h5", conversationId: "cv_vikram", rule: "H2", excerpt: "Will the filling hurt?", priority: "normal", createdAt: hoursAgo(5), status: "resolved", aiStopped: false, resolvedBy: "u_fd", resolvedAt: hoursAgo(4.8), note: "Explained the doctor will walk him through it. Booked Thu 12:00." },
  ];

  const deal = (id: string, patientId: string, board: Deal["board"], stage: string, daysIn: number, treatment: string, source: string, value?: number, note = ""): Deal => ({
    id, patientId, board, stage, stageSince: ist(d(-daysIn), "11:00"), treatment, source, value, note,
  });

  const deals: Deal[] = [
    deal("dl1", "p_deepak", "new", "Booked", 2, "Consultation", "Missed call", 500),
    deal("dl2", "p_priya", "new", "Booked", 1, "Consultation", "Website", 500),
    deal("dl3", "p_farhan", "new", "Booked", 1, "Braces consultation", "Instagram", 95000, "Interested in aligners"),
    deal("dl4", "p_meera", "new", "Showed", 0, "Consultation", "Google search", 1500),
    deal("dl5", "p_ashok", "new", "Plan given", 14, "Implant", "Facebook ad", 32000, "Thinks it is too expensive"),
    deal("dl6", "p_rahul", "new", "In treatment", 8, "Root canal", "Google Maps", 12000),
    deal("dl7", "p_kavita", "new", "Completed", 0, "Crown", "Walk-in", 12000),
    deal("dl8", "p_suresh", "new", "In treatment", 10, "Wisdom tooth removal", "Referral", 4500),
    deal("dl9", "p_vikram", "new", "No-show", 3, "Consultation", "Website", 500),
    deal("dl10", "p_neha", "new", "Enquiry", 1, "Teeth whitening", "Website", 7000, "Asked on website chat"),
    deal("dl11", "p_moumita", "new", "Qualified", 4, "Aligners", "Referral", 95000),
    deal("dl12", "p_gopal", "new", "Lost", 20, "Implant", "Referral", 32000, "Went to another clinic"),
    deal("dl20", "p_rahul", "followup", "Booked", 1, "Root canal second sitting", "Next step", 0),
    deal("dl21", "p_ashok", "followup", "Thinking", 12, "Implant", "Next step", 32000),
    deal("dl22", "p_moumita", "followup", "Advised", 3, "Review", "Next step"),
    deal("dl23", "p_gopal", "followup", "Not interested", 18, "Review after extraction", "Next step"),
    deal("dl24", "p_kavita", "followup", "Done", 0, "Crown fitting", "Next step"),
    deal("dl30", "p_lakshmi", "recall", "Booked", 2, "6 month check-up", "Recall"),
    deal("dl31", "p_anjali", "recall", "Showed", 0, "6 month check-up", "Recall"),
    deal("dl32", "p_meera", "recall", "Due", 0, "6 month check-up", "Recall"),
    deal("dl33", "p_neha", "recall", "Sent", 3, "6 month check-up", "Recall"),
  ];

  const plans: Plan[] = [
    {
      id: "pl_rahul", patientId: "p_rahul", doctorId: "d_khan", title: "Root canal and crown, 36", status: "partly_accepted", createdAt: ist(d(-8), "12:00"),
      items: [
        { id: "pi1", treatment: "Root canal", tooth: "36", cost: 6500, accepted: true },
        { id: "pi2", treatment: "Crown", tooth: "36", cost: 5500, accepted: false },
      ],
      estimate: { token: "est-rahul-36", code: "4821", sentAt: ist(d(-8), "12:10"), validUntil: d(6), attempts: 0, locked: false, acceptedAt: ist(d(-8), "19:00") },
    },
    {
      id: "pl_ashok", patientId: "p_ashok", doctorId: "d_khan", title: "Implant, 46", status: "sent", createdAt: ist(d(-14), "11:30"),
      items: [
        { id: "pi3", treatment: "X-ray (IOPA)", tooth: "46", cost: 300 },
        { id: "pi4", treatment: "Implant", tooth: "46", cost: 32000 },
      ],
      estimate: { token: "est-ashok-46", code: "1907", sentAt: ist(d(-14), "11:40"), validUntil: d(0), attempts: 2, locked: false },
    },
    {
      id: "pl_kavita", patientId: "p_kavita", doctorId: "d_khan", title: "Root canal and crown, 26", status: "accepted", createdAt: ist(d(-21), "16:00"),
      items: [
        { id: "pi5", treatment: "Root canal", tooth: "26", cost: 6500, accepted: true },
        { id: "pi6", treatment: "Crown", tooth: "26", cost: 5500, accepted: true },
      ],
      estimate: { token: "est-kavita-26", code: "5530", sentAt: ist(d(-21), "16:10"), validUntil: d(-7), attempts: 0, locked: false, acceptedAt: ist(d(-21), "20:00") },
    },
    {
      id: "pl_moumita", patientId: "p_moumita", doctorId: "d_nair", title: "Aligners, full arch", status: "draft", createdAt: ist(d(-4), "17:30"),
      items: [
        { id: "pi7", treatment: "Aligners", cost: 95000 },
        { id: "pi8", treatment: "Check-up and cleaning", cost: 1200 },
      ],
    },
    {
      id: "pl_suresh", patientId: "p_suresh", doctorId: "d_mehta", title: "Wisdom tooth removal, 38", status: "accepted", createdAt: ist(d(-10), "11:00"),
      items: [{ id: "pi9", treatment: "Wisdom tooth removal", tooth: "38", cost: 4500, accepted: true }],
      estimate: { token: "est-suresh-38", code: "7712", sentAt: ist(d(-10), "11:05"), validUntil: d(4), attempts: 0, locked: false, acceptedAt: ist(d(-10), "13:00") },
    },
  ];

  const ns = (id: string, patientId: string, doctorId: string, label: string, createdDaysAgo: number, dueIn: number, extra: Partial<NextStep> = {}): NextStep => ({
    id, patientId, doctorId, siteId: doctorId === "d_mehta" ? "s_hosp" : "s_clinic", label,
    createdAt: ist(d(-createdDaysAgo), "12:00"), dueDate: d(dueIn), status: "open", ...extra,
  });

  const nextSteps: NextStep[] = [
    ns("n1", "p_rahul", "d_khan", "Root canal second sitting", 8, -1, { status: "booked", slotsSentAt: ist(d(-3), "10:00") }),
    ns("n2", "p_rahul", "d_khan", "Crown fitting", 8, 13),
    ns("n3", "p_moumita", "d_khan", "Review", 17, 2),
    ns("n4", "p_gopal", "d_khan", "Review after extraction", 24, -17, { status: "closed", closeReason: "Patient moved to another city" }),
    ns("n5", "p_suresh", "d_mehta", "Stitch removal", 10, 0, { slotsSentAt: ist(d(-2), "10:00") }),
    ns("n6", "p_ashok", "d_khan", "Start treatment", 14, -7, { slotsSentAt: ist(d(-9), "10:00"), reminderSentAt: ist(d(-7), "10:00") }),
    ns("n7", "p_meera", "d_khan", "Gum review", 40, -10, { slotsSentAt: ist(d(-12), "10:00"), reminderSentAt: ist(d(-10), "10:00"), callTaskDone: true }),
    ns("n8", "p_kavita", "d_khan", "Review", 0, 30),
    ns("n9", "p_lakshmi", "d_khan", "6 month check-up", 180, 1, { status: "booked" }),
    ns("n10", "p_anjali", "d_nair", "6 month check-up", 190, -10, { status: "done" }),
    ns("n11", "p_vikram", "d_nair", "Consultation rebook", 3, -3, { slotsSentAt: ist(d(-3), "13:00"), reminderSentAt: ist(d(-3), "13:00") }),
    ns("n12", "p_neha", "d_nair", "6 month check-up", 0, 180),
  ];

  const inv = (id: string, number: number, patientId: string, doctorId: string, daysAgo: number, lines: [string, number][], payments: Invoice["payments"], status: Invoice["status"], extra: Partial<Invoice> = {}): Invoice => ({
    id, number, patientId, doctorId, siteId: doctorId === "d_mehta" ? "s_hosp" : "s_clinic", createdAt: ist(d(-daysAgo), "13:00"),
    lines: lines.map(([label, amount], i) => ({ id: `${id}_l${i}`, label, amount })), payments, status, ...extra,
  });

  const invoices: Invoice[] = [
    inv("i1038", 1038, "p_kavita", "d_khan", 21, [["Root canal, 26", 6500]], [{ id: "py1", amount: 6500, at: ist(d(-21), "16:30"), method: "upi", receiptNo: "R-1038" }], "paid"),
    inv("i1039", 1039, "p_moumita", "d_khan", 17, [["Filling, 21", 1800]], [{ id: "py2", amount: 1800, at: ist(d(-17), "17:40"), method: "cash", receiptNo: "R-1039" }], "paid"),
    inv("i1040", 1040, "p_ashok", "d_khan", 14, [["Consultation", 500]], [{ id: "py3", amount: 500, at: ist(d(-14), "11:30"), method: "cash", receiptNo: "R-1040" }], "paid"),
    inv("i1041", 1041, "p_suresh", "d_khan", 10, [["Consultation", 500], ["X-ray (IOPA), 38", 300]], [{ id: "py4", amount: 800, at: ist(d(-10), "11:00"), method: "card", receiptNo: "R-1041" }], "paid"),
    inv("i1042", 1042, "p_rahul", "d_khan", 8, [["Root canal, 36", 6500]], [{ id: "py5", amount: 6300, at: ist(d(-8), "13:10"), method: "link", receiptNo: "R-1042" }], "paid", { paymentLinkSentAt: ist(d(-8), "12:30") }),
    inv("i1043", 1043, "p_neha", "d_nair", 0, [["Scaling", 1500]], [], "sent", { paymentLinkSentAt: minsAgo(10) }),
    inv("i1044", 1044, "p_meera", "d_khan", 0, [["Consultation", 500], ["X-ray (IOPA), 16", 300]], [], "draft"),
    inv("i1045", 1045, "p_vikram", "d_nair", 3, [["Consultation", 500]], [], "sent", { paymentLinkSentAt: ist(d(-3), "12:40") }),
    inv("i1046", 1046, "p_kavita", "d_khan", 0, [["Crown, 26", 5500]], [{ id: "py6", amount: 3000, at: ist(d(-1), "17:00"), method: "upi", receiptNo: "R-1046A" }], "part_paid"),
  ];

  const waivers: FeeWaiver[] = [
    { id: "w1", invoiceId: "i1042", lineId: "i1042_l0", amount: 200, reason: "Long-time patient, came back for second tooth", requestedBy: "u_fd", approverDoctorId: "d_khan", status: "approved", createdAt: ist(d(-8), "12:20"), decidedAt: ist(d(-8), "12:25"), decidedBy: "u_khan", via: "whatsapp" },
    { id: "w2", invoiceId: "i1044", lineId: "i1044_l1", amount: 300, reason: "Cousin of the owner", requestedBy: "u_fd", approverDoctorId: "d_khan", status: "pending", createdAt: minsAgo(18) },
    { id: "w3", invoiceId: "i1045", amount: 500, reason: "Patient says the clinic cancelled last time", requestedBy: "u_cs", approverDoctorId: "d_nair", status: "pending", createdAt: hoursAgo(3) },
    { id: "w4", invoiceId: "i1039", amount: 1800, reason: "Asked for full waiver, family friend", requestedBy: "u_cs", approverDoctorId: "d_khan", status: "declined", createdAt: ist(d(-17), "17:20"), decidedAt: ist(d(-17), "17:30"), decidedBy: "u_khan", via: "app" },
  ];

  return {
    version: STATE_VERSION,
    settings: {
      clinicName: "City Dental",
      slug: "city-dental",
      phone: "+91 80 4110 2200",
      hours: [
        { open: false, from: "10:00", to: "18:00" },
        { open: true, from: "10:00", to: "18:00" },
        { open: true, from: "10:00", to: "18:00" },
        { open: true, from: "10:00", to: "18:00" },
        { open: true, from: "10:00", to: "18:00" },
        { open: true, from: "10:00", to: "18:00" },
        { open: true, from: "10:00", to: "18:00" },
      ],
      contactHours: { from: "09:00", to: "21:00" },
      holidays: [
        { id: "hol1", date: "2026-11-08", label: "Diwali" },
        { id: "hol2", date: "2026-12-25", label: "Christmas" },
      ],
      aiModel: "Claude Haiku",
      handoffMinutes: 15,
    },
    sites: [
      { id: "s_clinic", name: "City Dental, Indiranagar", kind: "clinic", address: "12, 100 Feet Road, Indiranagar, Bengaluru" },
      { id: "s_hosp", name: "Sunrise Hospital (partner)", kind: "hospital", address: "Old Airport Road, Bengaluru" },
    ],
    doctors: [
      { id: "d_khan", name: "Dr Imran Khan", specialty: "General dentist", visiting: false, siteIds: ["s_clinic"], days: [1, 2, 3, 4, 5, 6] },
      { id: "d_nair", name: "Dr Priya Nair", specialty: "Endodontist and orthodontics", visiting: false, siteIds: ["s_clinic"], days: [1, 2, 4, 5, 6] },
      { id: "d_mehta", name: "Dr Arjun Mehta", specialty: "Oral surgeon (visiting)", visiting: true, siteIds: ["s_hosp"], days: [4] },
    ],
    chairs: [
      { id: "c1", name: "Chair 1", siteId: "s_clinic" },
      { id: "c2", name: "Chair 2", siteId: "s_clinic" },
    ],
    staff: [
      { id: "u_owner", name: "Ritu Sharma", role: "owner", phone: "+91 98450 00001", active: true },
      { id: "u_khan", name: "Dr Imran Khan", role: "doctor", phone: "+91 98450 00002", doctorId: "d_khan", active: true },
      { id: "u_nair", name: "Dr Priya Nair", role: "doctor", phone: "+91 98450 00003", doctorId: "d_nair", active: true },
      { id: "u_mehta", name: "Dr Arjun Mehta", role: "doctor", phone: "+91 98450 00004", doctorId: "d_mehta", active: true },
      { id: "u_fd", name: "Sunita", role: "front_desk", phone: "+91 98450 00005", active: true },
      { id: "u_cs", name: "Farah", role: "counsellor", phone: "+91 98450 00006", active: true },
      { id: "u_as", name: "Raju", role: "assistant", phone: "+91 98450 00007", active: true },
      { id: "u_msm", name: "Aman (MSM)", role: "msm_support", phone: "+91 98450 00008", active: true },
    ],
    patients,
    appointments,
    conversations,
    handoffs,
    deals,
    plans,
    nextSteps,
    invoices,
    waivers,
    activity: [
      { id: "ac1", at: minsAgo(8), text: "H1 fired for Sana Shaikh. Dr Khan alerted." },
      { id: "ac2", at: minsAgo(18), text: "Fee waiver of ₹300 asked for Meera Devi. Waiting on Dr Khan." },
      { id: "ac3", at: minsAgo(25), text: "H5 fired for Ashok Kumar. Waiting for the counsellor." },
      { id: "ac4", at: minsAgo(40), text: "Meera Devi checked in." },
    ],
  };
}

