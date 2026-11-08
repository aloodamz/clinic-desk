"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  MdOutlineToday,
  MdOutlineDashboard,
  MdOutlineGroup,
  MdOutlineInbox,
  MdOutlineReportProblem,
  MdOutlineViewKanban,
  MdOutlineDescription,
  MdOutlineUpdate,
  MdOutlineCreditCard,
  MdOutlineFactCheck,
  MdOutlineSettings,
  MdOutlineMap,
  MdMenu,
  MdClose,
  MdChevronLeft,
  MdChevronRight,
  MdSearch,
  MdOutlineNotifications,
  MdOutlineLock,
} from "react-icons/md";
import { useStore } from "@/lib/store";
import { LEVEL_LABEL, ROLES, SCREENS, levelFor } from "@/lib/access";
import type { ScreenId } from "@/lib/types";
import { ago, fmtTime12 } from "@/lib/format";
import { now } from "@/lib/clock";
import { Avatar } from "./ui";
import { InboundSimulatorModal } from "./InboundSimulatorModal";

interface NavGroup {
  label: string;
  items: {
    id: ScreenId;
    label: string;
    href: string;
    icon: ReactNode;
  }[];
}

const ICONS: Record<ScreenId, ReactNode> = {
  today: <MdOutlineToday size={15} />,
  dashboard: <MdOutlineDashboard size={15} />,
  patients: <MdOutlineGroup size={15} />,
  inbox: <MdOutlineInbox size={15} />,
  handoffs: <MdOutlineReportProblem size={15} />,
  pipeline: <MdOutlineViewKanban size={15} />,
  plans: <MdOutlineDescription size={15} />,
  followups: <MdOutlineUpdate size={15} />,
  billing: <MdOutlineCreditCard size={15} />,
  approvals: <MdOutlineFactCheck size={15} />,
  settings: <MdOutlineSettings size={15} />,
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "OVERVIEW",
    items: [
      { id: "today", label: "Today", href: "/today", icon: ICONS.today },
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: ICONS.dashboard },
    ],
  },
  {
    label: "CARE & AI DESK",
    items: [
      { id: "patients", label: "Patients", href: "/patients", icon: ICONS.patients },
      { id: "inbox", label: "Inbox", href: "/inbox", icon: ICONS.inbox },
      { id: "handoffs", label: "Handoffs", href: "/handoffs", icon: ICONS.handoffs },
      { id: "pipeline", label: "Pipeline", href: "/pipeline", icon: ICONS.pipeline },
    ],
  },
  {
    label: "CONSULTING ROOM",
    items: [
      { id: "plans", label: "Treatment Plans", href: "/plans", icon: ICONS.plans },
      { id: "followups", label: "Follow-ups", href: "/followups", icon: ICONS.followups },
    ],
  },
  {
    label: "ACCOUNT & BILLING",
    items: [
      { id: "billing", label: "Billing", href: "/billing", icon: ICONS.billing },
      { id: "approvals", label: "Approvals", href: "/approvals", icon: ICONS.approvals },
      { id: "settings", label: "Settings", href: "/settings", icon: ICONS.settings },
    ],
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const { state, user, userId, role, setUser, runJobs, toasts, toast, ready } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [simOpen, setSimOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
        setSimOpen(false);
        setNotifOpen(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F1] text-[#525866] text-sm font-medium">
        Loading ClinicDesk…
      </div>
    );
  }

  // Public estimate view renders standalone without the staff shell
  if (pathname?.startsWith("/e/")) {
    return (
      <div className="min-h-screen bg-[#F4F4F1]">
        {children}
      </div>
    );
  }

  const openHandoffs = state.handoffs.filter((h) => h.status === "open").length;
  const unreadInbox = state.conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const pendingWaivers = state.waivers.filter((w) => w.status === "pending").length;
  const totalAlerts = openHandoffs + pendingWaivers;

  // Determine current group & screen for breadcrumb
  let currentGroup = "OVERVIEW";
  let currentScreenLabel = "Today";
  let currentScreenId: ScreenId = "today";

  if (pathname === "/map") {
    currentGroup = "ARCHITECTURE";
    currentScreenLabel = "Product Map & Specs";
  } else {
    for (const g of NAV_GROUPS) {
      for (const it of g.items) {
        if (pathname === it.href || (it.id === "today" && pathname === "/")) {
          currentGroup = g.label;
          currentScreenLabel = it.label;
          currentScreenId = it.id;
        }
      }
    }
  }

  const currentAccess = levelFor(currentScreenId, role);

  const badgeFor = (id: ScreenId): { count: number; urgent?: boolean } | null => {
    if (id === "handoffs" && openHandoffs > 0) return { count: openHandoffs, urgent: true };
    if (id === "inbox" && unreadInbox > 0) return { count: unreadInbox };
    if (id === "approvals" && pendingWaivers > 0) return { count: pendingWaivers };
    return null;
  };

  // Command palette matches (strictly filtered by active role permissions)
  const q = cmdQuery.trim().toLowerCase();
  const matchedScreens = SCREENS.filter(
    (s) =>
      levelFor(s.id, role) !== "none" &&
      (!q || s.name.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q)),
  );
  const canViewPatients = levelFor("patients", role) !== "none";
  const matchedPatients = canViewPatients
    ? state.patients
        .filter((p) => (role === "doctor" && user?.doctorId ? p.assignedDoctorId === user.doctorId : true))
        .filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone.includes(q))
        .slice(0, 5)
    : [];

  return (
    <div className="min-h-screen flex bg-[#F4F4F1] text-[#111315]">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar (Responsive Drawer on <lg, Fixed Rail on >=lg) */}
      <aside
        className={`${
          collapsed ? "lg:w-[68px]" : "lg:w-[236px]"
        } ${
          mobileNavOpen
            ? "fixed inset-y-0 left-0 z-50 w-[256px] flex bg-[#F4F4F1] border-r border-[#E6E7EA] shadow-2xl"
            : "hidden lg:flex"
        } shrink-0 flex-col justify-between py-3.5 px-3 select-none transition-all duration-150 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto`}
      >
        <div className="flex flex-col gap-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2">
            <Link
              href="/today"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-2.5 min-w-0"
            >
              <span className="w-7 h-7 rounded-lg bg-[#18181B] text-white inline-flex items-center justify-center shadow-xs shrink-0">
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </span>
              {!collapsed && (
                <div className="truncate">
                  <span className="font-bold text-[15px] tracking-tight text-[#111315]">
                    {state.settings.clinicName.split(",")[0]}
                  </span>
                  <span className="text-[#868C98] font-normal text-[13px] ml-1">Clinic</span>
                </div>
              )}
            </Link>

            {mobileNavOpen ? (
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="w-6 h-6 rounded-md text-[#868C98] hover:text-[#111315] hover:bg-black/5 inline-flex items-center justify-center lg:hidden"
                aria-label="Close navigation menu"
              >
                <MdClose size={15} />
              </button>
            ) : (
              !collapsed && (
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="w-6 h-6 rounded-md text-[#868C98] hover:text-[#111315] hover:bg-black/5 hidden lg:inline-flex items-center justify-center"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <MdChevronLeft size={16} />
                </button>
              )
            )}
          </div>

          {/* Navigation Groups */}
          <nav className="flex flex-col gap-4" aria-label="Main navigation">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                {!collapsed && (
                  <div className="px-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#868C98]">
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || (item.id === "today" && pathname === "/");
                  const lvl = levelFor(item.id, role);
                  const disabled = lvl === "none";
                  const badge = badgeFor(item.id);

                  return (
                    <Link
                      key={item.id}
                      href={disabled ? "#" : item.href}
                      aria-current={active ? "page" : undefined}
                      aria-disabled={disabled || undefined}
                      onClick={(e) => {
                        if (disabled) {
                          e.preventDefault();
                          toast(`${ROLES[role]} does not have access to ${item.label}.`, "warn");
                        } else {
                          setMobileNavOpen(false);
                        }
                      }}
                      title={`${item.label} (${LEVEL_LABEL[lvl]})`}
                      className={`group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                        disabled
                          ? "opacity-35 cursor-not-allowed text-[#868C98]"
                          : active
                          ? "bg-gradient-to-b from-[#27272A] to-[#18181B] text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.12)]"
                          : "text-[#525866] hover:bg-black/[0.04] hover:text-[#111315]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`shrink-0 ${
                            active
                              ? "text-white"
                              : "text-[#667085] group-hover:text-[#111315]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </span>

                      {!collapsed && badge && (
                        <span
                          className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                            active
                              ? "bg-white/20 text-white"
                              : badge.urgent
                              ? "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]"
                              : "bg-[#E4E4E7] text-[#18181B]"
                          }`}
                        >
                          {badge.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* System Map & Interactive Spec link */}
            <div className="flex flex-col gap-0.5 pt-1 border-t border-[#E6E7EA]">
              {!collapsed && (
                <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#868C98]">
                  REFERENCE
                </div>
              )}
              <Link
                href="/map"
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  pathname === "/map"
                    ? "bg-gradient-to-b from-[#27272A] to-[#18181B] text-white font-semibold shadow-xs"
                    : "text-[#525866] hover:bg-black/[0.04] hover:text-[#111315]"
                }`}
              >
                <MdOutlineMap size={15} />
                {!collapsed && <span>Architecture Map</span>}
              </Link>
            </div>
          </nav>
        </div>

        {/* Bottom Profile & Role Switcher (Pulse Clinic style) */}
        <div className="pt-3 border-t border-[#E6E7EA] flex flex-col gap-2">
          {!collapsed && (
            <div className="px-1.5 flex items-center justify-between text-[11px] text-[#667085]">
              <span>Demo Clock · {fmtTime12(now().toISOString())}</span>
              <span className="inline-flex items-center gap-1 text-[#067647] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" /> Haiku AI
              </span>
            </div>
          )}

          <div className="bg-white/80 hover:bg-white border border-[#E6E7EA] rounded-xl p-2 flex items-center justify-between gap-2 shadow-2xs transition">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Avatar name={user.name} size={32} subtitle={ROLES[user.role]} />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <select
                    aria-label="Switch staff role"
                    value={userId}
                    onChange={(e) => setUser(e.target.value)}
                    className="select-bare !border-0 !bg-transparent !shadow-none font-bold text-[12.5px] text-[#111315] w-full truncate cursor-pointer focus:!ring-0"
                  >
                    {state.staff
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({ROLES[s.role]})
                        </option>
                      ))}
                  </select>
                  <div className="text-[11px] text-[#667085] truncate leading-tight">
                    {ROLES[role]} · {LEVEL_LABEL[currentAccess]}
                  </div>
                </div>
              )}
            </div>
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="w-6 h-6 rounded-md text-[#868C98] hover:text-[#111315] hover:bg-black/5 transition-colors inline-flex items-center justify-center"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <MdChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Inset Clinical Stage */}
      <div className="flex-1 min-w-0 p-0 sm:p-2.5 lg:pl-0 flex flex-col">
        <div className="flex-1 bg-[#FAFAFA] sm:border border-[#E6E7EA] sm:rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] flex flex-col min-h-screen sm:min-h-[calc(100vh-20px)] overflow-hidden">
          {/* Top Breadcrumb & Command Header */}
          <header className="h-13 bg-white border-b border-[#E6E7EA] px-3.5 sm:px-6 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Drawer Toggle (<lg) */}
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="w-8 h-8 rounded-lg border border-[#E6E7EA] inline-flex lg:hidden items-center justify-center text-[#525866] hover:bg-[#F4F4F5] shrink-0"
                title="Open navigation menu"
                aria-label="Open navigation menu"
              >
                <MdMenu size={17} />
              </button>
              {collapsed && (
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="w-7 h-7 rounded-lg border border-[#E6E7EA] hidden lg:inline-flex items-center justify-center text-[#525866] hover:bg-[#F4F4F5]"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <MdMenu size={16} />
                </button>
              )}
              <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-[0.08em] text-[#868C98]">
                {currentGroup}
              </span>
              <MdChevronRight size={14} className="hidden sm:inline text-[#D0D5DD]" />
              <span className="text-[13.5px] font-bold text-[#111315] truncate">
                {currentScreenLabel}
              </span>
              <span className="chip sm ml-1 hidden sm:inline-flex">
                {LEVEL_LABEL[currentAccess]}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* ⌘K Search Bar (Pulse Clinic & Medoria style) */}
              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                className="hidden md:flex items-center justify-between gap-6 bg-[#F8F8F6] hover:bg-[#F1F1EE] border border-[#E6E7EA] rounded-xl px-3 py-1.5 text-[12.5px] text-[#667085] w-[240px] transition cursor-pointer"
              >
                <span className="flex items-center gap-2 truncate">
                  <MdSearch size={15} />
                  <span>Go to or command…</span>
                </span>
                <kbd className="text-[10.5px] font-semibold bg-white border border-[#E6E7EA] rounded px-1.5 py-0.5 text-[#525866] shadow-2xs">
                  ⌘K
                </kbd>
              </button>

              {/* Simulate Patient WhatsApp button */}
              <button
                type="button"
                onClick={() => setSimOpen(true)}
                className="btn ghost sm"
                title="Simulate an incoming WhatsApp, Instagram, or voice message"
              >
                <span className="w-2 h-2 rounded-full bg-[#12B76A]" />
                Simulate WhatsApp
              </button>

              {/* Run background timers */}
              <button
                type="button"
                onClick={() => {
                  const r = runJobs();
                  toast(`Timers ran: ${r.sent} sent, ${r.blocked} blocked by send gate.`, "ok");
                }}
                className="btn ghost sm hidden sm:inline-flex"
                title="Run 24h reminders, next-step slot offers, and recalls"
              >
                Run Timers
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  className="w-8 h-8 rounded-xl bg-[#F8F8F6] hover:bg-[#F1F1EE] border border-[#E6E7EA] inline-flex items-center justify-center text-[#525866] relative cursor-pointer"
                  aria-label="Notifications"
                >
                  <MdOutlineNotifications size={16} />
                  {totalAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D92D20] text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {totalAlerts}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E6E7EA] rounded-2xl shadow-xl p-3 z-50">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0F1F3]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#525866]">
                        Clinic Activity & Alerts
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-[#868C98] hover:text-[#111315]"
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                      {state.activity.slice(0, 8).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-xs p-2 rounded-lg bg-[#F8F8F6] border border-[#F0F1F3]"
                        >
                          <div className="text-[#111315] font-medium">{ev.text}</div>
                          <div className="text-[10.5px] text-[#868C98] mt-0.5">{ago(ev.at)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Screen Body (with strict RBAC route guard) */}
          <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto">
            {pathname !== "/map" && currentAccess === "none" ? (
              <div className="h-full min-h-[420px] flex items-center justify-center">
                <div className="card max-w-md w-full text-center flex flex-col items-center gap-3">
                  <span className="text-[#B42318] inline-flex items-center justify-center">
                    <MdOutlineLock size={28} />
                  </span>
                  <h1 className="font-bold text-[18px] text-[#111315]">
                    Access Restricted ({ROLES[role]})
                  </h1>
                  <p className="text-[13px] text-[#667085]">
                    Your current role (<strong>{ROLES[role]}</strong>) does not have permission to
                    access <strong>{currentScreenLabel}</strong>. Switch to an authorized role in
                    the bottom-left profile switcher or return to an allowed screen.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Link href="/map" className="btn-ghost btn-sm">
                      View Role Matrix
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setUser("u_owner")}
                    >
                      Switch to Owner
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {/* ⌘K Command Palette Modal */}
      {cmdOpen && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="modal !p-0 overflow-hidden !max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-[#E6E7EA] flex items-center gap-2.5 bg-[#FAFAFA]">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                type="text"
                aria-label="Search screens or patients"
                placeholder="Jump to screen, search patient, or run action…"
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                className="!border-0 !bg-transparent !p-0 !shadow-none flex-1 text-sm focus:!ring-0"
              />
              <button
                type="button"
                onClick={() => setCmdOpen(false)}
                className="text-xs text-[#868C98] px-1.5 py-0.5 border border-[#E6E7EA] rounded bg-white hover:bg-[#F4F4F5] hover:text-[#111315] transition-colors"
              >
                ESC
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto flex flex-col gap-3">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#868C98] px-2 mb-1">
                  Staff Screens
                </div>
                <div className="flex flex-col gap-0.5">
                  {matchedScreens.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        router.push(s.href);
                        setCmdOpen(false);
                        setCmdQuery("");
                      }}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F4F5] text-left transition cursor-pointer"
                    >
                      <span className="font-semibold text-[13px] text-[#111315]">{s.name}</span>
                      <span className="text-xs text-[#667085] truncate max-w-[260px]">
                        {s.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {matchedPatients.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#868C98] px-2 mb-1">
                    Patients
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {matchedPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          router.push(`/patients?id=${p.id}`);
                          setCmdOpen(false);
                          setCmdQuery("");
                        }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F4F5] text-left transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Avatar name={p.name} size={24} />
                          <span className="font-semibold text-[13px] text-[#111315]">{p.name}</span>
                        </span>
                        <span className="text-xs text-[#667085]">{p.phone}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <InboundSimulatorModal open={simOpen} onClose={() => setSimOpen(false)} />

      {/* Global Toast Stack */}
      {toasts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 flex flex-col gap-2 z-50"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`bg-white border rounded-xl px-4 py-3 shadow-lg flex items-center gap-2.5 text-[13px] font-semibold max-w-sm ${
                t.kind === "bad"
                  ? "border-[#FECDCA] text-[#B42318]"
                  : t.kind === "warn"
                  ? "border-[#FEDF89] text-[#B54708]"
                  : "border-[#ABEFC6] text-[#067647]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  t.kind === "bad"
                    ? "bg-[#D92D20]"
                    : t.kind === "warn"
                    ? "bg-[#F79009]"
                    : "bg-[#12B76A]"
                }`}
              />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
