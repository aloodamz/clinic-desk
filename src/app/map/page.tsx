"use client";

import { useState } from "react";
import Link from "next/link";
import { ACCESS, LEVEL_LABEL, ROLES, SCREENS } from "@/lib/access";
import { RULES } from "@/lib/handoff";
import { RATES, TEMPLATES } from "@/lib/templates";
import { rupeesPaise } from "@/lib/format";
import type { Role } from "@/lib/types";

const TABS = ["Screens & Role Matrix", "H1–H10 Safety Rules", "WhatsApp Templates"] as const;

export default function MapPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Screens & Role Matrix");
  const [role, setRole] = useState<Role>("owner");

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            ARCHITECTURE · SYSTEM SPECIFICATION
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            ClinicDesk Architecture Map
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            Interactive reference of the 11 screens, 6 staff roles, H1–H10 safety handoffs, and
            Meta India WhatsApp templates.
          </p>
        </div>

        <div className="seg-group self-start">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`seg-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Screens & Role Matrix" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-white border border-[#E6E7EA] rounded-2xl p-3.5">
            <span className="text-[13px] font-semibold text-[#111315]">
              Preview Screen Permissions As Role:
            </span>
            <select
              aria-label="Preview role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {(Object.keys(ROLES) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLES[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {SCREENS.map((s) => {
              const level = ACCESS[s.id][role];
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className={`card flex flex-col justify-between gap-3 hover:border-[#18181B]/40 transition ${
                    level === "none" ? "opacity-45" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[15px] text-[#111315]">{s.name}</span>
                      <span className={`chip sm ${s.tag === "CORE" ? "core" : "desk"}`}>
                        {s.tag}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#667085] leading-snug">{s.blurb}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#F0F1F3]">
                    <span className="chip no-dot sm">{LEVEL_LABEL[level]}</span>
                    <span className="text-[12px] font-semibold text-[#111315]">Open ›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {tab === "H1–H10 Safety Rules" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Trigger Condition</th>
                <th>Routed To</th>
                <th>AI Behavior</th>
                <th>Policy Note</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.rule}>
                  <td className="font-bold text-[#111315]">{r.rule}</td>
                  <td className="font-medium text-[#111315]">{r.when}</td>
                  <td>{r.goesTo.map((x) => ROLES[x]).join(", ")}</td>
                  <td>
                    <span className={`chip sm ${r.aiStops ? "bad" : "ok"}`}>
                      {r.aiStops ? "AI Stops" : "Continues"}
                    </span>
                  </td>
                  <td className="text-[#667085]">{r.note ?? "15m SLA target"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "WhatsApp Templates" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-[#E6E7EA] rounded-2xl p-4 text-[13px] text-[#525866]">
            Meta India Per-Message Tariff: Marketing{" "}
            <strong className="text-[#111315]">{rupeesPaise(RATES.marketing)}</strong> · Utility{" "}
            <strong className="text-[#111315]">{rupeesPaise(RATES.utility)}</strong> · Service{" "}
            <strong className="text-[#111315]">₹0.00</strong> inside the 24-hour window. Never sell
            &ldquo;unlimited&rdquo;.
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Category</th>
                  <th>When Sent</th>
                  <th>English Copy</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(TEMPLATES).map((t) => (
                  <tr key={t.name}>
                    <td className="font-mono font-bold text-[12.5px] text-[#111315]">
                      {t.name}
                    </td>
                    <td>
                      <span
                        className={`chip sm ${
                          t.category === "marketing" ? "warn" : "info"
                        }`}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="text-[12.5px] text-[#525866]">{t.about}</td>
                    <td className="text-[12px] text-[#667085] max-w-md">{t.en}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
