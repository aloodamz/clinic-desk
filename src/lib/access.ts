import type { AccessLevel, Role, ScreenId } from "./types";

export const ROLES: Record<Role, string> = {
  owner: "Owner",
  doctor: "Doctor",
  front_desk: "Front desk",
  counsellor: "Counsellor",
  assistant: "Assistant",
  msm_support: "MSM support",
};

export const LEVEL_LABEL: Record<AccessLevel, string> = {
  none: "No access",
  read: "Can look",
  own: "Own patients only",
  full: "Full access",
  daily: "Daily numbers only",
  funnel: "Funnel only",
  setup: "Setup only",
};

/** Who can open which screen. Mirrors the access table in the ClinicDesk map. */
export const ACCESS: Record<ScreenId, Record<Role, AccessLevel>> = {
  today: { owner: "full", doctor: "own", front_desk: "full", counsellor: "read", assistant: "read", msm_support: "none" },
  inbox: { owner: "full", doctor: "read", front_desk: "full", counsellor: "full", assistant: "none", msm_support: "read" },
  handoffs: { owner: "full", doctor: "full", front_desk: "full", counsellor: "full", assistant: "none", msm_support: "none" },
  patients: { owner: "full", doctor: "own", front_desk: "full", counsellor: "read", assistant: "none", msm_support: "none" },
  pipeline: { owner: "full", doctor: "read", front_desk: "full", counsellor: "full", assistant: "none", msm_support: "read" },
  plans: { owner: "full", doctor: "full", front_desk: "read", counsellor: "full", assistant: "none", msm_support: "none" },
  followups: { owner: "full", doctor: "own", front_desk: "read", counsellor: "full", assistant: "none", msm_support: "none" },
  billing: { owner: "full", doctor: "none", front_desk: "full", counsellor: "read", assistant: "none", msm_support: "none" },
  approvals: { owner: "full", doctor: "full", front_desk: "read", counsellor: "read", assistant: "none", msm_support: "none" },
  dashboard: { owner: "full", doctor: "own", front_desk: "daily", counsellor: "funnel", assistant: "none", msm_support: "funnel" },
  settings: { owner: "full", doctor: "none", front_desk: "none", counsellor: "none", assistant: "none", msm_support: "setup" },
};

export interface ScreenMeta {
  id: ScreenId;
  name: string;
  href: string;
  color: string;
  tag: "CORE" | "DESK";
  blurb: string;
}

export const SCREENS: ScreenMeta[] = [
  { id: "today", name: "Today", href: "/today", color: "var(--c-today)", tag: "CORE", blurb: "The day's schedule by doctor and chair, plus the confirmation calls to make." },
  { id: "inbox", name: "Inbox", href: "/inbox", color: "var(--c-inbox)", tag: "CORE", blurb: "Every WhatsApp, Instagram and website chat in one list." },
  { id: "handoffs", name: "Handoffs", href: "/handoffs", color: "var(--c-hand)", tag: "CORE", blurb: "Chats the AI passed to a person, with the rule that fired and a 15 minute clock." },
  { id: "patients", name: "Patients", href: "/patients", color: "var(--c-pat)", tag: "CORE", blurb: "Search patients and families. Visits, plans, bills and messages." },
  { id: "pipeline", name: "Pipeline", href: "/pipeline", color: "var(--c-pipe)", tag: "CORE", blurb: "New patient, follow-up and recall boards. Shows where patients get stuck." },
  { id: "plans", name: "Plans", href: "/plans", color: "var(--c-plans)", tag: "DESK", blurb: "Treatment plans and estimates with a code-protected link." },
  { id: "followups", name: "Follow-ups", href: "/followups", color: "var(--c-fu)", tag: "CORE", blurb: "Next steps the doctor set at the end of a visit." },
  { id: "billing", name: "Billing", href: "/billing", color: "var(--c-bill)", tag: "CORE", blurb: "Invoices, payment links, receipts and refunds." },
  { id: "approvals", name: "Approvals", href: "/approvals", color: "var(--c-appr)", tag: "CORE", blurb: "Fee waiver requests. Only a named doctor or the owner decides." },
  { id: "dashboard", name: "Dashboard", href: "/dashboard", color: "var(--c-dash)", tag: "CORE", blurb: "Money, funnel, lead sources, AI results, by doctor and by place." },
  { id: "settings", name: "Settings", href: "/settings", color: "var(--c-set)", tag: "CORE", blurb: "Hours, holidays, doctors, chairs, places, staff and roles." },
];

export function levelFor(screen: ScreenId, role: Role): AccessLevel {
  return ACCESS[screen][role];
}

