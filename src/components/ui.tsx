"use client";

import { useId, useState, type ReactNode } from "react";
import {
  MdOutlineCalendarToday,
  MdOutlineCheckCircle,
  MdOutlineHourglassEmpty,
  MdOutlineDescription,
  MdOutlineGroup,
  MdOutlineCurrencyRupee,
  MdOutlineWarningAmber,
  MdOutlineChatBubbleOutline,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { addDays, fmtDay, initials, todayKey } from "@/lib/format";

const AVATAR_TONES = [
  { bg: "#ECFDF3", fg: "#027A48", border: "#A6F4C5" },
  { bg: "#EFF8FF", fg: "#175CD3", border: "#B2DDFF" },
  { bg: "#F4F3FF", fg: "#5925DC", border: "#D9D6FE" },
  { bg: "#FFFAEB", fg: "#B54708", border: "#FEDF89" },
  { bg: "#FDF2FA", fg: "#C11574", border: "#FCCEEE" },
  { bg: "#F0F9FF", fg: "#026AA2", border: "#B9E6FE" },
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  size = 34,
  subtitle,
}: {
  name: string;
  size?: number;
  subtitle?: string;
}) {
  const tone = AVATAR_TONES[hashName(name) % AVATAR_TONES.length]!;
  return (
    <span
      title={subtitle ? `${name} · ${subtitle}` : name}
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.border}`,
        fontSize: Math.max(10, Math.round(size * 0.36)),
      }}
      className="inline-flex items-center justify-center rounded-full font-bold shrink-0 select-none tracking-tight"
    >
      {initials(name)}
    </span>
  );
}

/** Material Design icons for KPI headers matching Pulse Clinic & Mitrasehat */
export const KpiIcons = {
  calendar: <MdOutlineCalendarToday size={13} />,
  check: <MdOutlineCheckCircle size={13} />,
  hourglass: <MdOutlineHourglassEmpty size={13} />,
  note: <MdOutlineDescription size={13} />,
  users: <MdOutlineGroup size={13} />,
  rupee: <MdOutlineCurrencyRupee size={13} />,
  alert: <MdOutlineWarningAmber size={13} />,
  message: <MdOutlineChatBubbleOutline size={13} />,
};

export function KpiCard({
  label,
  value,
  sublabel,
  trend,
  trendTone = "ok",
  icon,
  sparkline,
  onClick,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  trend?: string;
  trendTone?: "ok" | "warn" | "bad" | "info" | "neutral";
  icon?: ReactNode;
  sparkline?: number[];
  onClick?: () => void;
}) {
  const formattedVal =
    typeof value === "number" && value >= 0 && value < 10 ? `0${value}` : String(value);

  const trendColor =
    trendTone === "ok"
      ? "text-[#067647] bg-[#ECFDF3] border-[#ABEFC6]"
      : trendTone === "warn"
      ? "text-[#B54708] bg-[#FFFAEB] border-[#FEDF89]"
      : trendTone === "bad"
      ? "text-[#B42318] bg-[#FEF3F2] border-[#FECDCA]"
      : trendTone === "info"
      ? "text-[#175CD3] bg-[#EFF8FF] border-[#B2DDFF]"
      : "text-[#525866] bg-[#F4F4F5] border-[#E4E4E7]";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`bg-white border border-[#E6E7EA] rounded-2xl p-4.5 flex flex-col justify-between gap-3 shadow-[0_1px_2px_rgba(16,24,40,0.02)] transition-all ${
        onClick ? "cursor-pointer hover:border-[#18181B]/30 hover:shadow-sm" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center text-[#18181B] shrink-0"
            >
              {icon}
            </span>
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866] truncate">
            {label}
          </span>
        </div>
        {onClick && (
          <span aria-hidden="true" className="text-[#667085] select-none inline-flex">
            <MdChevronRight size={14} />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className="text-[30px] leading-none font-bold tracking-tight text-[#111315] tabular-nums">
          {formattedVal}
        </span>
        {trend && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${trendColor}`}
          >
            {trend}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <span className="text-[12.5px] text-[#667085] leading-snug">{sublabel}</span>
        {sparkline && sparkline.length > 1 && <MiniSparkline points={sparkline} />}
      </div>
    </div>
  );
}

function MiniSparkline({ points }: { points: number[] }) {
  const gradId = useId();
  const w = 78;
  const h = 26;
  const min = Math.min(...points);
  const max = Math.max(...points, min + 1);
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * (w - 4) + 2;
    const y = h - 3 - ((v - min) / (max - min)) * (h - 6);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w - 2},${h} L2,${h} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Medoria (Image 2) 7-day horizontal date strip with sleek dark active pill. */
export function DateStrip({
  selectedDate,
  onSelectDate,
  countsByDate,
}: {
  selectedDate: string;
  onSelectDate: (d: string) => void;
  countsByDate?: Record<string, number>;
}) {
  const base = todayKey();
  const days = [-2, -1, 0, 1, 2, 3, 4].map((offset) => addDays(selectedDate, offset));

  return (
    <div className="flex items-center justify-between gap-2 bg-[#F8F8F6] border border-[#E6E7EA] rounded-xl p-1.5">
      <button
        type="button"
        onClick={() => onSelectDate(addDays(selectedDate, -1))}
        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#525866] hover:bg-white hover:shadow-xs transition cursor-pointer"
        title="Previous day"
      >
        <MdChevronLeft size={18} />
      </button>

      <div className="flex items-center gap-1 overflow-x-auto flex-1 justify-around">
        {days.map((d) => {
          const active = d === selectedDate;
          const isToday = d === base;
          const dayNum = d.slice(8, 10);
          const wk = fmtDay(d).split(" ")[0]?.replace(",", "");
          const count = countsByDate?.[d] ?? 0;

          return (
            <button
              key={d}
              type="button"
              aria-pressed={active}
              aria-label={`${fmtDay(d)}, ${count} visits`}
              onClick={() => onSelectDate(d)}
              className={`px-3.5 py-1.5 rounded-lg flex flex-col items-center min-w-[54px] transition-all cursor-pointer ${
                active
                  ? "bg-gradient-to-b from-[#27272A] to-[#18181B] text-white shadow-xs"
                  : "text-[#525866] hover:bg-white hover:text-[#111315]"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-zinc-300" : "text-[#868C98]"}`}>
                {isToday ? "Today" : wk}
              </span>
              <span className="text-[14px] font-bold tabular-nums leading-tight mt-0.5">
                {dayNum}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1 ${
                  count > 0
                    ? active
                      ? "bg-emerald-400"
                      : "bg-[#18181B]/45"
                    : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      {selectedDate !== base && (
        <button
          type="button"
          onClick={() => onSelectDate(base)}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-[#E6E7EA] text-[#111315] hover:bg-[#F4F4F5] cursor-pointer"
        >
          Today
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelectDate(addDays(selectedDate, 1))}
        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#525866] hover:bg-white hover:shadow-xs transition cursor-pointer"
        title="Next day"
      >
        <MdChevronRight size={18} />
      </button>
    </div>
  );
}

/** Pulse Clinic (Image 3) Packed Circle Activity Chart with dotted background. */
export function PackedActivityChart({
  segments,
}: {
  segments: { label: string; pct: number; count: number; color: string; textColor?: string }[];
}) {
  const [s0, s1, s2] = segments;
  return (
    <div className="bg-white border border-[#E6E7EA] rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
          PATIENT ACTIVITY
        </span>
        <span className="text-[11.5px] text-[#868C98] font-medium">By care stream</span>
      </div>

      <div className="bg-dot-grid rounded-xl border border-[#F0F1F3] h-[198px] relative flex items-center justify-center overflow-hidden">
        <svg width="264" height="180" viewBox="0 0 264 180" className="overflow-visible">
          {s0 && (
            <g>
              <circle
                cx="98"
                cy="86"
                r="60"
                fill={s0.color}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <text
                x="98"
                y="84"
                textAnchor="middle"
                fill={s0.textColor ?? "#ffffff"}
                fontSize="21"
                fontWeight="700"
              >
                {s0.pct}%
              </text>
              <text
                x="98"
                y="102"
                textAnchor="middle"
                fill={s0.textColor ?? "#ffffff"}
                fontSize="10.5"
                opacity="0.88"
              >
                {s0.count} procedures
              </text>
            </g>
          )}
          {s1 && (
            <g>
              <circle
                cx="182"
                cy="66"
                r="45"
                fill={s1.color}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <text
                x="182"
                y="65"
                textAnchor="middle"
                fill={s1.textColor ?? "#ffffff"}
                fontSize="17"
                fontWeight="700"
              >
                {s1.pct}%
              </text>
              <text
                x="182"
                y="81"
                textAnchor="middle"
                fill={s1.textColor ?? "#ffffff"}
                fontSize="10"
                opacity="0.85"
              >
                {s1.count} consults
              </text>
            </g>
          )}
          {s2 && (
            <g>
              <circle
                cx="154"
                cy="129"
                r="34"
                fill={s2.color}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <text
                x="154"
                y="133"
                textAnchor="middle"
                fill={s2.textColor ?? "#ffffff"}
                fontSize="14"
                fontWeight="700"
              >
                {s2.pct}%
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-3.5">
        {segments.map((s) => (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-[#F4F4F5] text-[#3F3F46]"
          >
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.label} ({s.count})
          </span>
        ))}
      </div>
    </div>
  );
}

/** Mitrasehat (Image 1) Stacked Weekly Bar Chart with interactive tooltip. */
export function WeeklyStackedChart({
  days,
  totalLabel,
  deltaLabel,
}: {
  days: { day: string; completed: number; booked: number; inquiry: number }[];
  totalLabel: string;
  deltaLabel: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(2);
  const maxTotal = Math.max(10, ...days.map((d) => d.completed + d.booked + d.inquiry));

  return (
    <div className="bg-white border border-[#E6E7EA] rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.02)] flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#525866] mb-1">
            <span className="text-[#175CD3] inline-flex items-center justify-center">
              {KpiIcons.users}
            </span>
            Patient Statistics
          </div>
          <div className="flex items-baseline gap-2.5 mt-1">
            <span className="text-[28px] font-bold tracking-tight text-[#111315] tabular-nums">
              {totalLabel}
            </span>
            <span className="text-[11.5px] font-semibold text-[#067647] bg-[#ECFDF3] px-2 py-0.5 rounded-full border border-[#ABEFC6]">
              {deltaLabel}
            </span>
          </div>
        </div>
        <span className="text-[11.5px] font-semibold text-[#525866] bg-[#F8F8F6] border border-[#E6E7EA] px-2.5 py-1 rounded-lg">
          All Shifts · 7d
        </span>
      </div>

      <div className="grid grid-cols-7 gap-3 items-end h-[168px] pt-7 px-1">
        {days.map((d, idx) => {
          const total = d.completed + d.booked + d.inquiry;
          const hPct = Math.max(20, Math.round((total / maxTotal) * 100));
          const cPct = total ? Math.round((d.completed / total) * 100) : 33;
          const bPct = total ? Math.round((d.booked / total) * 100) : 33;
          const iPct = Math.max(0, 100 - cPct - bPct);
          const isHover = hoverIdx === idx;

          return (
            <div
              key={d.day}
              tabIndex={0}
              role="group"
              aria-label={`${d.day}: ${d.completed} completed, ${d.booked} booked, ${d.inquiry} enquiries`}
              onMouseEnter={() => setHoverIdx(idx)}
              onFocus={() => setHoverIdx(idx)}
              className="flex flex-col items-center gap-2 h-full justify-end relative cursor-pointer group"
            >
              {isHover && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-[#E6E7EA] shadow-md rounded-lg px-2.5 py-1 text-[11px] whitespace-nowrap z-10 pointer-events-none">
                  <div className="text-[#667085] font-medium">{d.day}</div>
                  <div className="font-bold text-[#111315]">{total} Patients</div>
                </div>
              )}
              <div
                style={{ height: `${hPct}%` }}
                className={`w-full max-w-[38px] rounded-xl overflow-hidden flex flex-col justify-end transition-all ${
                  isHover ? "ring-2 ring-[#2563EB]/30 scale-[1.03]" : "opacity-90"
                }`}
              >
                <div style={{ height: `${iPct}%` }} className="bg-[#DBEAFE] w-full" />
                <div style={{ height: `${bPct}%` }} className="bg-[#3B82F6] w-full border-t border-white/60" />
                <div style={{ height: `${cPct}%` }} className="bg-[#1D4ED8] w-full border-t border-white/60" />
              </div>
              <span className={`text-[11.5px] font-medium ${isHover ? "text-[#111315] font-bold" : "text-[#667085]"}`}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-[#F0F1F3] text-[12px] font-medium text-[#525866]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8]" /> Total Care (Completed)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Intermediate (Booked)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DBEAFE]" /> Self / AI Inquiry
        </span>
      </div>
    </div>
  );
}
