"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { doctorName } from "@/lib/selectors";
import { fmtDate, rupees } from "@/lib/format";

export default function EstimatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { state, verifyEstimateCode, acceptEstimate } = useStore();
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  if (!state) return null;

  const plan = state.plans.find((p) => p.estimate?.token === token);

  if (!plan || !plan.estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-sm text-center flex flex-col gap-3">
          <h1 className="font-bold text-lg text-[#111315]">Estimate Link Not Found</h1>
          <p className="text-sm text-[#525866]">
            This estimate link is no longer valid. Please contact the clinic.
          </p>
          <Link href="/plans" className="btn-ghost btn-sm">
            ← Back to Staff App
          </Link>
        </div>
      </div>
    );
  }

  const patient = state.patients.find((p) => p.id === plan.patientId)!;
  const selectedTotal = plan.items
    .filter((i) => checked.includes(i.id))
    .reduce((s, i) => s + i.cost, 0);
  const fullTotal = plan.items.reduce((s, i) => s + i.cost, 0);

  function submitCode() {
    const r = verifyEstimateCode(token, code);
    if (r === "ok") {
      setUnlocked(true);
      setChecked(plan!.items.map((i) => i.id));
      setError(null);
    } else if (r === "locked") {
      setError("Too many wrong attempts (5/5). This link is locked — please call the clinic.");
    } else if (r === "expired") {
      setError("This estimate has expired (14-day validity). Please contact the clinic.");
    } else {
      setError("That 4-digit code doesn't match. Please check your WhatsApp message.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F4F1]">
      <div className="card max-w-md w-full flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#E6E7EA] pb-3">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#868C98]">
              {state.settings.clinicName} · TREATMENT ESTIMATE
            </div>
            <h1 className="font-bold text-[19px] text-[#111315] mt-0.5">{plan.title}</h1>
            <p className="text-[12.5px] text-[#667085]">
              Prepared for <strong className="text-[#111315]">{patient.name}</strong> by{" "}
              {doctorName(state, plan.doctorId)}
            </p>
          </div>
          <Link href="/plans" className="btn-ghost btn-xs">
            Staff View
          </Link>
        </div>

        {!unlocked ? (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-[#525866]">
              Enter the 4-digit verification code sent to your phone ({patient.phone}) to unlock
              this treatment estimate.
            </p>
            <div className="p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA] text-[12px] text-[#525866] flex items-center justify-between">
              <span>Demo Hint (4-digit OTP code):</span>
              <button
                type="button"
                onClick={() => setCode(plan.estimate!.code)}
                className="font-mono font-bold text-[#111315] underline cursor-pointer"
              >
                {plan.estimate.code} (click to fill)
              </button>
            </div>
            <input
              className="w-full tracking-[0.35em] text-center text-[20px] font-bold tabular-nums"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
            />
            {error && (
              <div className="text-[12.5px] font-medium text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-xl p-2.5">
                {error}
              </div>
            )}
            <button
              type="button"
              className="btn w-full"
              disabled={code.length !== 4}
              onClick={submitCode}
            >
              Unlock Estimate
            </button>
          </div>
        ) : submitted ? (
          <div className="text-center py-6 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-[#ECFDF3] text-[#067647] inline-flex items-center justify-center mx-auto font-bold">
              ✓
            </div>
            <p className="font-bold text-[16px] text-[#067647]">Choice Recorded</p>
            <p className="text-[13px] text-[#525866]">
              We&apos;ve updated your treatment plan ({checked.length} of {plan.items.length} items
              accepted). The clinic will reach out on WhatsApp to confirm your slot.
            </p>
            <Link href="/plans" className="btn-ghost btn-sm mt-2 self-center">
              ← Return to Treatment Plans
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-[12px] text-[#667085]">
              Select the procedures you wish to proceed with:
            </div>
            <div className="flex flex-col gap-2">
              {plan.items.map((it) => {
                const isChecked = checked.includes(it.id);
                return (
                  <label
                    key={it.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-3 cursor-pointer transition ${
                      isChecked
                        ? "bg-[#ECFDF3]/40 border-[#ABEFC6]"
                        : "bg-[#F8F8F6] border-[#E6E7EA]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 text-[13.5px] font-medium text-[#111315]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setChecked((c) =>
                            e.target.checked ? [...c, it.id] : c.filter((x) => x !== it.id),
                          )
                        }
                      />
                      <span>
                        {it.treatment}{" "}
                        {it.tooth && (
                          <span className="text-[#667085] text-[12px]">(Tooth #{it.tooth})</span>
                        )}
                      </span>
                    </span>
                    <span className="font-bold text-[13.5px] tabular-nums">{rupees(it.cost)}</span>
                  </label>
                );
              })}
            </div>

            <div className="bg-[#F8F8F6] border border-[#E6E7EA] rounded-xl p-3 flex flex-col gap-1">
              <div className="flex justify-between text-[12.5px] text-[#667085]">
                <span>Full Estimate Value</span>
                <span className="tabular-nums">{rupees(fullTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-[14.5px] text-[#111315]">
                <span>Selected Items ({checked.length})</span>
                <span className="tabular-nums">{rupees(selectedTotal)}</span>
              </div>
            </div>

            <p className="text-[11.5px] text-[#868C98]">
              Valid until {fmtDate(plan.estimate.validUntil)}. Estimated costs; final clinical plan
              is confirmed in chair.
            </p>
            <button
              type="button"
              className="btn w-full"
              onClick={() => {
                acceptEstimate(token, checked);
                setSubmitted(true);
              }}
            >
              {checked.length === 0
                ? "Decline Estimate"
                : `Accept ${checked.length} of ${plan.items.length} Items (${rupees(selectedTotal)})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
