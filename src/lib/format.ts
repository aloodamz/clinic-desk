import { TZ, now } from "./clock";

/** Build an ISO instant from an India date (YYYY-MM-DD) and time (HH:MM). */
export function ist(date: string, time = "00:00"): string {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

/** India calendar day of an instant, as YYYY-MM-DD. */
export function dayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayKey(): string {
  return dayKey(now());
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + n);
  return dayKey(d);
}

export function diffDays(fromKey: string, toKey: string): number {
  const a = new Date(`${fromKey}T12:00:00+05:30`).getTime();
  const b = new Date(`${toKey}T12:00:00+05:30`).getTime();
  return Math.round((b - a) / 86400000);
}

export function weekday(key: string): number {
  return new Date(`${key}T12:00:00+05:30`).getUTCDay();
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function fmtTime12(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function fmtDay(keyOrIso: string): string {
  const d = keyOrIso.length === 10 ? new Date(`${keyOrIso}T12:00:00+05:30`) : new Date(keyOrIso);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function fmtDate(keyOrIso: string): string {
  const d = keyOrIso.length === 10 ? new Date(`${keyOrIso}T12:00:00+05:30`) : new Date(keyOrIso);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function fmtDateTime(iso: string): string {
  return `${fmtDay(iso)}, ${fmtTime12(iso)}`;
}

export function rupees(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function rupeesPaise(n: number): string {
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function ago(iso: string): string {
  const s = Math.round((now().getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

export function age(dob: string): number {
  const t = todayKey();
  let a = Number(t.slice(0, 4)) - Number(dob.slice(0, 4));
  if (t.slice(5) < dob.slice(5)) a--;
  return a;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Mask a phone number for unauthenticated views (e.g. "+91 ••••• ••223"). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last3 = digits.slice(-3) || "000";
  return `+91 ••••• ••${last3}`;
}

/** Cryptographically secure random hex string using Web Crypto API (CWE-338 fix). */
export function secureHex(byteLength = 6): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Unbiased 4-digit OTP (1000–9999) using rejection sampling over CSPRNG. */
export function secureOtp4(): string {
  const buf = new Uint16Array(1);
  while (true) {
    globalThis.crypto.getRandomValues(buf);
    const val = buf[0]!;
    // 63000 is the largest multiple of 9000 <= 65535
    if (val < 63000) {
      return String(1000 + (val % 9000));
    }
  }
}

let counter = 0;
export function uid(prefix: string): string {
  counter = (counter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${secureHex(3)}`;
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
}

export function hhmmOf(iso: string): string {
  return fmtTime(iso);
}
