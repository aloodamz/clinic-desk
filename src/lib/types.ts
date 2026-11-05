/* Domain types for the ClinicDesk staff app (frontend only, mock data for now). */

export type Role = "owner" | "doctor" | "front_desk" | "counsellor" | "assistant" | "msm_support";

export type AccessLevel = "none" | "read" | "own" | "full" | "daily" | "funnel" | "setup";

export type ScreenId =
  | "today"
  | "inbox"
  | "handoffs"
  | "patients"
  | "pipeline"
  | "plans"
  | "followups"
  | "billing"
  | "approvals"
  | "dashboard"
  | "settings";

export type Lang = "en" | "hi";
type Channel = "whatsapp" | "instagram" | "website" | "call";

export interface Site {
  id: string;
  name: string;
  kind: "clinic" | "hospital";
  address: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  visiting: boolean;
  siteIds: string[];
  /** Weekdays the doctor works, 0 = Sunday. */
  days: number[];
}

export interface Chair {
  id: string;
  name: string;
  siteId: string;
}

export interface StaffUser {
  id: string;
  name: string;
  role: Role;
  phone: string;
  doctorId?: string;
  active: boolean;
}

export interface Consent {
  reminders: boolean;
  marketing: boolean;
  askedAt: string;
  optedOut: boolean;
}

interface DoctorAssignment {
  doctorId: string;
  from: string;
  reason: string;
  by: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  lang: Lang;
  dob: string;
  gender: "F" | "M" | "O";
  familyId?: string;
  guardianName?: string;
  assignedDoctorId: string;
  doctorHistory: DoctorAssignment[];
  consent: Consent;
  source: string;
  notes: string;
  createdAt: string;
}

export type ApptStatus =
  | "booked"
  | "confirmed"
  | "checked_in"
  | "in_chair"
  | "completed"
  | "no_show"
  | "cancelled";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  chairId?: string;
  siteId: string;
  start: string;
  durationMin: number;
  treatment: string;
  status: ApptStatus;
  isNewPatient: boolean;
  confirmCallDone: boolean;
  noMoreVisits?: boolean;
}

export type MsgAuthor = "patient" | "ai" | "staff" | "system";
type MsgStatus = "received" | "sent" | "delivered" | "read" | "blocked";
export type TemplateCategory = "utility" | "marketing" | "service";

export type BlockReason =
  | "no_consent"
  | "window_closed"
  | "outside_contact_hours"
  | "claims_blocked"
  | "opted_out";

export interface Message {
  id: string;
  dir: "in" | "out";
  author: MsgAuthor;
  authorName?: string;
  text: string;
  at: string;
  template?: string;
  category?: TemplateCategory;
  status: MsgStatus;
  blockReason?: BlockReason;
  blockDetail?: string;
  cost?: number;
}

type ConvMode = "ai" | "staff" | "closed";

export interface Conversation {
  id: string;
  patientId?: string;
  contactName: string;
  phone: string;
  channel: Channel;
  lang: Lang;
  mode: ConvMode;
  booked: boolean;
  unread: number;
  lastInboundAt?: string;
  messages: Message[];
  unreadableCount: number;
  /** Two slots offered to the patient, waiting for a "1" or "2" reply. */
  pendingSlots?: PendingSlot[];
  pendingTreatment?: string;
  pendingStepId?: string;
}

export interface PendingSlot {
  start: string;
  doctorId: string;
  chairId?: string;
  siteId: string;
  label: string;
}

export type HandoffRule = "H1" | "H2" | "H3" | "H4" | "H5" | "H6" | "H7" | "H8" | "H9" | "H10";

export interface Handoff {
  id: string;
  conversationId: string;
  rule: HandoffRule;
  excerpt: string;
  priority: "high" | "normal";
  createdAt: string;
  status: "open" | "resolved";
  aiStopped: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  note?: string;
  /** For H8, a 72 hour records deadline. */
  deadline?: string;
}

export type Board = "new" | "followup" | "recall";

export interface Deal {
  id: string;
  patientId: string;
  board: Board;
  stage: string;
  value?: number;
  source: string;
  treatment: string;
  stageSince: string;
  note: string;
}

export interface PlanItem {
  id: string;
  treatment: string;
  tooth?: string;
  cost: number;
  accepted?: boolean;
}

interface Estimate {
  token: string;
  code: string;
  sentAt: string;
  validUntil: string;
  attempts: number;
  locked: boolean;
  acceptedAt?: string;
}

export type PlanStatus = "draft" | "sent" | "accepted" | "partly_accepted" | "declined" | "expired";

export interface Plan {
  id: string;
  patientId: string;
  doctorId: string;
  title: string;
  items: PlanItem[];
  status: PlanStatus;
  createdAt: string;
  estimate?: Estimate;
}

export type NextStepStatus = "open" | "booked" | "done" | "closed";

export interface NextStep {
  id: string;
  patientId: string;
  doctorId: string;
  siteId: string;
  label: string;
  createdAt: string;
  dueDate: string;
  status: NextStepStatus;
  closeReason?: string;
  slotsSentAt?: string;
  reminderSentAt?: string;
  callTaskDone?: boolean;
}

interface InvoiceLine {
  id: string;
  label: string;
  amount: number;
}

interface Payment {
  id: string;
  amount: number;
  at: string;
  method: "link" | "cash" | "upi" | "card";
  receiptNo: string;
  refunded?: boolean;
}

export type InvoiceStatus = "draft" | "sent" | "part_paid" | "paid" | "refunded";

export interface Invoice {
  id: string;
  number: number;
  patientId: string;
  doctorId: string;
  siteId: string;
  createdAt: string;
  lines: InvoiceLine[];
  payments: Payment[];
  paymentLinkSentAt?: string;
  status: InvoiceStatus;
}

export interface FeeWaiver {
  id: string;
  invoiceId: string;
  lineId?: string;
  amount: number;
  reason: string;
  requestedBy: string;
  approverDoctorId: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  via?: "app" | "whatsapp";
}

interface Holiday {
  id: string;
  date: string;
  label: string;
}

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

export interface ClinicSettings {
  clinicName: string;
  slug: string;
  phone: string;
  hours: DayHours[];
  contactHours: { from: string; to: string };
  holidays: Holiday[];
  aiModel: string;
  handoffMinutes: number;
}

interface ActivityItem {
  id: string;
  at: string;
  text: string;
}

export interface AppState {
  version: number;
  settings: ClinicSettings;
  sites: Site[];
  doctors: Doctor[];
  chairs: Chair[];
  staff: StaffUser[];
  patients: Patient[];
  appointments: Appointment[];
  conversations: Conversation[];
  handoffs: Handoff[];
  deals: Deal[];
  plans: Plan[];
  nextSteps: NextStep[];
  invoices: Invoice[];
  waivers: FeeWaiver[];
  activity: ActivityItem[];
}
