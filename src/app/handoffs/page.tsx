"use client";

import { useState } from "react";
import Link from "next/link";
import { MdCheck } from "react-icons/md";
import { useStore } from "@/lib/store";
import { ROLES } from "@/lib/access";
import { RULES, ruleDef } from "@/lib/handoff";
import { ago, fmtDateTime } from "@/lib/format";
import { now } from "@/lib/clock";
import { Avatar, KpiCard, KpiIcons } from "@/components/ui";

export default function HandoffsPage() {
  const { state, resolveHandoff, toast } = useStore();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [ruleFilter, setRuleFilter] = useState<string>("all");
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  if (!state) return null;

  const slaMin = state.settings.handoffMinutes ?? 15;
  const openList = state.handoffs.filter((h) => h.status === "open");
  const resolvedList = state.handoffs.filter((h) => h.status === "resolved");

  const withinSla = openList.filter((h) => {
    const wait = Math.round((now().getTime() - new Date(h.createdAt).getTime()) / 60000);
    return wait <= slaMin;
  }).length;
  const pausedThreads = state.conversations.filter((c) => c.mode === "staff").length;

  const list = (tab === "open" ? openList : resolvedList).filter((h) =>
    ruleFilter === "all" ? true : h.rule === ruleFilter,
  );

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            CARE · SAFETY HANDOFFS
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Handoffs (H1–H10)
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            Chats the AI passed to a person, with the rule that fired and a {slaMin}-minute clock.
          </p>
        </div>

        <Link href="/inbox" className="btn-ghost">
          Open Inbox Threads ›
        </Link>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="OPEN HANDOFFS"
          value={openList.length}
          sublabel="Awaiting human resolution"
          trend={openList.length > 0 ? "Action required" : "Queue clear"}
          trendTone={openList.length > 0 ? "bad" : "ok"}
          icon={KpiIcons.alert}
        />
        <KpiCard
          label="WITHIN 15M SLA"
          value={`${withinSla}/${openList.length || 0}`}
          sublabel={`Target response under ${slaMin}m`}
          trend={withinSla === openList.length ? "100% on time" : "SLA breach"}
          trendTone={withinSla === openList.length ? "ok" : "warn"}
          icon={KpiIcons.hourglass}
        />
        <KpiCard
          label="AI PAUSED THREADS"
          value={pausedThreads}
          sublabel="Currently in Staff mode"
          trend="Safe fallback"
          trendTone="neutral"
          icon={KpiIcons.message}
        />
        <KpiCard
          label="RESOLVED"
          value={resolvedList.length}
          sublabel="Closed with audit note"
          trend="Audited"
          trendTone="ok"
          icon={KpiIcons.check}
        />
      </div>

      {/* Main 12-Column Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Columns: Active Queue */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E6E7EA] rounded-2xl p-3.5">
            <div className="seg-group">
              <button
                type="button"
                onClick={() => setTab("open")}
                className={`seg-btn ${tab === "open" ? "active" : ""}`}
              >
                Open Queue ({openList.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("resolved")}
                className={`seg-btn ${tab === "resolved" ? "active" : ""}`}
              >
                Resolved ({resolvedList.length})
              </button>
            </div>

            <select
              aria-label="Filter by rule"
              value={ruleFilter}
              onChange={(e) => setRuleFilter(e.target.value)}
              className="text-[12.5px]"
            >
              <option value="all">All Safety Rules (H1–H10)</option>
              {RULES.map((r) => (
                <option key={r.rule} value={r.rule}>
                  {r.rule} — {r.when}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3.5">
            {list.map((h) => {
              const conv = state.conversations.find((c) => c.id === h.conversationId)!;
              const wait = Math.round(
                (now().getTime() - new Date(h.createdAt).getTime()) / 60000,
              );
              const overSla = wait > slaMin;
              const def = ruleDef(h.rule);

              return (
                <div key={h.id} className="card flex flex-col gap-3.5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Avatar name={conv.contactName} size={38} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[15px] text-[#111315]">
                            {conv.contactName}
                          </span>
                          <span className={`chip sm ${h.priority === "high" ? "bad" : "warn"}`}>
                            {h.rule} · {def.when}
                          </span>
                          {h.status === "open" && (
                            <span className={`chip sm ${overSla ? "bad" : "warn"}`}>
                              {wait}m waiting {overSla ? `(Over ${slaMin}m SLA)` : ""}
                            </span>
                          )}
                          {h.deadline && (
                            <span className="chip sm bad">
                              72h Deadline: {fmtDateTime(h.deadline)}
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[#667085] mt-0.5">
                          Routes to:{" "}
                          <span className="font-semibold text-[#111315]">
                            {def.goesTo.map((rk) => ROLES[rk]).join(", ")}
                          </span>{" "}
                          · {conv.phone} · Triggered {ago(h.createdAt)}
                        </div>
                      </div>
                    </div>

                    <Link href="/inbox" className="btn-ghost btn-sm">
                      Open Chat ›
                    </Link>
                  </div>

                  {/* Trigger Quote Box */}
                  <div className="bg-[#F8F8F6] border border-[#E6E7EA] rounded-xl p-3 text-[13px] text-[#111315]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#868C98] mb-1">
                      Patient Trigger Excerpt
                    </div>
                    <div>&ldquo;{h.excerpt}&rdquo;</div>
                    {def.note && (
                      <div className="text-[11.5px] text-[#B54708] font-medium mt-1.5">
                        Policy note: {def.note}
                      </div>
                    )}
                  </div>

                  {h.status === "open" ? (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        className="flex-1"
                        placeholder="Resolution note (e.g. Called patient, booked emergency slot at 4:00 PM)…"
                        value={noteById[h.id] ?? ""}
                        onChange={(e) =>
                          setNoteById((n) => ({ ...n, [h.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => {
                          resolveHandoff(
                            h.id,
                            noteById[h.id]?.trim() || "Handled by staff (kept in Staff mode)",
                            false,
                          );
                          toast("Handoff resolved (kept in Staff mode).", "ok");
                        }}
                      >
                        Resolve (Keep Staff)
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          resolveHandoff(
                            h.id,
                            noteById[h.id]?.trim() || "Resolved & handed back to AI",
                            true,
                          );
                          toast("Handoff resolved & AI resumed.", "ok");
                        }}
                      >
                        Resolve &amp; Resume AI
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[12.5px] text-[#067647] bg-[#ECFDF3] border border-[#ABEFC6] rounded-xl px-3.5 py-2">
                      <span className="inline-flex items-center gap-1">
                        <MdCheck size={14} />
                        Resolved: <strong className="font-semibold">{h.note}</strong>
                      </span>
                      {h.resolvedAt && <span>{ago(h.resolvedAt)}</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {list.length === 0 && (
              <div className="card text-center py-12 text-[#868C98]">
                No {tab} handoffs matching this filter.
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Columns: H1–H10 Safety Rules Reference */}
        <div className="lg:col-span-4 card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
              H1–H10 SAFETY RULES REFERENCE
            </span>
            <span className="chip sm core">Hard-coded</span>
          </div>
          <p className="text-[12.5px] text-[#667085] mb-3.5">
            Plain word checks run before any AI call. A false alarm costs a phone call; a missed
            urgent case costs a patient.
          </p>

          <div className="divide-y divide-[#F0F1F3]">
            {RULES.map((r) => (
              <div key={r.rule} className="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[12.5px] text-[#111315]">
                    {r.rule} · {r.when}
                  </span>
                  <span className={`chip sm ${r.aiStops ? "bad" : "info"}`}>
                    {r.aiStops ? "AI Stops" : "Continues"}
                  </span>
                </div>
                <div className="text-[11.5px] text-[#667085]">
                  Routes to: {r.goesTo.map((roleKey) => ROLES[roleKey]).join(" + ")}
                  {r.note ? ` · ${r.note}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
