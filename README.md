# ClinicDesk — Staff App

A staff app plus a WhatsApp AI front desk for clinics. Dental is the first specialty. This repo (`clinicdesk-staff`) is a **frontend-only prototype**: all data lives in React state persisted to `localStorage`, built on Next.js 16 (App Router), React 19 and Tailwind CSS v4. There is no backend, database, or auth in this repo. See [HANDOVER.md](./HANDOVER.md) for how this relates to `clinicdesk-v2`, the repo that actually has the API, database and background jobs.

## What ClinicDesk is

- A patient writes on WhatsApp, Instagram or the clinic website, or misses a call. The AI answers in Hindi or English, offers two time slots and books the visit.
- If the message is risky or needs a person, one of ten handoff rules (H1–H10) stops the AI and sends the chat to staff. Examples: urgent symptoms (swelling, bleeding), price talk, complaints, a records request, a child patient. See `src/lib/handoff.ts`.
- Staff run the day in the app: check patients in, end the visit with next steps, send estimates and bills, approve fee waivers.
- In the real product, background jobs message the patient on timers: 24h and 2h reminders, no-show message, aftercare, visit summary, next-step slots and reminders, review request, 6-month check-up recall. This prototype simulates that with a manual "Run background jobs" button on the Dashboard (`src/lib/store.tsx`'s `runJobs` action) instead of real timers.
- Every outgoing message passes one send gate: consent, 24-hour window, contact hours, a banned-claims check (no "painless", "guaranteed", "free", etc.). A failed check is saved as blocked with the reason. See `src/lib/sendGate.ts`.

## The 11 staff screens

| Screen | Route | What it's for |
|---|---|---|
| Today | `/today` | The day's schedule, check-in/start/end-visit flow, confirmation calls |
| Inbox | `/inbox` | Every WhatsApp/Instagram/website conversation, AI vs staff handoff |
| Handoffs | `/handoffs` | Chats the AI passed to a person, by rule (H1–H10) |
| Patients | `/patients` | Patient directory, consent, doctor history, visits/plans/invoices |
| Pipeline | `/pipeline` | Kanban boards: new patient funnel, follow-ups, 6-month recalls |
| Plans | `/plans` | Treatment plans, FDI tooth chart, code-protected estimate links |
| Follow-ups | `/followups` | Next steps set at end-of-visit, AI follow-up ladder |
| Billing | `/billing` | Invoices, payment links, receipts, fee waivers |
| Approvals | `/approvals` | Fee waiver decisions (named doctor or owner only) |
| Dashboard | `/dashboard` | Money, funnel, lead sources, visits by doctor |
| Settings | `/settings` | Clinic hours, doctors, chairs, places, staff, demo controls |

Six roles see different things — Owner, Doctor, Front desk, Counsellor, Assistant, MSM support — per the access table in `src/lib/access.ts`. Switch roles from the sidebar in the running app, or check `/map` for the full table.

Plus two routes outside the staff shell:
- `/e/[token]` — the public, code-protected patient estimate portal (accept/decline treatment plan items)
- `/map` — an in-app reference for the screen access table, H1–H10 handoff rules, and WhatsApp templates

## Product decisions carried into this prototype

These were decided for the real product and this prototype follows them where they touch the UI or copy:

- **AI model**: Claude Haiku (decided Oct 2026 — cheaper, and judged enough; an earlier Sonnet decision is out of date, pending the 200-chat accuracy test). This prototype's "AI" is a scripted stand-in (`src/lib/ai.ts`) since there's no backend to call a real model from.
- **Pricing**: Rs 5,000/month plus WhatsApp messages at actual cost. Never sell "unlimited" WhatsApp — message cost is passed on. Rates baked into `src/lib/templates.ts` (Meta India, from 1 Oct 2026, before GST): marketing Rs 0.86, utility Rs 0.12. Replies inside 24 hours are free up to 1,000/month, then ~Rs 0.12 (that 1,000/month cap is defined but **not yet enforced** — see Known limitations).
- **Wording**: say "costs", not "fees", in anything patient- or client-facing. A fee waiver is never called "free" — only a named doctor or the owner approves it, and the UI always shows who approved it.
- **The AI never diagnoses and never names a medicine.** This is enforced by the H1–H10 rules running before any AI reply, not by trusting the model.
- **Health data residency**: the real product keeps health data in India (Supabase Mumbai, Lightsail, Cloudflare) and production must refuse dev settings. Not applicable to this repo directly (no backend here) but binding on whatever backend eventually serves this UI.
- **CORE vs DESK tagging**: work is tagged CORE (two or more "desks"/specialties need it — inbox, shared CRM, booking, consent, WhatsApp) or DESK (dental-clinic-only). CORE items are meant to go to a shared "MSM Desk Core" project rather than being rebuilt per-desk. This prototype doesn't enforce that split technically, but keep it in mind before adding dental-specific logic to something that's really CORE.

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000, redirects to /today
```

Demo data seeds itself into `localStorage` on first load — a fictional clinic called **City Dental**, not Hot Tooth (the real product's first two paying clinics are reportedly Hot Tooth, two branches, and City Dental as the demo clinic shown to prospects; this prototype only models City Dental). Switch roles from the sidebar to see role-based screen access. Settings → Demo has a "Reset demo data" button if state gets into a weird spot, plus a toggle to switch from the pinned demo clock to the real one.

### Scripts

```bash
npm run dev         # dev server (Turbopack)
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npx knip              # dead-code / unused-export check
```

## Project structure

```
src/
  app/
    layout.tsx         Root layout: Inter font, StoreProvider, Shell
    globals.css         Design tokens (Tailwind v4 @theme), component classes
    today/ inbox/ handoffs/ patients/ pipeline/ plans/
    followups/ billing/ approvals/ dashboard/ settings/
      page.tsx           One route per staff screen
    e/[token]/page.tsx   Public estimate portal (no Shell)
    map/page.tsx         Reference: screens, handoff rules, templates

  components/
    Shell.tsx            Sidebar nav, role switcher, command palette, toasts
    ui.tsx               Avatar, KpiCard, DateStrip, chart components
    InboundSimulatorModal.tsx   Demo tool: simulate an inbound patient message

  lib/
    types.ts             Domain types (Patient, Appointment, Conversation, ...)
    store.tsx             The whole app: React Context + actions, persisted to localStorage
    seed.ts               Demo data for "City Dental"
    access.ts             Role → screen access table
    handoff.ts             H1–H10 safety rules
    sendGate.ts            Consent / 24h window / contact hours / claims check
    templates.ts            WhatsApp message templates (EN + HI) and rates
    dentalPack.ts            Treatment costs, durations, aftercare, FDI tooth chart
    ai.ts                     Fake AI front desk for the demo
    selectors.ts / format.ts / clock.ts   Pure helpers
```

Everything funnels through `src/lib/store.tsx`: one `useStore()` hook exposes the current `AppState` plus every action (`bookAppointment`, `sendEstimate`, `recordPayment`, `simulateInbound`, ...). Screens are thin — they read from `state` and call actions; business logic (handoff rules, the send gate, billing math) lives in `src/lib`.

## Known limitations

- No backend — state persists to `localStorage` in one browser, but there's no multi-user sync, no real WhatsApp/Instagram sending, no real auth, no payment gateway, no call tracking, no ads sync.
- No automated tests yet.
- `FREE_SERVICE_PER_MONTH` (the 1,000-free-replies/month rule above) is defined in `templates.ts` but not enforced by the send gate.
- Only City Dental is modeled; Hot Tooth (and its two branches) from the real product plan isn't in the seed data.

See [CHANGELOG.md](./CHANGELOG.md) for what's shipped and [HANDOVER.md](./HANDOVER.md) for the full product context, open questions, and who's waiting on what.
