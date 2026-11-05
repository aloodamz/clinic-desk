# Handover: ClinicDesk staff app (clinicdeck repo), 2026-11-05

For: Arindam, and whoever picks this up next. Read this before touching the code.

## 1. What this repo is, and what it isn't

This is `/Users/arindampanigrahi/Downloads/clinicdeck` — a **frontend-only prototype** of the ClinicDesk staff app, built from scratch in this session. It is **not** the `clinicdesk-v2` repo referenced in the older handover pack (`~/Downloads/ClinicDesk_handover_pack/HANDOVER.md`, dated 2026-11-05 earlier the same day) — that repo lives on a Windows PC (`C:\Users\Dell\Documents\Sovit\ClinicDesk`), was never connected in this session, and reportedly has a real API layer (`apps/api`), a staff app (`apps/staff`), Postgres, pg-boss jobs, live-ish WhatsApp integration, and 400+ tests.

This repo has none of that. There is no database, no API routes, no auth, no real WhatsApp sending. `src/lib/store.tsx` holds the entire app's state in React Context, persisted to `localStorage`. It exists to demo the product's screens, workflows and safety rules (H1–H10, the send gate, consent) without a backend.

If the goal becomes "turn this into the real product," the honest options are: (a) port this UI onto the real `clinicdesk-v2` API once that repo is located, or (b) build a backend under this repo from scratch. Neither has been started.

## 2. How this repo came to exist (read this, it matters)

This session started from a Next.js scaffold that had `src/lib/*` fully written (types, store, seed data, handoff rules, send gate, templates) but **no `src/app` directory at all** — `npm run dev` failed immediately. `src/lib/dentalPack.ts` was also an empty file despite being imported by `store.tsx`.

From there:
1. Built all 11 screens plus `/e/[token]` and `/map`, wired to the existing `lib` layer, on Tailwind CSS (later migrated from inline styles to Tailwind v4 on request).
2. **A second, independent session started editing the same files concurrently**, multiple times, without coordination. This happened at least four separate times across the session — each time producing a plausible-looking but incompatible rewrite (different component structure, then a different *data model* entirely: `Appointment.date`/`time`/`status` enum vs. the real `start`/`durationMin`/`status`, `Conversation.contactPhone` vs. `phone`, invented store methods like `moveDeal`/`setAppointmentStatus`/`updateConsent`, invented types `DealStage`/`LeadSource`/`PipelineBoard`, a `PRESETS` export from `dentalPack.ts` that was never actually added). Each collision broke the build (`Export X doesn't exist in target module`) until it was manually reconciled against the real `src/lib` types.
3. **The repo had no git until the very end of this session.** This made every one of those collisions much worse than it needed to be — there was no way to diff "what changed" or revert a bad concurrent edit; recovery meant manually re-reading every file. **Git is now initialized** (one baseline commit). If you're running Claude Code sessions concurrently against this repo again, each one should branch, or at minimum, commit before and after each session so the other can rebase/diff instead of silently clobbering.
4. A late-session "Principal Engineer audit" prompt (written for a full-stack SaaS with a database, caching layer, RBAC, Playwright E2E, etc.) was scoped down to what actually applies here, which surfaced and fixed a real **production-build-breaking bug** (see CHANGELOG) that had been latent and unnoticed because `next build` was never run — only `next dev`, which tolerated it.

**Lesson for next time:** if you're starting a new session against this repo, check `git log` and `git status` first, and don't assume `npm run dev` working means `npm run build` works — the CSS bug above is proof dev mode can hide things.

## 3. Current state

- All 11 screens + `/e/[token]` + `/map` built, wired to real data, role-access gated.
- `npm run build`, `npm run typecheck`, `npm run lint`, `npx knip` all pass clean as of this commit.
- Visual design follows a "Pulse Clinic / Medoria / Mitrasehat" reference aesthetic the user supplied as screenshots: warm-stone canvas, white inset stage, soft semantic status pills, Inter font, sidebar nav with grouped sections.
- Demo data: one fictional clinic ("City Dental"), three doctors, ~16 patients, a full day's schedule, sample conversations/handoffs/plans/invoices/waivers. See `src/lib/seed.ts`.

## 4. Known gaps / not built

- No backend, no real auth, no real WhatsApp/Instagram sending (all simulated via `InboundSimulatorModal`).
- No automated tests (no Vitest/RTL/Playwright configured).
- `FREE_SERVICE_PER_MONTH` cap (1,000 free service replies/month, mentioned in the original product handover) is defined but not enforced in `sendGate.ts`.
- Payment gateway, call tracking, ads sync, voice-note transcription — none of this applies here; those were always backend/integration concerns in the real product, not this prototype.

## 5. Next steps, suggested order

1. If you want this to become the real product: find the `clinicdesk-v2` repo (it's on a different machine per the older handover) and decide whether to port this UI onto its API, or treat this as the new frontend-first direction and build a backend under it.
2. If staying frontend-only for now: add a minimal test setup (Vitest for `src/lib` business logic — handoff rules, send gate, billing math — these are pure functions and cheap to test) before adding more screens.
3. Enforce `FREE_SERVICE_PER_MONTH` in `sendGate.ts` if that business rule still matters.
4. Keep committing to git. Seriously — see section 2.

## 6. Starter prompt for the next session

> I'm continuing work on the ClinicDesk staff app prototype at `/Users/arindampanigrahi/Downloads/clinicdeck`. Read `HANDOVER.md`, `README.md` and `CHANGELOG.md` in that folder first, then check `git log` to see the current baseline. Run `npm run build && npm run typecheck && npm run lint && npx knip` to confirm the repo is still clean before making changes.
