"use client";

import { useState } from "react";
import { MdClose, MdOutlineMic } from "react-icons/md";
import { useStore } from "@/lib/store";
import { Avatar } from "./ui";

const PRESET_SCENARIOS = [
  {
    label: "H1 · Severe pain & swelling",
    text: "Doctor sahab mujhe kal raat se daant mein bahut tez dard aur swelling hai, bleeding bhi ho rahi hai",
  },
  {
    label: "H5 · Price inquiry (Root canal)",
    text: "Root canal ka kharcha kitna hoga? Implant bahut mehenga hai",
  },
  {
    label: "H2 · Medicine / painkiller question",
    text: "Which painkiller or antibiotic tablet should I take for toothache?",
  },
  {
    label: "H6 · Aligners / Implant consult",
    text: "Hi, I want to enquire about Invisalign aligners and dental implants.",
  },
  {
    label: "H8 · Request X-ray / bill copy",
    text: "Please send my x-ray report and invoice copy from last visit.",
  },
];

export function InboundSimulatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, simulateInbound, toast } = useStore();
  const [convId, setConvId] = useState(state?.conversations[0]?.id ?? "");
  const [text, setText] = useState("");

  if (!open || !state) return null;

  const conv = state.conversations.find((c) => c.id === convId) ?? state.conversations[0];

  function send(voice = false) {
    if (!conv || (!text.trim() && !voice)) return;
    const r = simulateInbound(
      conv.id,
      text.trim() || "Voice note (0:14)",
      { voice },
    );
    if (r.kind === "handoff") {
      toast(`Safety Handoff triggered (${r.rule}): routed to staff.`, "warn");
    } else if (r.kind === "ai") {
      toast("AI front desk replied automatically.", "ok");
    } else if (r.kind === "booked") {
      toast("Slot reply recognised — appointment booked!", "ok");
    } else if (r.kind === "confirmed") {
      toast("Patient confirmed their appointment via WhatsApp.", "ok");
    } else if (r.kind === "stop") {
      toast("Patient replied STOP — opted out of marketing.", "warn");
    } else {
      toast("Message delivered to staff thread.", "ok");
    }
    setText("");
    onClose();
  }

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sim-modal-title"
      onClick={onClose}
    >
      <div className="modal !max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#868C98]">
              TEST PATIENT MESSAGE
            </div>
            <h2 id="sim-modal-title" className="font-bold text-[17px] text-[#111315] mt-0.5">
              Send a Test Patient Reply
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[#E6E7EA] text-[#667085] hover:text-[#111315] inline-flex items-center justify-center cursor-pointer"
          >
            <MdClose size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1.5">
              Patient chat
            </label>
            <select
              className="w-full"
              value={conv?.id ?? ""}
              onChange={(e) => setConvId(e.target.value)}
            >
              {state.conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contactName} ({c.channel.toUpperCase()} · {c.lang === "hi" ? "Hindi" : "English"} ·{" "}
                  {c.mode === "staff" ? "Waiting for staff" : c.mode === "ai" ? "AI replying" : "Closed"})
                </option>
              ))}
            </select>
          </div>

          {conv && (
            <div className="flex items-center justify-between gap-2 bg-[#F8F8F6] border border-[#E6E7EA] rounded-xl px-3 py-2">
              <div className="flex items-center gap-2.5">
                <Avatar name={conv.contactName} size={30} />
                <div>
                  <div className="text-[13px] font-semibold text-[#111315]">{conv.contactName}</div>
                  <div className="text-[11.5px] text-[#667085]">
                    {conv.phone} · {conv.lang === "hi" ? "Hindi / Hinglish" : "English"}
                  </div>
                </div>
              </div>
              <span className={`chip sm ${conv.mode === "staff" ? "warn" : conv.mode === "ai" ? "ok" : "no-dot"}`}>
                {conv.mode === "staff" ? "Waiting for staff" : conv.mode === "ai" ? "AI replying" : "Closed"}
              </span>
            </div>
          )}

          <div>
            <div className="text-[11.5px] font-semibold text-[#525866] mb-1.5">
              Sample messages (H1–H10 rules)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SCENARIOS.map((sc) => (
                <button
                  key={sc.label}
                  type="button"
                  onClick={() => setText(sc.text)}
                  className="text-[11.5px] font-medium px-2.5 py-1 rounded-lg bg-[#F8F8F6] hover:bg-[#EDEDEB] border border-[#E6E7EA] text-[#111315] transition cursor-pointer"
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#525866] mb-1.5">
              Patient message
            </label>
            <textarea
              className="w-full"
              rows={3}
              placeholder="Type a patient message, e.g. 'Root canal ka kharcha kitna hoga?' or '1' to pick a slot"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0F1F3]">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => send(true)}
              title="Triggers H7 voice note handoff rule"
            >
              <MdOutlineMic size={14} className="inline -mt-0.5 mr-1" />
              Send as Voice Note (H7)
            </button>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                disabled={!text.trim()}
                onClick={() => send(false)}
              >
                Simulate Inbound
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
