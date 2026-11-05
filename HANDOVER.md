# Handover: ClinicDesk staff app (clinicdeck repo), 2026-11-05

For: Arindam, and whoever picks this up next. Read this before touching the code.

## 1. What this repo is, and what it isn't

This is `/Users/arindampanigrahi/Downloads/clinicdeck` — a **frontend-only prototype** of the ClinicDesk staff app, built from scratch in this session. It is **not** `clinicdesk-v2`, the repo referenced in the project's main handover pack (`~/Downloads/ClinicDesk_handover_pack/`) — that one lives on a Windows PC (`C:\Users\Dell\Documents\Sovit\ClinicDesk`), was never connected in this session, and per that handover has a real API layer (`apps/api`), a staff app (`apps/staff`), a database, pg-boss background jobs, live-ish WhatsApp integration, and 400+ tests.

This repo has none of that. There is no database, no API routes, no auth, no real WhatsApp sending. `src/lib/store.tsx` holds the entire app's state in React Context, persisted to `localStorage`. It exists to demo the product's screens, workflows and safety rules (H1–H10, the send gate, consent) without a backend — useful for showing the UI/UX and walking through the patient journey, not for anything that needs to survive a page refresh across devices or actually reach a patient.

If the goal becomes "turn this into the real product": either (a) find `clinicdesk-v2` and port this UI onto its API, or (b) build a backend under this repo from scratch. Neither has been started. See section 6.

## 2. The product (context carried over from the clinicdesk-v2 handover pack)

- ClinicDesk is a staff app plus a WhatsApp AI front desk for clinics. Dental is the first specialty.
- Patients message on WhatsApp, Instagram or the website. The AI answers in Hindi or English, offers two slots and books. Staff take over when a handoff rule fires.
- First clinics named in the real product plan: **Hot Tooth** (two branches, a paying client) and a demo clinic called **City Dental** (Dr Khan is the doctor who sees the demo). This prototype's seed data only models City Dental — Hot Tooth isn't in it.
- **AI model**: Claude Haiku (decided Oct 2026 — cheaper, judged enough per a 29 Oct note; an earlier 16 Oct handover said Sonnet, which is out of date). Re-check once the 200-chat accuracy test runs.
- **Pricing**: Rs 5,000/month plus WhatsApp messages at actual cost. The old Rs 4,999/Rs 11,999 table is gone. Never sell "unlimited" WhatsApp — cost is passed on. Rates (Meta India, from 1 Oct 2026, before GST): marketing Rs 0.86, utility Rs 0.12, replies inside 24h free up to 1,000/month then ~Rs 0.12.
- **Health data stays in India**: Supabase Mumbai, Lightsail, Cloudflare. Production must refuse dev settings.
- **Work is tagged CORE or DESK.** CORE = two or more "desks"/specialties need it (inbox, shared CRM, booking, consent, WhatsApp) → goes to a shared "MSM Desk Core" project as a request, not rebuilt per-desk. DESK = dental-clinic-only, built here.
- **The AI never diagnoses and never names a medicine.** Ten handoff rules (H1–H10) run before any AI call. A false alarm costs a phone call; a missed urgent case costs a patient.
- **Every outgoing message passes one send gate**: consent, 24-hour window, contact hours, a claims check. A failed check is saved as blocked with the reason, visible to staff.
- **A fee waiver is never called "free."** Only a named doctor (or the owner) approves it, and the UI shows who.
- **Wording rule from the project owner**: say "costs", not "fees", in anything client-facing.

### People

| Who | Role |
|---|---|
| Arindam | Full-stack developer; owns this repo and deployment (shared with Pratyush) |
| Pratyush | Owns live WhatsApp sending, Meta verification, ads sync, Sarvam (voice transcription), Instagram sending |
| Dr Khan | Doctor who sees the demo; needed for wording review and to supply 200 old chats for the AI accuracy test |
| Project owner | Decides the website design pick, the Hot Tooth build figure, the "fees→costs" wording change, and sends CORE requests to MSM Desk Core |

### Open questions (as of the last real-product handover, not re-verified from this prototype)

- Hot Tooth one-time build fee: Rs 10,000 in the one-pagers vs. an earlier "under Rs 15,000" note.
- Payment gateway: Razorpay or PhonePe, undecided.
- Call tracking provider: Exotel or MyOperator, undecided.
- Which screens are really CORE vs DESK — the tags on Plans, Follow-ups, Billing, Approvals, Dashboard, Settings are guesses; only inbox, shared CRM, booking and consent are confirmed CORE by the project owner.

