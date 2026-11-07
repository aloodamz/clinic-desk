"use client";

import { useStore } from "@/lib/store";
import { ROLES } from "@/lib/access";
import { rupeesPaise } from "@/lib/format";
import { RATES } from "@/lib/templates";
import { Avatar } from "@/components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SettingsPage() {
  const { state, updateSettings, realClock, setRealClock, resetDemo, toast } = useStore();

  if (!state) return null;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98] mb-1">
            SETTINGS · CLINIC SETUP
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-[#111315]">
            Settings
          </h1>
          <p className="text-[13.5px] text-[#667085] mt-0.5">
            Hours, holidays, doctors, chairs, places, staff, and roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              resetDemo();
              toast("Demo state reset to initial seed.", "ok");
            }}
          >
            ↺ Reset Demo Data
          </button>
        </div>
      </div>

      {/* Balanced 12-Column 2-Pane Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 6 Columns: Identity + Operating Hours + Demo Controls */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          <div className="card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                CLINIC IDENTITY &amp; CONTACT WINDOW
              </span>
              <span className="chip sm ok">Active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="text-[12.5px] flex flex-col gap-1.5">
                <span className="font-semibold text-[#525866]">Clinic Name</span>
                <input
                  className="w-full"
                  value={state.settings.clinicName}
                  onChange={(e) => updateSettings({ clinicName: e.target.value })}
                />
              </label>
              <label className="text-[12.5px] flex flex-col gap-1.5">
                <span className="font-semibold text-[#525866]">Primary Phone</span>
                <input
                  className="w-full tabular-nums"
                  value={state.settings.phone}
                  onChange={(e) => updateSettings({ phone: e.target.value })}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F0F1F3]">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#868C98]">
                  AI Receptionist
                </div>
                <div className="font-bold text-[13.5px] text-[#111315] mt-0.5">
                  {state.settings.aiModel}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#868C98]">
                  Handoff SLA Target
                </div>
                <div className="font-bold text-[13.5px] text-[#111315] mt-0.5">
                  {state.settings.handoffMinutes} minutes
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#868C98]">
                  Send Gate Window
                </div>
                <div className="font-bold text-[13.5px] text-[#111315] mt-0.5 tabular-nums">
                  {state.settings.contactHours.from} – {state.settings.contactHours.to} IST
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Operating Hours */}
          <div className="card flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                WEEKLY OPERATING HOURS
              </span>
              <span className="text-[12px] text-[#667085]">IST (Asia/Kolkata)</span>
            </div>

            <div className="divide-y divide-[#F0F1F3]">
              {state.settings.hours.map((h, i) => (
                <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 font-bold text-[13.5px] text-[#111315]">
                      {DAYS[i]}
                    </span>
                    <label className="inline-flex items-center gap-2 text-[13px] text-[#525866] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.open}
                        onChange={(e) => {
                          const hours = [...state.settings.hours];
                          hours[i] = { ...hours[i]!, open: e.target.checked };
                          updateSettings({ hours });
                          toast(`Updated ${DAYS[i]} operating status.`, "ok");
                        }}
                      />
                      <span>{h.open ? "Open" : "Closed"}</span>
                    </label>
                  </div>

                  {h.open ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        className="!py-1 !px-2 !text-[12px] tabular-nums"
                        value={h.from}
                        onChange={(e) => {
                          const hours = [...state.settings.hours];
                          hours[i] = { ...hours[i]!, from: e.target.value };
                          updateSettings({ hours });
                        }}
                      />
                      <span className="text-[#868C98]">–</span>
                      <input
                        type="time"
                        className="!py-1 !px-2 !text-[12px] tabular-nums"
                        value={h.to}
                        onChange={(e) => {
                          const hours = [...state.settings.hours];
                          hours[i] = { ...hours[i]!, to: e.target.value };
                          updateSettings({ hours });
                        }}
                      />
                    </div>
                  ) : (
                    <span className="chip sm no-dot">Weekly Off</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Rate Transparency & Demo Clock */}
          <div className="card flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
              META INDIA WHATSAPP RATES &amp; DEMO CLOCK
            </span>
            <p className="text-[12.5px] text-[#525866]">
              Marketing: <strong>{rupeesPaise(RATES.marketing)}</strong> · Utility:{" "}
              <strong>{rupeesPaise(RATES.utility)}</strong> · Service: <strong>₹0.00</strong>{" "}
              inside 24-hour customer service window (first 1,000/month). Never sell
              &ldquo;unlimited&rdquo; WhatsApp.
            </p>
            <div className="pt-2 border-t border-[#F0F1F3] flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[13px] font-medium text-[#111315] cursor-pointer">
                <input
                  type="checkbox"
                  checked={realClock}
                  onChange={(e) => {
                    setRealClock(e.target.checked);
                    toast(
                      e.target.checked
                        ? "Switched to live system clock."
                        : "Pinned to demo morning clock (10:42 AM IST).",
                      "ok",
                    );
                  }}
                />
                <span>Use real wall-clock time instead of pinned demo morning</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right 6 Columns: Doctors + Sites & Chairs + Staff Directory */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {/* Doctors */}
          <div className="card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
                CLINICIANS &amp; VISITING CONSULTANTS ({state.doctors.length})
              </span>
            </div>
            <div className="list">
              {state.doctors.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={d.name} size={34} />
                    <div>
                      <div className="font-semibold text-[13.5px] text-[#111315]">{d.name}</div>
                      <div className="text-[12px] text-[#667085]">{d.specialty}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] text-[#667085]">
                      {d.days.map((dayIdx) => DAYS[dayIdx]).join(", ")}
                    </span>
                    {d.visiting ? (
                      <span className="chip sm warn">Visiting</span>
                    ) : (
                      <span className="chip sm ok">Resident</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sites & Chairs */}
          <div className="card flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#525866]">
              PLACES &amp; DENTAL CHAIRS
            </span>
            <div className="flex flex-col gap-2.5">
              {state.sites.map((s) => {
                const siteChairs = state.chairs.filter((c) => c.siteId === s.id);
                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E6E7EA] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13.5px] text-[#111315]">{s.name}</span>
                      <span className="chip sm no-dot capitalize">{s.kind}</span>
                    </div>
                    <div className="text-[12px] text-[#667085]">{s.address}</div>
                    {siteChairs.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {siteChairs.map((c) => (
                          <span key={c.id} className="chip sm ok">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staff Directory Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {state.staff.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size={28} />
                        <span className="font-semibold text-[13.5px] text-[#111315]">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="chip sm no-dot">{ROLES[u.role]}</span>
                    </td>
                    <td className="tabular-nums text-[12.5px] text-[#525866]">{u.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
