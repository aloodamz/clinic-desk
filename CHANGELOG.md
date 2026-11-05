# Changelog

All notable changes to this repo. Dates are in IST. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## 2026-11-05

### Added
- Initial scaffold: Next.js 16 (App Router) + React 19 + TypeScript, `src/lib` domain layer (types, store, seed data, handoff rules, send gate, templates, dental pack).
- `src/lib/dentalPack.ts` — treatment costs, durations and aftercare steps (was present in the original scaffold as an empty file; written from scratch).
- All 11 staff screens built out: Today, Inbox, Handoffs, Patients, Pipeline, Plans, Follow-ups, Billing, Approvals, Dashboard, Settings.
- `src/components/Shell.tsx` — sidebar navigation, role switcher, ⌘K command palette, notification bell, toast stack.
- `src/components/ui.tsx` — `Avatar`, `KpiCard`, `DateStrip`, `PackedActivityChart`, `WeeklyStackedChart`.
- `src/components/InboundSimulatorModal.tsx` — demo tool to simulate an inbound WhatsApp/Instagram message and watch the H1–H10 rules and AI front desk respond.
- Public estimate portal at `/e/[token]`: 4-digit code entry (locks after 5 wrong attempts), item-by-item accept/decline.
- `/map` reference page: screen access table by role, H1–H10 handoff rules, WhatsApp template catalog.
- Tailwind CSS v4 design system ("Pulse Clinic / Medoria / Mitrasehat" visual reference): warm-stone canvas, white inset stage, soft semantic status pills, Inter font via `next/font/google`.
- Interactive FDI tooth chart picker on the Plans screen.
- `git init` — this repo had no version control before this point.
- `knip` added as a dev dependency for ongoing dead-code checks.

### Fixed
- **Production build crash**: `globals.css` defined `--font-sans`/`--font-mono` as self-referential CSS custom properties inside `@theme` (which compiles onto `:root` in Tailwind v4), causing a Turbopack internal panic in `next build`. Dev mode masked this. Renamed the raw values to `--font-sans-raw`/`--font-mono-raw`.
- **Rules-of-Hooks violation** in `inbox/page.tsx`: a dead `if (!state) return null` sat before a `useEffect` call. Removed (the guard was unreachable anyway — `Shell.tsx` already gates rendering until the store is ready).
- **ESLint wasn't running at all**: `eslint-config-next@15.5.29` was incompatible with the installed `eslint@9.39.5` (legacy compatibility patch crashed on load). Upgraded to `eslint-config-next@16.4.5` to match the installed Next.js version.
- A mixed `??`/`||` operator in `store.tsx` (`endVisit`'s draft-invoice logic) that failed to parse without explicit parens.
- A stray `require("./dentalPack")` inside `store.tsx` (CJS in an ESM/Turbopack bundle) replaced with a static import.

### Removed (dead code, via Knip)
- Unused dependency `@fontsource/mukta` (superseded by `next/font/google` Inter).
- 10 fully-dead exports: `screenById`, `canEdit`, `isRealClock`, `hhmmOf`, `planTotal`, `patientName`, `siteName`, `BLOCK_LABEL`, `firstName`, unused `NewAppointment`/`Toast` re-exports.
- 15 more symbols de-exported (kept internally, removed from each module's public surface): `guessTreatment`, `DEMO_START`, `PACK`, `apptEnd`, `isClinicOpen`, `claimsHit`, and the `types.ts` interfaces `Channel`, `DoctorAssignment`, `MsgStatus`, `ConvMode`, `Estimate`, `InvoiceLine`, `Payment`, `Holiday`, `DayHours`, `ActivityItem`.

### Known gaps
- `FREE_SERVICE_PER_MONTH` (1,000 free service replies/month) is defined in `templates.ts` but not enforced by `sendGate.ts`.
- No automated test suite.