None of this blocks work on this repo, but don't make irreversible decisions (e.g. hardcoding a payment gateway) that assume one of these is resolved.

## 3. How this prototype came to exist (read this, it matters)

This session started from a Next.js scaffold that had `src/lib/*` fully written (types, store, seed data, handoff rules, send gate, templates) but **no `src/app` directory at all** — `npm run dev` failed immediately. `src/lib/dentalPack.ts` was also an empty file despite being imported by `store.tsx`.

From there:
1. Built all 11 screens plus `/e/[token]` and `/map`, wired to the existing `lib` layer, on Tailwind CSS (later migrated from inline styles to Tailwind v4 on request).
2. **A second, independent session started editing the same files concurrently**, multiple times, without coordination — at least four separate times across the session. Each time it produced a plausible-looking but incompatible rewrite: first a different component structure, then a different *data model* entirely (`Appointment.date`/`time`/`status` enum vs. the real `start`/`durationMin`/`status`, `Conversation.contactPhone` vs. `phone`, invented store methods like `moveDeal`/`setAppointmentStatus`/`updateConsent`, invented types `DealStage`/`LeadSource`/`PipelineBoard`, a `PRESETS` export from `dentalPack.ts` that was never actually added). Each collision broke the build (`Export X doesn't exist in target module`) until manually reconciled against the real `src/lib` types.
3. **The repo had no git until the very end of this session.** This made every collision worse than it needed to be — no way to diff "what changed" or revert a bad concurrent edit; recovery meant manually re-reading every file. **Git is now initialized.** If you're running concurrent sessions against this repo again, branch, or at minimum commit before and after each session so the other side can diff instead of silently clobbering.
4. A late-session audit prompt (written for a full-stack SaaS with a database, caching layer, RBAC, Playwright E2E, etc.) was scoped down to what actually applies here, and in doing so surfaced a real **production-build-breaking bug**: `globals.css` had self-referential CSS custom properties that crashed Turbopack's `next build` while `next dev` quietly tolerated it. Nobody had run `next build` before this. Fixed — see CHANGELOG.

**Lesson for next time:** check `git log`/`git status` first. Don't assume `npm run dev` working means `npm run build` works.

## 4. Current state

- All 11 screens + `/e/[token]` + `/map` built, wired to real data, role-access gated.
- `npm run build`, `npm run typecheck`, `npm run lint`, `npx knip` all pass clean as of this commit.
- Visual design follows a "Pulse Clinic / Medoria / Mitrasehat" reference aesthetic supplied as screenshots: warm-stone canvas, white inset stage, soft semantic status pills, Inter font, grouped sidebar nav.
- Demo data: City Dental, three doctors, ~16 patients, a full day's schedule, sample conversations/handoffs/plans/invoices/waivers. See `src/lib/seed.ts`.

## 5. Not built (true for this prototype; most of this is real-product/backend work anyway)

- No backend, no real auth, no real WhatsApp/Instagram sending (simulated via `InboundSimulatorModal`), no Meta verification.
- No ads sync or conversion upload, no call tracking, no payment gateway, no Sarvam voice transcription (a voice note just triggers handoff rule H7 and goes to a person, same as the real product's current behavior).
- No automated tests.
- `FREE_SERVICE_PER_MONTH` cap (1,000 free service replies/month) is defined but not enforced in `sendGate.ts`.
- Tooth chart/lab tracking screens, X-ray uploads, AI note drafts, dark mode, website — not attempted here; these were already "not built" in the real product too.

## 6. Next steps, suggested order

1. If this is meant to become (or feed into) the real product: locate `clinicdesk-v2` and decide whether to port this UI onto its API, or treat this repo as the new frontend direction and build a backend under it.
2. If staying frontend-only for now: add a minimal test setup (Vitest for `src/lib` — handoff rules, send gate, billing math are pure functions and cheap to test) before adding more screens.
3. Enforce `FREE_SERVICE_PER_MONTH` in `sendGate.ts` if that rule still matters.
4. Add Hot Tooth (two branches) to the seed data if this prototype needs to demo multi-clinic/multi-branch behavior.
5. Keep committing to git. Seriously — see section 3.

## 7. Starter prompt for the next session

> I'm continuing work on the ClinicDesk staff app prototype at `/Users/arindampanigrahi/Downloads/clinicdeck`. Read `HANDOVER.md`, `README.md` and `CHANGELOG.md` in that folder first, then check `git log` to see the current baseline. Run `npm run build && npm run typecheck && npm run lint && npx knip` to confirm the repo is still clean before making changes. This is a separate frontend-only prototype from the `clinicdesk-v2` repo — don't assume backend features exist here.
