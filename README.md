# ClinicDesk — Staff App

A staff app for ClinicDesk, a WhatsApp AI front desk for clinics (dental first). This repo (`clinicdesk-staff`) is a **frontend-only prototype**: all data lives in React state persisted to `localStorage`, built on Next.js 16 (App Router), React 19 and Tailwind CSS v4. There is no backend, database, or auth in this repo — see [HANDOVER.md](./HANDOVER.md) for how this relates to the rest of the ClinicDesk product.

## What it does

Patients message the clinic on WhatsApp, Instagram or the website. An AI front desk answers, offers appointment slots and books visits, in Hindi or English. Ten safety rules (H1–H10) stop the AI and hand the chat to a person for anything urgent, clinical, price-related, or otherwise sensitive. Staff run the clinic day from 11 screens:

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

Plus two routes outside the staff shell:
- `/e/[token]` — the public, code-protected patient estimate portal (accept/decline treatment plan items)
- `/map` — an in-app reference for the screen access table, H1–H10 handoff rules, and WhatsApp templates

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000, redirects to /today
```

Demo data seeds itself into `localStorage` on first load (a fictional clinic, "City Dental"). Switch roles from the sidebar to see role-based screen access. Settings → Demo has a "Reset demo data" button if state gets into a weird spot.

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

- No backend — refreshing clears nothing (state persists to `localStorage`), but there's no multi-user sync, no real WhatsApp sending, no real auth.
- No automated tests yet.
- `FREE_SERVICE_PER_MONTH` (the 1,000-free-replies/month rule mentioned in the handover) is defined but not enforced by the send gate.

See [CHANGELOG.md](./CHANGELOG.md) for what's shipped and [HANDOVER.md](./HANDOVER.md) for context on the wider ClinicDesk product and what to do next.
