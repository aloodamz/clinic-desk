"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { ago, rupees } from "@/lib/format";
import { Avatar } from "@/components/ui";
import type { Board } from "@/lib/types";

const BOARDS: { id: Board; label: string; desc: string }[] = [
  {
    id: "new",
    label: "New Patients",
    desc: "First-time WhatsApp, Instagram, Google, and Walk-in enquiries",
  },
  {
    id: "followup",
    label: "Follow-ups Needed",
    desc: "Multi-visit treatments (crown fitting, second sitting, aligner review)",
  },
  {
    id: "recall",
    label: "6-Month Recalls",
    desc: "Routine scaling & check-up reminders sent automatically",
  },
];

const STAGES_BY_BOARD: Record<Board, string[]> = {
  new: [
    "Enquiry",
    "Qualified",
    "Booked",
    "Showed",
    "Plan given",
    "In treatment",
    "Completed",
    "No-show",
    "Lost",
  ],
  followup: ["Advised", "Booked", "Thinking", "Done", "Not interested"],
  recall: ["Due", "Sent", "Booked", "Showed"],
};

export default function PipelinePage() {
  const { state, moveDealStage, toast } = useStore();
  const [board, setBoard] = useState<Board>("new");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  if (!state) return null;

  const allSources = Array.from(
    new Set(state.deals.filter((d) => d.board === board).map((d) => d.source)),
  );

  const boardDeals = state.deals
    .filter((d) => d.board === board)
    .filter((d) => (sourceFilter === "all" ? true : d.source === sourceFilter));

  const stages = STAGES_BY_BOARD[board];
  const totalValue = boardDeals.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            CARE &amp; AI DESK · CONVERSION KANBAN
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Patient Pipeline
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            {BOARDS.find((b) => b.id === board)?.desc}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-[#E6E7EA] rounded-xl px-3.5 py-2 text-[12.5px]">
          <div>
            <span className="text-[#667085]">Est. Board Value: </span>
            <span className="font-bold text-[#111315] tabular-nums">{rupees(totalValue)}</span>
          </div>
          <span className="text-[#D0D5DD]">|</span>
          <div>
            <span className="text-[#667085]">Active Leads: </span>
            <span className="font-bold text-[#067647] tabular-nums">{boardDeals.length}</span>
          </div>
        </div>
      </div>

      {/* Board Switcher & Source Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E6E7EA] rounded-2xl p-3">
        <div className="seg-group flex-wrap">
          {BOARDS.map((b) => {
            const count = state.deals.filter((d) => d.board === b.id).length;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBoard(b.id);
                  setSourceFilter("all");
                }}
                className={`seg-btn ${board === b.id ? "active" : ""}`}
              >
                <span>{b.label}</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/5 tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#667085]">Source:</span>
          <select
            aria-label="Filter by source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-[12.5px]"
          >
            <option value="all">All Sources</option>
            {allSources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Responsive Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 items-start">
        {stages.map((st, idx) => {
          const items = boardDeals.filter((d) => d.stage === st);
          const colValue = items.reduce((s, d) => s + (d.value || 0), 0);

          return (
            <div
              key={st}
              className="bg-[#F2F3F5]/80 border border-[#E6E7EA] rounded-2xl p-3 flex flex-col gap-2.5 min-h-[280px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-[#E6E7EA]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#18181B]" />
                  <span className="font-bold text-[12.5px] text-[#111315]">{st}</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-white border border-[#E6E7EA] text-[#525866] tabular-nums">
                    {items.length}
                  </span>
                </div>
                {colValue > 0 && (
                  <span className="text-[11.5px] font-semibold text-[#667085] tabular-nums">
                    {rupees(colValue)}
                  </span>
                )}
              </div>

              {/* Cards */}
              {items.map((d) => {
                const pat = state.patients.find((p) => p.id === d.patientId);
                const name = pat?.name ?? "Patient";
                return (
                  <div
                    key={d.id}
                    className="bg-white border border-[#E6E7EA] rounded-xl p-3.5 shadow-2xs flex flex-col gap-2.5 hover:border-[#18181B]/30 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={name} size={28} />
                        <div className="min-w-0">
                          <Link
                            href={pat ? `/patients?id=${pat.id}` : "/patients"}
                            className="font-bold text-[13.5px] text-[#111315] hover:underline truncate block"
                          >
                            {name}
                          </Link>
                          <div className="text-[11px] text-[#868C98] tabular-nums">
                            {pat?.phone ?? ""}
                          </div>
                        </div>
                      </div>
                      <span className="chip sm no-dot shrink-0">{d.source}</span>
                    </div>

                    <div className="bg-[#F8F8F6] border border-[#F0F1F3] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-[#111315] truncate">{d.treatment}</span>
                      {d.value ? (
                        <span className="font-bold text-[#067647] tabular-nums shrink-0 ml-2">
                          {rupees(d.value)}
                        </span>
                      ) : null}
                    </div>

                    {d.note && (
                      <div className="text-[11.5px] text-[#667085] leading-snug">
                        &ldquo;{d.note}&rdquo;
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#868C98] pt-1 border-t border-[#F0F1F3]">
                      <span>In stage {ago(d.stageSince)}</span>
                    </div>

                    {/* Stage Mover Controls */}
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <button
                        type="button"
                        className="btn-ghost btn-xs"
                        disabled={idx === 0}
                        onClick={() => {
                          moveDealStage(d.id, stages[idx - 1]!);
                          toast(`Moved ${name} to ${stages[idx - 1]}.`, "ok");
                        }}
                      >
                        ←
                      </button>
                      <select
                        aria-label="Move stage"
                        value={d.stage}
                        onChange={(e) => {
                          const next = e.target.value;
                          moveDealStage(d.id, next);
                          toast(`Moved ${name} to ${next}.`, "ok");
                        }}
                        className="!py-1 !px-2 !text-[11px] font-semibold flex-1 text-center"
                      >
                        {stages.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-ghost btn-xs"
                        disabled={idx === stages.length - 1}
                        onClick={() => {
                          moveDealStage(d.id, stages[idx + 1]!);
                          toast(`Moved ${name} to ${stages[idx + 1]}.`, "ok");
                        }}
                      >
                        →
                      </button>
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-[12px] text-[#868C98] py-8 text-center">
                  No leads in {st}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
