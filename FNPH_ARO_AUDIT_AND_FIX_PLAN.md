# GFA HMS Smart Hospital — Full Audit & Execution-Ready Fix Plan

> **Audience:** an AI coding agent (or engineer) executing fixes.
> **Subject:** `fnph-aro` — a Hospital Management System (HMS) for the **GFA Demo Hospital, Abeokuta**. Many departments, many user types, frontend-first.
> **Stated architecture goal (from the product owner):** *"frontend first, a `database.js` file will be the single source of truth — the database and the backend. Every module / user type / department should talk to each other and be wired end to end."*
>
> **Golden rule:** Do **not** change the visual design language (colors, fonts, spacing tokens, component look, the `DashboardLayout` shell). You may change **structure, wiring, data flow, routing, state management, and add new files**. When in doubt, preserve existing UI and only fix behavior.
>
> **Stack (verified from `package.json` + source)**
> - Vite 5 + React 18 + TypeScript 5
> - React Router DOM 7 (`BrowserRouter` / `Routes`)
> - TanStack Query 5 (installed, a `QueryClient` is mounted, but **no queries/mutations exist yet**)
> - Tailwind 3 + shadcn/ui (Radix) + lucide-react + framer-motion + recharts + sonner
> - jspdf (for receipts/printing), zod + react-hook-form (installed, barely used)
> - Vitest + Playwright (configured; one trivial test only)
> - **No backend, no server, no `database.js`, no persistence layer.** Everything is in-memory + static seed files.
>
> **Definition of done for every task:** `npm run build` passes, `npm run lint` shows no new errors, the touched flow works after a **full page refresh** (this is currently a major gap — state is lost on refresh), and the data it reads/writes goes through the **single `database.js` source of truth** (Phase 1 onward).

---

## 0. How to use this document

This is **one document in three parts**. Read the part that matches what you're doing:

| Part | Sections | Purpose | Read it when… |
|------|----------|---------|---------------|
| **Part I — Audit** | §1–§14 | *What's wrong and why.* Findings, architecture, data-fragmentation, roles/RBAC, module maturity, UX, phased fixes (FIX-IDs), comment standard, phase order. | You need to understand the system or justify a decision. |
| **Part II — Coverage, contract & stack** | §15–§20 | *Every user type & department, individually.* Per-module fix packs (MOD-IDs) with the REST API each module needs, the missing-departments list, the frontend-revamp-for-backend spec (§17), and the Node/Java/C# recommendation (§18). | You're planning a specific module, designing the API, or choosing the backend. |
| **Part III — Implementation guide** | STEP-00…STEP-16 + Appendices | *Exactly how, with paste-ready code.* The build manual the executing agent follows commit-by-commit. | You're actually writing code. **This is the agent's primary working section.** |

### If you are the executing AI agent (the common case)
1. **Skim Part I §1–§5** once for context (the keystone is: there is no `database.js`, no persistence, and almost no RBAC).
2. **Work Part III top to bottom, STEP-00 → STEP-16.** Do not jump ahead — every step depends on earlier ones, and STEP-04 (`database.ts`) unblocks everything.
3. Obey the **Part III §III.0 operating rules** (no design changes; one concern per commit; build stays green; never break a public store API; refresh-test every wiring step).
4. For each step: write the code shown, run `npm run build`, then commit with the **STEP-ID** as the message (e.g. `STEP-04: database engine + seed`).
5. During **STEP-12** (module-by-module wiring), follow the queue in **Appendix B**, and for each module open its **Part II §16 MOD-pack** to see what it *owns / consumes / emits* and which API it must expose.
6. Gate every commit against the **STEP-16 Definition of Done** checklist.

### Cross-reference map (how the IDs relate)
- **FIX-IDs** (Part I, e.g. `FIX-01`) = the *strategic* fix. → realised by one or more **STEP-IDs** (Part III).
- **MOD-IDs** (Part II §16, e.g. `MOD-21 Laboratory`) = the *per-department* spec. → wired during **STEP-12** in Appendix B order.
- **§17** (frontend revamp contract) is built **alongside Phase 1 / STEP-02–07**; **§18** (backend stack) is for **Phase 8 / STEP-13–14 handoff**.

### Universal rules (apply everywhere, all three parts)
1. **Preserve the look.** This is an overhaul of **behavior, data, and wiring** — never visuals. No edits to `src/components/ui/*`, `DashboardLayout`, or Tailwind tokens.
2. **Never mass-delete** a file without first searching the workspace for live imports of it.
3. **Never rewrite a whole file** when a targeted edit will do. The big "Center" pages are 100–210 KB each — edit surgically.
4. **Comment intent only** (Part III §III.0 / Part I §11 standard). No narration comments.
5. **Definition of done** for any task: `npm run build` passes, `npm run lint` shows no new errors, the touched flow survives a **full page refresh**, and its data flows through the single `database.js`/repository source of truth.

> **One file, but `database.js` is the keystone.** If you only remember one thing: build **STEP-04** first. Nothing else in this document is real until the single source of truth exists.

---

## 0.1 Collaboration progress tracker (multi-engineer)

> **Update this section every time you finish a STEP or FIX.** All engineers and AI agents must read this before starting work, claim a STEP if needed, and append a row when done. **Do not work on the same STEP in parallel** without coordinating.

### Status legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Done, tested, committed |
| 🔄 | In progress (put engineer name in Notes) |
| ⬜ | Not started |
| ⏸ | Blocked (explain in Notes) |

### Foundation steps (Part III)
| STEP | Status | Owner | Commit / branch | Verified (build / test) | Notes |
|------|--------|-------|-----------------|-------------------------|-------|
| STEP-00 | ✅ | Agent (session 2026-06-29) | `STEP-00..04: database foundation` | `npm run build` ✅ | `.env.example`, `src/lib/env.ts`, `vite-env.d.ts`, `.gitignore` (+`.env`) |
| STEP-01 | ✅ | Agent (session 2026-06-29) | ↑ same commit | build ✅ | `src/lib/brand.ts` — canonical `GFA/HMS/YYYY/######` ids |
| STEP-02 | ✅ | Agent (session 2026-06-29) | ↑ same commit | build ✅ | `src/data-access/types.ts` — spine entities + zod |
| STEP-03 | ✅ | Agent (session 2026-06-29) | ↑ same commit | build ✅ | `src/db/ids.ts`, `events.ts`, `persistence.ts` |
| STEP-04 | ✅ | Agent (session 2026-06-29) | ↑ same commit | build ✅, `npm test` ✅ (4 new tests) | `src/db/database.ts`, `seed.ts`, `database.test.ts` — **keystone live** |
| STEP-05 | ✅ | Agent (session 2026-06-29) | `STEP-05..08: repository + BillingStore on db` | build ✅ | `src/data-access/repository.ts` — backend contract interface |
| STEP-06 | ✅ | Agent (session 2026-06-29) | ↑ same commit | build ✅ | `src/data-access/local.ts`, `index.ts` — repo over `db` |
| STEP-07 | ✅ | Agent (session 2026-06-29) | ↑ same commit | build ✅, test ✅ | `DatabaseProvider`, `hooks.ts`, mounted in `App.tsx` |
| STEP-08 | ✅ | Agent (session 2026-06-29) | ↑ same commit | build ✅, test ✅ (8 billing/db tests) | `billing-actions.ts`, `BillingStore` → `db` (API unchanged) |
| STEP-09 | ✅ | Agent (session 2026-06-29) | `STEP-09: LabFlow on db + billing link` | build ✅, test ✅ (4 lab tests) | `lab-actions.ts`, `LabFlowStore` → `db.orders`, real invoices |
| STEP-10 | ⬜ | — | — | — | `roles.ts` + persisted auth |
| STEP-11 | ⬜ | — | — | — | RBAC on all routes |
| STEP-12 | ⬜ | — | — | — | Module migration queue (Appendix B) |
| STEP-13 | ⬜ | — | — | — | `http.ts` |
| STEP-14 | ⬜ | — | — | — | `openapi.yaml` |
| STEP-15 | ⬜ | — | — | — | Additional smoke tests |
| STEP-16 | ⬜ | — | — | — | DoD gate on every commit |

### What is done (summary as of 2026-06-29, updated after STEP-09)
- **Single source of truth** at `src/db/database.ts` with localStorage persistence (`gfa_db_v1`).
- **Billing spine (STEP-08):** `BillingStore` reads/writes `db` — cashier capture unlocks consultation gate and survives refresh.
- **Lab spine (STEP-09):** `LabFlowStore` reads/writes `db.orders` (kind:`lab`). `generateInvoice` creates **real** hospital invoices; cashier capture in Billing Initiation or lab "Mark as Paid" flips order to `PAID` via `INVOICE_PAID` listener.
- **Repository layer + hooks** mounted; **not** fixing decorative buttons on the other ~28 department centers yet (STEP-12).
- **Tests:** 14 total (`database`, `billing-actions`, `lab-actions`). Run `npm test` before every commit.
- **UI pass (STEP-00..09 surfaces):** billing, consultation, lab dashboard/request/billing, auth guards — see §0.2.
- **UX feedback pass (STEP-00..09 surfaces):** loading buttons, boot skeletons, explicit toasts — see §0.3.

### What is remaining (next engineer / agent — pick up here)
1. **STEP-10 → STEP-11**: `roles.ts`, persisted auth session, RBAC on all dashboard routes.
2. **STEP-12**: wire modules per Appendix B — this is where most non-functional UI buttons get real mutations (claim one MOD at a time).
3. **Manual refresh tests:** lab `LAB-3203` → Generate Invoice → pay in `/billing/channels` → lab order `PAID` after F5.

### Module migration tracker (STEP-12 — claim before starting)
| MOD | Module | Status | Owner | Notes |
|-----|--------|--------|-------|-------|
| MOD-09 | MPI / registration | ⬜ | — | Creates patients — do early |
| MOD-11 | Scheduling + public appointment | ⬜ | — | |
| MOD-16/17 | Doctor + Consultation | ⬜ | — | |
| MOD-21 | Laboratory | 🔄 | Agent (STEP-09) | LabFlow on `db`; lab billing creates real invoices |
| MOD-14 | Billing / Cashier | 🔄 | Agent (STEP-08) | BillingStore on `db`; pages still use store API |
| MOD-NUR | **Nursing + shared Ward/Bed/Admission** | ✅ | Agent (session 2026-07-02) | `NursingStore` + `nursing-actions.ts` on `db`; shared `db.beds`/`db.admissions` with Admission module; MAR from doctor orders + pharmacy; sample collection → Lab; discharge gated on billing balance; schema-driven forms engine + Super Admin config. See **§0.4**. |
| MOD-CSH | **Cashier** | ✅ | Agent (session 2026-07-02) | `cashier-actions.ts` on `db` (wallets, walletTxns, refundRequests, discountRequests, cashierShifts) building on the billing spine (`db.invoices`/`db.payments`, `captureInvoicePayment` → `INVOICE_PAID`). 16-page module under `/dashboard/cashier/*` with wallet/deposits, refund + discount approval workflows, persisted daily closing/reconciliation, NHIS-HMO co-pay, POS/transfer confirmation, receipt verification/reprint, revenue reports, patient payment history, audit trail. See **§0.5**. |
| MOD-RAD | **Radiology & ECG (RIS)** | ✅ API dual-mode Phases 0–8 (2026-07-27) | Agent | Full dual-mode RIS: request→pay→exam→report→release, ECG critical rules, forms/equipment/consumables, EMR/ICU consumers, `IMAGING_RESULT_READY`, Phase-8 PACS/print/mobile stubs. See `RADIOLOGY_ECG_EEG_E2E_WIRING_PLAN.md`. |
| MOD-OPC | **Psychiatric OPC** | ✅ | Agent (session 2026-07-02) | New `opc-actions.ts` on `db` (opcVisits, psychAssessments, psychDiagnoses, psychNotes, opcTreatmentPlans, opcRiskAssessments, opcAdmissionRequests, opcReferrals, opcAppointments). Queue/triage, MSE + assessments, ICD diagnosis, SOAP notes, treatment plans, risk w/ auto crisis alert, admission requests, Psychology/Social-Welfare referrals, follow-ups. Cross-module via `ORDER_CREATED` (lab/imaging/drug → Lab/RIS/Pharmacy+MAR) and `createInvoiceRecord` (source 'Psychiatric OPC'). New `psychopc` role + demo login. 16 pages under `/dashboard/psychopc/*`. See **§0.7**. |
| … | See Appendix B for full queue | ⬜ | — | |

### Collaboration rules (all engineers)
1. **Read §0.1** before starting; update the table when you finish a STEP.
2. **One STEP per PR/commit** when possible (e.g. `STEP-05: repository interface`).
3. **Before every commit:** `npm run build` && `npm test`. (`npm run lint` has pre-existing repo-wide errors — ensure **your touched files** have no new issues via IDE/linter.)
4. **Do not** migrate a page to `db` until STEP-07 hooks exist.
5. **Refresh test (F5)** required after STEP-08+.
6. If blocked, mark ⏸ and note the blocker — do not skip ahead past STEP-04 without team agreement.
7. **Fix UI alongside data steps** — when you wire a module to `db`, also fix broken buttons, empty states, route guards, and ID mismatches on that module's pages in the same commit (see §0.2 UI tracker).
8. **UX feedback on every action** — no silent buttons: loading spinners, skeleton boot gates, and explicit success/warning/error toasts (see §0.3). Document every UX pass in §0.3 table when you touch a page.

### UI polish tracker (STEP-00..09 scope — update when you fix pages)
| Area | Status | Fixed in | Notes |
|------|--------|----------|-------|
| Billing (`/billing/*`) | ✅ | UX pass 2026-06-29 | LoadingButton + toasts on visit create, channels, POS, shift, refund, reconciliation, gate |
| Consultation (`/consultation/*`) | ✅ | UX pass 2026-06-29 | DbBootGate, async Rx/lab/complete/override with explicit toasts |
| Laboratory (`/dashboard/laboratory/*`) | ✅ | UX pass 2026-06-29 | DbBootGate, withLabLoading on send/invoice/pay; invoice success toast |
| Pharmacy/Records/Radiology billing links | ✅ | UX pass 2026-06-29 | Send-to-Cashier with LoadingButton + `useAsyncAction` + explicit invoice toasts |
| Auth / `RequireRole` | ✅ | UX pass 2026-06-29 | Login/register async with LoadingButton; guards on consultation + lab |
| Login | ✅ | UX pass 2026-06-29 | Sign-in + register loading; validation error toasts |
| Other ~28 department centers | ⬜ | — | STEP-12 — apply §0.3 pattern when wiring each module |

### §0.2 — UI fixes applied (2026-06-29, STEP-00..09 surfaces)

**Critical (blank / broken):**
- Consultation workspace "Visit not found" — `resolvePatientForVisit()` matches canonical `GFA/HMS` ids from `db` + legacy `hmsData`.
- Payment gate bypass via `?override=1` removed — access requires `consultationUnlocked` or audited `emergencyOverride` on the visit.
- `VisitsInvoices` crash on orphan invoices — safe optional visit lookup + `createVisitWithInvoice()` creates visit **and** invoice.
- `MultiChannelPay` crash when no invoices — empty state with link to create visit.
- `ReconciliationEngine` NaN% when no transactions — shows `—`.

**High (buttons now functional):**
- `resendPayLink` wired on Visits & Invoices resend button.
- Multi-channel CTAs: POS/Cash → `/billing/pos`, SMS → `resendPayLink`, bank → clipboard, USSD toast.
- Consultation Gate "Open Consultation" → navigates to `/consultation/visit/:code`.
- Queue emergency override → calls `emergencyOverride()` in BillingStore (audited).
- Queue "Redirect to Billing" → `/billing/channels`.
- Doctor lab orders in consultation → `LabFlowStore.addRequest()` (visible in Lab Request Center).
- Pharmacy/Records/Radiology/Lab "Open Cashier" → `/billing/pos` (live POS, not stale `/dashboard/cashier`).

**Medium (consistency):**
- Lab dashboard metrics + recent activity from `useLabFlow()` (not static `labData`).
- Lab patient picker uses `db.patients` with canonical hospital numbers.
- `records` role added to `/billing/*` routes.

**Low (responsiveness / empty states):**
- Empty states: billing overview table, visits grid, multi-channel pay, consultation queue tabs, active consultations.
- Lab dashboard grid `lg:grid-cols-4` (was 8).
- Consultation Rx form stacks on mobile.
- Login demo tiles `grid-cols-2 sm:grid-cols-3`.

**Still toast-only / static (fix in STEP-12 per module):**
- Reconciliation "Resolve" / "Run Now", Completed Consultations table, Consultation EMR sync queue, Pharmacy billing center ledger, most department center action buttons.

**Reminder for next developer/agent:** Each STEP that touches a page must include a **UI pass** on that page: click every button, verify empty states, test mobile width, F5 refresh, and log fixes in §0.2 table above. **Also apply §0.3 UX feedback standards** (loading states, skeletons, explicit toasts) and log them in the §0.3 tracker.

### §0.3 — UX feedback standards (loading, toasts, skeletons — 2026-06-29)

**Goal:** Never leave the user hanging. Every mutating action shows (1) immediate loading feedback on the button, (2) a loading toast while work runs, (3) a success/warning/error toast naming **exactly** what happened or what went wrong.

#### Shared utilities (reuse — do not reinvent)

| File | Purpose |
|------|---------|
| `src/lib/notify.ts` | `notify.loading/success/error/warning(id, message)` + `withActionFeedback()` — stable toast IDs replace in-place |
| `src/hooks/useAsyncAction.ts` | `run(key, pending, action, successMsg, failMsg?)` + `isBusy(key)` — one busy action at a time per hook instance |
| `src/components/LoadingButton.tsx` | Button with spinner; optional `loadingText`; icon-only buttons keep icon + spinner |
| `src/components/DataSkeletons.tsx` | `PageBootSkeleton`, `SummaryCardsSkeleton`, `TableSkeleton`, `CardGridSkeleton` |
| `src/components/DbBootGate.tsx` | Wraps db-backed pages — shows `PageBootSkeleton` until `useDbReady()` (~120ms) |
| `src/contexts/DatabaseProvider.tsx` | Exports `useDbReady()` for boot skeleton gate |

#### Required pattern for new / fixed pages

1. **Page boot:** Wrap db-backed content in `<DbBootGate>` (billing, consultation, lab already do).
2. **Mutations:** Use `LoadingButton` + `useAsyncAction().run(...)` or `withActionFeedback(...)`.
3. **Validation errors:** Call `notify.error('unique-id', 'Exact reason — e.g. Patient name is required')` before returning.
4. **Success copy:** Include entity ids, patient names, amounts — e.g. `Invoice INV-1234 sent to Cashier — Amina Yusuf · ₦15,000`.
5. **Warnings:** Use `notify.warning` for partial success (e.g. clipboard fallback failed).
6. **No double toasts:** If a store already toasts (e.g. `LabFlowStore.sendToBilling`), page layer shows **loading only** and dismisses; do not duplicate success unless store message is generic.

#### UX pass applied (STEP-00..09 surfaces)

| Page / action | Loading | Toast (exact copy pattern) | Skeleton |
|---------------|---------|----------------------------|----------|
| Login — sign in | `LoadingButton` | Error: email required; fail: check email/password; success: role + redirect | — |
| Login — register | `LoadingButton` | Error: name/email required; success: account created + redirect | — |
| Billing — create visit + invoice | `LoadingButton` | Error: patient name required; success: visit code + invoice id | `DbBootGate` |
| Billing — resend SMS | per-invoice `LoadingButton` | Loading: sending…; success: pay link resent for `{invoiceId}` | `DbBootGate` |
| Billing — channel CTAs | per-channel `LoadingButton` | POS ready / clipboard copied / USSD code / channel ready — includes invoice id | `DbBootGate` |
| Billing — POS capture | `LoadingButton` | Errors: select invoice, invalid amount; success: receipt + balance | `DbBootGate` |
| Billing — shift open/close | `LoadingButton` | Success: shift opened/closed with cashier name | `DbBootGate` |
| Billing — refund | `LoadingButton` | Errors: reason length, supervisor required | `DbBootGate` |
| Billing — reconciliation resolve/run | per-row + run `LoadingButton` | Success: match resolved / recon run complete | `DbBootGate` |
| Billing — consultation gate SMS/override | `LoadingButton` | Error: override reason length; success: SMS sent / override logged | `DbBootGate` |
| Consultation — emergency override | `LoadingButton` | Success: override logged for visit | `DbBootGate` |
| Consultation — add Rx / lab / complete | icon + full `LoadingButton` | Errors: drug/dose, test selection, complaint/diagnosis required; success: item added / visit completed | `DbBootGate` |
| Lab — send to billing | `LoadingButton` + loading toast | Store success toast (request id); page dismisses loading | `DbBootGate` |
| Lab — generate invoice | `LoadingButton` | Success: `Invoice {id} generated for {patient} ({requestId})` | `DbBootGate` |
| Lab — mark paid | `LoadingButton` | Store success toast (payment recorded) | `DbBootGate` |
| Pharmacy dispense — send to cashier | `LoadingButton` | Success: invoice id + patient + amount | — |
| Records admissions — send to cashier | icon `LoadingButton` | Success: invoice id + patient + deposit amount | — |
| Radiology billing — send to cashier | icon `LoadingButton` | Success: invoice id + patient + amount | — |

#### Still needs §0.3 when wired in STEP-12

- Pharmacy queue/dispense confirm, inventory, returns (currently generic `toast.success` stubs)
- Records approve/admit/reject confirm dialogs
- Reconciliation-only pages outside billing initiation if split later
- All other ~28 department centers — **mandatory** when each MOD is migrated

#### Reminder for next developer/agent

> **Document every UX change here.** When you fix or wire a page, add a row to the §0.3 table above (page/action, loading control, exact toast pattern, skeleton if any). When you add a new shared utility, list it in the utilities table. **Do not ship silent buttons** — if an action has no feedback yet, either wire it or show `notify.warning` explaining it is demo-only until STEP-12.

### Files added in UX feedback pass (2026-06-29)
```
src/lib/notify.ts
src/hooks/useAsyncAction.ts
src/components/LoadingButton.tsx
src/components/DataSkeletons.tsx
src/components/DbBootGate.tsx
```
Modified: `DatabaseProvider.tsx` (+`useDbReady`), `BillingInitiation.tsx`, `ConsultationModule.tsx`, `LaboratoryCenter.tsx`, `LoginPage.tsx`, `PharmacyCenter.tsx`, `RecordsDepartmentCenter.tsx`, `RadiologyCenter.tsx`

---

### §0.4 — Nursing Module + shared Ward/Bed/Admission spine (MOD-NUR, session 2026-07-02)

**What was there before:** `src/pages/NursingCenter.tsx` — a ~1,700-line, high-fidelity **UI-only** prototype (21 screens) backed by a local `PATIENTS` dummy array. No `db`, no persistence, no cross-module integration, routes **unguarded**. Beds lived separately (also dummy) in `AdmissionWardCenter.tsx`.

**What is now wired (end to end, on the single `db` source of truth):**

#### New data spine (Phase 1)
- `src/data-access/types.ts` — added `Ward`, `Bed`, `Admission` (**shared** with Admission module) + nursing entities: `Vital`, `MarEntry`, `NursingNote`, `CarePlanEntry`, `NursingTask`, `Observation`, `IntakeOutputEntry`, `Handover`, `Incident`, `PatientEducationRecord`, and schema-driven `NursingFormTemplate` / `NursingFormInstance` / `FormField`.
- `src/db/events.ts` — added `BED_TRANSFER`, `BED_STATUS_CHANGED`, `DISCHARGE_ORDERED`, `VITALS_RECORDED/CRITICAL`, `MED_ADMINISTERED`, `NURSING_NOTE_ADDED`, `NURSING_TASK_UPDATED`, `SAMPLE_COLLECTED`, `HANDOVER_SUBMITTED`, `INCIDENT_REPORTED`, `CARE_PLAN_UPDATED`, `NURSING_FORM_SAVED`.
- `src/db/database.ts` — 15 new collections + CRUD + seed counters; `initFromStorage` now **backfills** missing collections so existing `gfa_db_v1` users don't break.
- `src/db/nursing-seed.ts` — wards, beds, 3 real seed patients admitted (shared beds marked occupied), seed MAR/tasks, and **7 form templates** (Admission Assessment, Pain, Fall Risk, Wound, Psychiatric Observation, Seclusion, Discharge Summary).

#### Logic + store (Phase 2)
- `src/lib/nursing-actions.ts` — all mutations + cross-module read helpers; audits every action to `db.audit` (nurse + timestamp).
- `src/contexts/NursingStore.tsx` — `NursingProvider` (mounted in `App.tsx` after `LabFlowProvider`); listens to `ORDER_CREATED` (drug → MAR) and `DRUG_DISPENSED` (→ MAR ready).
- All `/dashboard/nurse/*` routes now `RequireRole roles={['superadmin','admin','cmd','nurse','icu']}`.

#### Cross-module integration (Phase 4) — how nursing talks to everyone
| Integration | Mechanism |
|-------------|-----------|
| **Doctor's Orders** | `NurseDoctorOrders` reads `db.orders` for ward patients; acknowledge → creates a nursing task |
| **Pharmacy → MAR** | doctor drug order → MAR entry (`importDrugOrderToMar`); `DRUG_DISPENSED` marks `pharmacyDispensed` and flips PENDING→DUE |
| **Laboratory ← Sample collection** | `NurseSamples` calls `collectSampleForLabOrder` → `patchLabOrderStatus('SAMPLE_COLLECTED')` in the shared lab spine (gated: order must be payment-cleared) |
| **Billing (discharge gate)** | `completeDischarge` blocked when `outstandingBalance(patientId) > 0`; supervisor override available; billable procedures via `chargeNursingProcedure` → real cashier invoice |
| **Admission / Ward (shared beds)** | Nursing `transferBed`/`completeDischarge` write `db.beds`+`db.admissions`; `AdmissionWardCenter` **Bed Management** now reads the same `db.beds` (real-time reflection both ways) |

#### Forms engine (Phase 5)
- `NurseForms` (`/dashboard/nurse/forms`) — schema-driven renderer with conditional `showIf` fields, required-field validation, e-signature, timestamps, audit trail. **Super Admin / admin** see a template configuration panel (enable/disable templates; `addFormTemplate` supports new ones).

#### Pages migrated to live `db` + §0.3 UX (Phase 3 + 6)
Dashboard (live counts), Vitals (abnormal auto-flag + escalation), MAR, Notes, Care Plan, Admission Monitoring (transfer + order discharge), Discharge Workflow (balance gate), plus **new** pages: Doctor's Orders, Nursing Tasks, Sample Collection, Incident Reports, Charts & Forms. All use `DbBootGate` + `LoadingButton` + `useAsyncAction` + explicit toasts.

#### Files
```
NEW: src/db/nursing-seed.ts
     src/lib/nursing-actions.ts
     src/lib/nursing-actions.test.ts   (11 tests)
     src/contexts/NursingStore.tsx
MOD: src/data-access/types.ts, src/db/events.ts, src/db/database.ts,
     src/App.tsx (provider + guarded routes + 5 new routes),
     src/pages/NursingCenter.tsx (migrated + 5 new pages + live nav),
     src/pages/AdmissionWardCenter.tsx (Bed Management on shared db.beds)
```
**Verified:** `npx tsc --noEmit` ✅ · `npx vitest run` ✅ (25 tests, +11 nursing) · `npm run build` ✅.

**Reminder for next developer/agent:** the remaining nursing screens still on static content (Observation Center, ICU, Specialized Charts, Shift Handover/Dashboard, Timeline, Alerts, Comms, Reports, Analytics, Bedside, External Meds, Patient Workspace panels) should be migrated to `db` using the same `useNursing()` + `nursing-actions.ts` pattern, and each must follow §0.3. Intake/Output, Observation, Handover, and Patient Education actions already exist in `nursing-actions.ts` — wire the UI to them.

### §0.5 — Cashier Module (MOD-CSH, session 2026-07-02)

**What was there before:** payment collection lived in `src/pages/BillingInitiation.tsx` — a wired 7-page `/billing/*` surface (Overview, Visits/Invoices, Multi-Channel Pay, POS Terminal, Reconciliation, Consultation Gate, Audit) on `BillingStore` + `billing-actions.ts`. Payment capture already flipped Lab/Pharmacy/Radiology/Consultation via `INVOICE_PAID`. **Missing:** patient wallet/deposits, refund/reversal **approval workflow**, discount/waiver **approval workflow**, **persisted** daily closing/end-of-day reconciliation, NHIS/HMO co-pay capture UI, receipt verification/reprint, patient payment history, and a dedicated cashier module. The old `/dashboard/cashier` was a static `CashierOverview`.

**What is now wired (end to end, on the single `db` source of truth):**

#### New data spine (Phase 1)
- `src/data-access/types.ts` — `WalletAccount`, `WalletTxn`, `RefundRequest`, `DiscountRequest`, `CashierShift` (+ `WalletTxnKind`, `RefundStatus`/`RefundMethod`, `DiscountStatus`/`DiscountKind`, `ShiftStatus`).
- `src/db/events.ts` — `WALLET_FUNDED`, `WALLET_PAYMENT`, `REFUND_REQUESTED/APPROVED/REJECTED`, `DISCOUNT_REQUESTED/APPROVED/REJECTED`, `SHIFT_OPENED/CLOSED`.
- `src/db/cashier-seed.ts` — funded wallets for the first 2 seed patients (admission deposits) + one OPEN shift so the desk is live on first load.
- `src/db/database.ts` — 5 new collections (`wallets`, `walletTxns`, `refundRequests`, `discountRequests`, `cashierShifts`) + CRUD (`wallets.getByPatient`) + seed counters, backfilled in `initFromStorage`/`_testReset`.

#### Logic (Phase 2)
- `src/lib/cashier-actions.ts` — builds on `billing-actions.captureInvoicePayment` (keeps the `INVOICE_PAID` cross-module effect). Functions: shift `openCashierShift`/`closeCashierShift`(variance)/`approveShift`/`currentShift`; `collectPayment` (credits open shift totals) + `collectMixedPayment`; wallet `getOrCreateWallet`/`fundWallet`/`payInvoiceFromWallet`/`walletHistory`; refunds `requestRefund`/`approveRefund` (reverses payment + invoice, refund-to-wallet supported)/`rejectRefund`; discounts `requestDiscount`/`approveDiscount` (percent/fixed/waiver)/`rejectDiscount`; receipts `verifyReceipt`/`reprintReceipt`; reports `dashboardMetrics`/`revenueByDepartment`/`outstandingInvoices`/`patientPaymentHistory`. Every mutation audits to `db.audit` — **no hard deletes**.

#### Pages (Phase 3) — 16-page module under `/dashboard/cashier/*`, all `RequireRole roles={['superadmin','admin','cmd','finance','cashier']}`
`src/pages/CashierCenter.tsx`: Dashboard (9 live cards + shift bar), Invoice Payment (search → part/full/wallet), Patient Search (full history tabs), Pending/Paid/Part Payment lists, Patient Wallet (fund + history), Refunds & Reversals (request + approve/reject), Discounts & Waivers (request + approve/reject), NHIS/HMO Co-payment (coverage split + auth code → two receipts), POS/Transfer Confirmation (reconcile unmatched), Daily Closing (open/close/variance/supervisor approve + shift history), Revenue Reports (by dept + method + aging + export), Receipt Verification (verify by ref/QR + reprint watermark), Audit Trail, Settings. Approval actions are role-gated (finance/admin/cmd/superadmin). All use `DbBootGate` + `LoadingButton` + `useAsyncAction` + explicit success/warning/error toasts per §0.3.

#### Cross-module integration
| Integration | Mechanism |
|-------------|-----------|
| **Lab / Pharmacy / Radiology / Consultation** | `collectPayment` → `captureInvoicePayment` → `INVOICE_PAID` (existing listeners flip those modules to Paid/proceed) |
| **Departmental billing** | reads all `db.invoices` regardless of `source` (Records, Nursing, Lab, Radiology, Pharmacy, Admission, …) |
| **Patient Wallet** | admission/surgery/long-stay deposits fund `db.wallets`; wallet pays invoices at the desk |
| **Accounts (hand-off)** | shift closing persists totals/variance/approval in `db.cashierShifts` (ready for an Accounts consumer) |

#### Files
```
NEW: src/db/cashier-seed.ts
     src/lib/cashier-actions.ts
     src/lib/cashier-actions.test.ts   (14 tests)
     src/pages/CashierCenter.tsx        (16 pages)
MOD: src/data-access/types.ts, src/db/events.ts, src/db/database.ts,
     src/App.tsx (16 guarded routes; replaced /dashboard/cashier CashierOverview)
```
**Verified:** `npx tsc --noEmit` ✅ · `npx vitest run src/lib/cashier-actions.test.ts` ✅ (14 tests) · `npm run build` ✅.

**Reminder for next developer/agent:** follow §0.3 for any new cashier UI. Still stubbed for future work: receipt PDF/QR rendering (currently print + verify-by-ref), an Accounts module that consumes `db.cashierShifts`, corporate/capitation claim batching, transfer-proof file uploads, and payment-method settings persistence (Settings page is currently local state). The legacy `/billing/*` pages remain for the finance/records flows; the two share `db.invoices`/`db.payments` so they stay consistent.

### §0.6 — Radiology & ECG Module (MOD-RAD)

**Local spine (2026-07-02):** RIS on `db` with full pathway + ECG critical detection + tests.

**API dual-mode Phases 0–8 (2026-07-27):** Complete end-to-end wiring per `RADIOLOGY_ECG_EEG_E2E_WIRING_PLAN.md`. Close-out: ECG rule FE/BE alignment, equipment/consumable create, forms permissions, Live Reports/History/AI, exam consumable+studyUid, ICU/Doctor no-demo when API on, Playwright multi-route suite. Phase 8 ships studyUid deep links, Archive/Print/PACS stubs, mobile worklist, and assistive AI shell — real DICOM viewers and ML models remain deferred.

**What was already there (verified):**
- **Data spine** — `src/data-access/types.ts` defines `ImagingRequest`, `RadiologyReport`, `EcgStudy`, `RadEquipment`, `RadConsumable`, `RadFormInstance` (+ `RadModality`, `RadPriority`, `RadRequestStatus`, `EcgType`, `EquipmentStatus`, `RadPrep`/safety). `src/db/events.ts` has 11 events (`RAD_REQUEST_CREATED/ACCEPTED`, `RAD_SCHEDULED`, `RAD_IMAGING_DONE`, `RAD_REPORT_SUBMITTED/VERIFIED`, `RAD_RESULT_RELEASED`, `RAD_CRITICAL_FINDING`, `ECG_RECORDED/VERIFIED`, `EQUIPMENT_STATUS_CHANGED`).
- **database.ts** — 6 radiology collections + CRUD in both `freshState` and the accessor object; seed counters (`RAD`/`ECG`/`RRP`/`RFM`) in **both** `initFromStorage` and `_testReset`; the generic backfill in `initFromStorage` auto-adds the radiology collections for existing `gfa_db_v1` users (no crash on upgrade). Seed data in `src/db/radiology-seed.ts` (4 imaging requests across the pathway, 1 ECG, 5 machines, 5 consumables).
- **Logic** — `src/lib/radiology-actions.ts`: full workflow (`createImagingRequest`, `importImagingOrder`, `accept/reject`, `generateRadInvoice`, `markRadPaid`, `onInvoicePaidForRad`, `scheduleRequest` [payment-gated except emergencies], `updatePrep/Safety`, `startExam`, `completeImaging` [Study UID + consumable decrement + machine hours], `submitReport`/`verifyReport`/`returnReport`/`releaseResult`, `criticalFindings`, `recordEcg` [auto abnormal/critical detection], `interpretEcg`, equipment/consumables, 24 forms, `getLatestCreatinine` cross-module read, metrics/analytics).
- **Store + routes** — `RadiologyProvider` (mounted in `App.tsx`) listens to `ORDER_CREATED`(kind:imaging)→`importImagingOrder` and `INVOICE_PAID`→`onInvoicePaidForRad`. Pages under `/dashboard/radiology/*` guarded by `RAD_ROLES`.

**Cross-module integration (verified):**
| Integration | Mechanism |
|-------------|-----------|
| **Doctor / Consultation** | doctor imaging order (`db.orders` kind:'imaging') → `ORDER_CREATED` → auto-imported into the RIS worklist |
| **Billing / Cashier** | `generateRadInvoice` → real `db.invoices` (source 'Radiology'); `markRadPaid` → `captureInvoicePayment`; `INVOICE_PAID` flips the request to PAID (so cashier confirmation unlocks scanning) |
| **Laboratory** | `getLatestCreatinine` reads `db.orders` (kind:'lab') for contrast safety screening |
| **Ward / ICU / Emergency / Theatre** | request `source` field + EMERGENCY priority routing (schedulable without prepayment) |
| **Consumables/Equipment** | `completeImaging` decrements the used consumable and increments machine usage hours |

**Gaps closed this session:**
- **Radiology Audit Trail page** (`RadiologyAuditTrail`) — was in the requested sidebar but missing from nav/routes. Added nav entry + `/dashboard/radiology/audit` route; reads `db.audit` filtered to radiology entities (imaging/report/ecg/equipment/consumable/radform) with a search box. No hard deletes.
- **Test suite** — `src/lib/radiology-actions.test.ts` (**15 tests**) covering request creation/pricing, idempotent doctor-order import, payment-gated scheduling, emergency bypass, `INVOICE_PAID` flip, full exam→report→verify→release pathway with consumable decrement, release-before-verify block, return-for-correction, critical imaging + STEMI ECG auto-detection, equipment/consumable low-stock, reject validation, and forms/metrics/history.

**Files**
```
NEW: src/lib/radiology-actions.test.ts   (15 tests)
MOD: src/pages/RadiologyCenter.tsx (Audit Trail page + nav entry),
     src/App.tsx (RadiologyAuditTrail import + /dashboard/radiology/audit route)
(pre-existing, verified: src/lib/radiology-actions.ts, src/contexts/RadiologyStore.tsx,
     src/db/radiology-seed.ts, src/data-access/types.ts, src/db/events.ts, src/db/database.ts)
```
**Verified:** `npx tsc --noEmit` ✅ · `npx vitest run src/lib/radiology-actions.test.ts` ✅ (15 tests) · `npm run build` ✅.

**Reminder for next developer/agent:** follow §0.3 for any new radiology UI. Deliberately left as light/informational (safe to deepen later): PACS DICOM viewport (real image rendering), calendar-grid scheduling views, per-modality dedicated worksheets (US/CT/MRI/Echo — currently handled generically by the `modality` field), a persisted contrast-administration record, and true SMS/email/push delivery for critical-finding notifications (currently in-app + audit). Patient-portal/EMR consumption of `RELEASED` reports can be wired when those modules migrate to `db`.

### §0.7 — Psychiatric OPC Module (MOD-OPC, session 2026-07-02)

**Audit result:** no dedicated **Psychiatric OPC** (adult outpatient clinic) module existed — only sibling specialty centres (Psychology, Child & Adolescent, Psychogeriatrics, Addiction). Built **new, end-to-end on the single `db` source of truth**, reusing existing spines for all cross-module traffic (no data duplication).

**Data spine (new):**
- `src/data-access/types.ts` — `OpcVisit` (queue/encounter), `PsychAssessment` (incl. MSE via `values`), `PsychDiagnosis` (ICD, Primary/Secondary/Provisional/Differential + Active/Inactive + history), `PsychNote` (SOAP/Progress/etc, DRAFT/FINAL, confidential flag, version history), `OpcTreatmentPlan`, `OpcRiskAssessment` (self/others/absconding/neglect/substance + auto crisis flag), `OpcAdmissionRequest` (PENDING→AWAITING_BILLING→AWAITING_BED→APPROVED→ADMITTED/DECLINED), `OpcReferral` (Psychology / Social Welfare), `OpcAppointment` (follow-ups).
- `src/db/events.ts` — 9 events (`OPC_VISIT_CREATED/UPDATED`, `OPC_ASSESSMENT_SAVED`, `OPC_DIAGNOSIS_ADDED`, `OPC_NOTE_SAVED`, `OPC_RISK_FLAGGED`, `OPC_ADMISSION_REQUESTED`, `OPC_REFERRAL_CREATED`, `OPC_APPT_BOOKED`).
- `src/db/database.ts` — 9 OPC collections in `DbState`, `freshState`, and the accessor object with CRUD; seed counters (`OPC`/`PDX`/`PSA`/`PSN`/`PTP`/`PRK`/`OAR`/`ORF`/`OAP`) in **both** `initFromStorage` and `_testReset`; the generic backfill auto-adds OPC collections for existing `gfa_db_v1` users (no upgrade crash).
- `src/db/opc-seed.ts` — 3 queue visits (New/Follow-up/Emergency), 1 seed diagnosis, 1 follow-up appointment.

**Logic — `src/lib/opc-actions.ts`:** queue (`checkInVisit`/`setVisitStatus`/`assignDoctor`/`completeVisit`), assessments + MSE (`saveAssessment`), risk (`saveRiskAssessment` → auto crisis alert when any dimension is High), diagnosis (`addDiagnosis`/`setDiagnosisStatus`), notes (`saveNote` draft/final with finalise guard + history), treatment plans, cross-module orders (`requestLab`/`requestImaging`/`prescribe` → `db.orders` + `ORDER_CREATED`), billing (`billConsultation` → `createInvoiceRecord` source 'Psychiatric OPC'), admission (`requestAdmission`/`setAdmissionStatus`), referrals, appointments (`bookAppointment`/`reschedule`/`setAppointmentStatus`), `dashboardMetrics`, `patientProfile`. Every mutation writes `db.audit` (role 'Psychiatric OPC', no hard deletes).

**Cross-module integration (reuses existing spines):**
| Integration | Mechanism |
|-------------|-----------|
| **Laboratory** | `requestLab` → `db.orders` kind:'lab' + `ORDER_CREATED` → Lab worklist |
| **Radiology / ECG** | `requestImaging` → `db.orders` kind:'imaging' + `ORDER_CREATED` → RIS auto-imports |
| **Pharmacy + Nursing MAR** | `prescribe` → `db.orders` kind:'drug' + `ORDER_CREATED` → Pharmacy dispensing + Nursing MAR |
| **Billing / Cashier** | `billConsultation` → real `db.invoices` (source 'Psychiatric OPC') → cashier captures → `INVOICE_PAID` |
| **Records / Admission / Ward** | `requestAdmission` surfaces to Records/Admission office; wards read from shared `db.wards` |
| **Psychology / Social Welfare** | `createReferral` with tracked status |

**UI — `src/pages/PsychiatricOpcCenter.tsx` (16 role-guarded pages):** Dashboard (13 linked cards) · Patient Queue (check-in, triage tags, status flow) · Active Consultation (clinician workspace + notes) · Psychiatric Assessment · Mental Status Exam (11 structured domains) · Diagnosis & Plan · Prescriptions · Lab/Investigations · Risk Assessment (crisis alerts) · Admission Requests · Follow-Up Appointments · Psychology Referrals · Social Welfare Referrals · Emergency Cases · Reports & Analytics (CSV export) · Settings & Templates. All wired to `db` with `DbBootGate` + `LoadingButton` + `useAsyncAction` + `notify` per §0.3.

**Role + demo login:** new `psychopc` role added to `UserRole` (`dummyData.ts`) with demo user `psychopc@gfa-health.demo` (Dr. Chukwuma Okonkwo, Psychiatric OPC). `guessRole` updated in **both** `AuthContext.tsx` and `LoginPage.tsx` (placed before the `psych`→psychology catch). Demo login card added to `LoginPage`. Routes `/dashboard/psychopc/*` guarded by `OPC_ROLES = [superadmin, admin, cmd, doctor, psychopc, nurse]`.

**Files**
```
NEW: src/db/opc-seed.ts, src/lib/opc-actions.ts, src/lib/opc-actions.test.ts (15 tests),
     src/pages/PsychiatricOpcCenter.tsx (16 pages)
MOD: src/data-access/types.ts (9 OPC interfaces + enums),
     src/db/events.ts (9 OPC events), src/db/database.ts (9 collections + CRUD + seed + counters),
     src/data/dummyData.ts (psychopc role + demo user),
     src/contexts/AuthContext.tsx + src/pages/LoginPage.tsx (guessRole + demo login card),
     src/App.tsx (OPC_ROLES + 16 routes)
```
**Verified:** `npx tsc --noEmit` ✅ · `npx vitest run src/lib/opc-actions.test.ts` ✅ (15 tests) · `npm run build` ✅.

**Reminder for next developer/agent:** follow §0.3 for any new OPC UI. Deliberately left light (safe to deepen later): NHIS/HMO eligibility/claim automation (currently payer tagging only), drug-interaction/allergy engine, per-form ICD-11 pick-list widget, AI clinical-summary generation, and real SMS/WhatsApp appointment reminders (currently in-app + audit). Admission requests currently surface as `db.opcAdmissionRequests`; when the Admission office fully migrates it can convert an APPROVED request into a `db.admissions` row on the shared bed spine.

### Files added in STEP-00..04 (for code review)
```
.env.example
.gitignore                    (added .env)
src/lib/env.ts
src/lib/brand.ts
src/data-access/types.ts
src/db/ids.ts
src/db/events.ts
src/db/persistence.ts
src/db/seed.ts
src/db/database.ts
src/db/database.test.ts
src/vite-env.d.ts             (VITE_* types)
```

### Files added in STEP-05..08 (for code review)
```
src/data-access/repository.ts
src/data-access/local.ts
src/data-access/index.ts
src/data-access/hooks.ts
src/contexts/DatabaseProvider.tsx
src/lib/billing-actions.ts
src/lib/billing-actions.test.ts
```
Modified: `src/contexts/BillingStore.tsx`, `src/App.tsx`, `src/db/database.ts` (emit `CHANGED` on commit)

### Files added in STEP-09 (for code review)
```
src/db/lab-seed.ts
src/lib/lab-order-map.ts
src/lib/lab-actions.ts
src/lib/lab-actions.test.ts
```
Modified: `src/contexts/LabFlowStore.tsx`, `src/data-access/types.ts` (+LabOrderMeta), `src/db/database.ts` (lab order seed)

### Files added/modified in UI pass (STEP-00..09 surfaces, 2026-06-29)
```
src/lib/patient-display.ts          (canonical patient lookup for consultation)
src/lib/billing-actions.ts          (+createVisitWithInvoice, visits.insert)
src/pages/BillingInitiation.tsx
src/pages/ConsultationModule.tsx
src/pages/LaboratoryCenter.tsx
src/pages/LoginPage.tsx
src/pages/PharmacyCenter.tsx
src/pages/RecordsDepartmentCenter.tsx
src/pages/RadiologyCenter.tsx
src/components/RequireRole.tsx
src/App.tsx                         (RequireRole on consultation + lab routes)
```

---

## 1. Executive summary of the audit

GFA HMS is an **extremely ambitious, visually polished, but architecturally hollow** hospital management system. It is best described as a **high-fidelity clickable prototype**: ~50 page modules, **678 routes**, and 26 user roles spanning every department of a neuropsychiatric hospital. The UI is consistent and genuinely impressive in breadth. However, the system is **not wired end to end**, and the central architectural promise — a single `database.js` source of truth — **does not exist**.

The result: each department is a beautiful island. Screens render convincing data, but that data is hard-coded per file, isolated per page, and **lost on every page refresh**. Three small areas (Billing, Lab, Consultation) prove the intended pattern by sharing live React-context stores — but even those two stores don't talk to each other.

**The single most important finding:** there is **no `database.js`**. Instead there are **~14 independent static data files** in `src/data/`, **3 partial React-context stores**, and a great deal of data defined inline inside page components. The same patient ("John Doe", "Amina Yusuf") is re-invented in at least **five** incompatible shapes with five different ID formats. Until a real single source of truth exists, "every module talks to each other" is structurally impossible.

**The second most important finding:** there is **effectively no access control**. Of 678 routes, only **8** (the `/billing/*` routes) are wrapped in `RequireRole`. Every other dashboard — Super Admin, IAM Security Center, Patient EMR, Finance, HR — is reachable by anyone, logged in or not, by typing the URL. Auth itself is an in-memory email-substring guess with no password check and no persistence.

### Health by area

| Area | State | Verdict |
|------|-------|---------|
| Visual design / component system | **Excellent** | Keep, do not touch |
| Breadth of modules / departments | **Excellent** (26 roles, ~50 modules) | Keep the surface, fix the wiring |
| `database.js` single source of truth | **Does not exist** | **Build it (Phase 1) — this is the keystone** |
| Persistence (survive refresh) | **Broken** (in-memory only, 3 files touch localStorage) | Build with the DB layer (Phase 1) |
| Auth (login, session, roles) | **Broken / unsafe** (no password, no persistence, duplicated role-guess) | Rebuild on DB (Phase 2) |
| Route protection / RBAC | **Broken** (8 of 678 routes guarded) | Systematic guards (Phase 2) |
| Billing ↔ Cashier ↔ Consultation gate | **Works** (the reference pattern) | Keep, migrate onto DB |
| Lab order lifecycle (`LabFlowStore`) | **Works** in isolation | Keep, connect to Billing + DB |
| Pharmacy / Radiology / IPD / Discharge | **Partial** (read shared seeds, mutate locally) | Wire to DB + shared stores |
| Clinical department "Centers" (Psychology, CAP, Addiction, ICU, Physio, Speech, Nutrition, Social Work, Psychogeriatrics, Nursing) | **Static shells** (UI only, inline data, no cross-talk) | Wire to DB; these are ~12 of the largest files |
| EMR Core / EMR Background Sync | **Simulated** (mock event log, nothing emits real events) | Make events real (Phase 5) |
| Patient Portal / MPI / Scheduling / IAM (the SuperAdmin "Centers") | **Static shells** | Wire to DB |
| Public website (Home, About, Services, Departments, Doctors, News, Careers, Contact, Appointment) | **Good** as marketing; appointment form is a dead end | Wire appointment → DB (Phase 3) |
| Leftover branding (`OOUTH`, "GFA HMS-12345" codes, "GFA HMS " with trailing space) | **Inconsistent** | Clean up (Phase 0) |
| Tests | **Absent** (1 trivial test) | Add smoke tests per phase |

**Overall maturity: ~30% complete.** The "looks done" surface is ~90%; the "is wired" core is ~15%. The gap between those two numbers is the entire body of this document.

---

## 2. System architecture — current vs. intended

### 2.1 Current architecture (as built)

```
main.tsx
 └─ App.tsx
     ├─ QueryClientProvider           (TanStack Query mounted but UNUSED)
     ├─ TooltipProvider
     ├─ AuthProvider                  (in-memory user, no persistence, no password)
     ├─ BillingStoreProvider          (live store: visits/invoices/txns/audit)  ← REAL wiring
     ├─ LabFlowProvider               (live store: lab request lifecycle)        ← REAL wiring
     └─ BrowserRouter
         └─ Routes  (678 <Route> entries, 8 guarded by RequireRole)
              ├─ Public site pages        → read src/data/dummyData, hospitalData
              ├─ Billing / Consultation   → read BillingStore (✓ wired)
              ├─ Lab modules              → read LabFlowStore (✓ wired)
              ├─ Pharmacy / IPD / Records → read src/data/hmsData (shared seed, local mutation)
              └─ ~30 department "Centers"  → inline static data, no store, no cross-talk
```

**Data layer reality:** there is no data layer. There are ~14 sibling files in `src/data/` that each `export const` arrays of literals:

```
src/data/
  dummyData.ts          users, patients, staffMembers, appointments, departments, doctors  (the "root" seed)
  hmsData.ts            patientRecords, labRequests, drugStock, prescriptions, beds, admissions, posTransactions, auditTrail, discharges
  billingData.ts        visits, billingInvoices, billingTxns, billingAudit  (consumed by BillingStore)
  invoiceData.ts        invoices, hospitalServices, consultationTypes, extendedStaffData, updatedAiInsights
  labData.ts            labCatalog, labRequestsFull, labStaff, labDevices
  pharmacyData.ts       drugCatalog, prescriptionsFull, stockMovements, pharmacyStaff
  hrData.ts             HR datasets
  workflowData.ts       attendance, leave, payroll, departmentRevenue, staffRevenueRows, cashFlow...
  ipdData.ts            IPD datasets
  dischargeData.ts / dischargeBillingData.ts
  emrSyncData.ts        syncEvents, channelHealth, idMappings (a SIMULATED sync log)
  patientPortalData.ts
  hospitalData.ts       blog, careers, management team, doctor performance, system features
```

These files **do not reference each other** and use **incompatible identity schemes** (see §3). Most department Centers import only `formatCurrency` from `dummyData` and then define their own data inline.

### 2.2 Intended architecture (the goal you stated)

```
src/database.js (or src/db/database.ts)   ← SINGLE SOURCE OF TRUTH
   • One normalized in-memory dataset: patients, visits, encounters, orders,
     invoices, payments, admissions, beds, staff, users, departments, audit, ...
   • Seeded once; persisted to localStorage/IndexedDB; reload-safe.
   • Exposes a typed "API" (db.patients.create(), db.invoices.capture(), db.events.emit()...)
   • An event bus so a write in one module is observable by every other module.
        │
        ▼
   A thin client layer (TanStack Query or a context "useDb()") that every page reads/writes through.
        │
        ▼
   Every module / department / role reads + writes the SAME records.
   A doctor's lab order → appears in Lab → triggers Billing invoice → cashier captures →
   Lab unlocks → result entered → flows to EMR → visible in Patient Portal. End to end.
```

The current `BillingStore` + `LabFlowStore` are **correct in spirit** and should be the template for this — but generalized into one `database.js` that backs **all** modules, and **persisted**.

### 2.3 The core architectural problems (ranked)

1. **No single source of truth.** The promised `database.js` is absent; data is fragmented across ~14 files + inline. (Phase 1)
2. **No persistence.** Everything is React `useState` over static seeds. A refresh logs you out and discards every action. (Phase 1)
3. **Fragmented patient identity.** No canonical patient record; 5+ incompatible shapes. Cross-module joins are impossible. (Phase 1)
4. **No real access control.** 670 of 678 routes are open; auth has no password and no session. (Phase 2)
5. **Departments don't talk.** ~30 Centers are self-contained; no referrals, orders, or results cross boundaries for real. (Phases 4–6)
6. **Simulated integrations presented as real.** EMR sync, NHIS/NIBSS channels, AI insights are static fixtures. Fine for a demo, but must be labeled and/or made event-driven. (Phase 5)
7. **Duplicated logic.** `guessRole()` is copy-pasted in `AuthContext.tsx` and `LoginPage.tsx` and can drift. Two separate invoice-numbering schemes (BillingStore vs LabFlowStore). (Phase 2/4)

---

## 3. The data-fragmentation problem (the heart of the audit)

The same human being exists as **five different records** with **five ID formats** and **no link between them**:

| File | Symbol | "John Doe / Amina" identity | ID format |
|------|--------|------------------------------|-----------|
| `dummyData.ts` | `patients` | `P001` John Doe | `P00x` |
| `hmsData.ts` | `patientRecords` | `PR001` / `GFA HMS/2026/00145` John Doe | `PRxxx` + `GFA HMS/2026/00xxx` |
| `emrSyncData.ts` | `idMappings` | `GFA HMS/2026/000145` → `EMR-778201` | `GFA HMS/2026/000xxx` (different padding!) |
| `billingData.ts` | `visits` | own patient fields per visit | `VST...` |
| `LabFlowStore.tsx` | `seed` | `OOUTH-00231` Amina Yusuf | `OOUTH-xxxxx` (leftover branding!) |

Consequences:
- You **cannot** show a patient's labs, bills, prescriptions, and admission on one screen, because no shared key joins them.
- Hospital ID formats are inconsistent (`GFA HMS/2026/00145` vs `GFA HMS/2026/000145` vs `OOUTH-00231`), and several contain a **trailing space** (`"GFA HMS "`) or booking codes like `GFA HMS-12345` that are really old templated strings.
- "Every module talks to each other" is impossible until one `Patient` shape with one ID is the only patient definition in the app.

**This is the keystone fix (Phase 1, FIX-01..FIX-02).** Everything else depends on it.

---

## 4. User roles & access map

26 roles are declared in `dummyData.ts` `UserRole`:

```
superadmin, admin, staff, student, patient, cmd, board, finance, hr, doctor, it,
nurse, pharmacist, lab, radiology, psychology, cap, addiction, psychogeriatrics,
physiotherapy, speech, nutrition, socialwork, icu, cashier, records
```

### 4.1 Role → landing route (from `LoginPage.handleLogin`)
- `lab` → `/dashboard/laboratory`
- `doctor` → `/dashboard/doctor/clinical`
- everything else → `/dashboard/{role}` (all of these targets exist as routes ✓)

### 4.2 Auth findings (`src/contexts/AuthContext.tsx`, `src/pages/LoginPage.tsx`)
- `login(email, password)` **ignores the password** and either finds a seeded user or fabricates one from an email-substring `guessRole()`. Any string logs in.
- **`guessRole()` is duplicated** in both files and they have **already drifted** (LoginPage's physio branch dropped the `rehab-physio` token). Single source needed.
- User is stored only in React state → **refresh = logged out**.
- `register()` fabricates a user client-side and navigates; persists nothing.
- The login marketing copy claims "15 Integrated Roles" but there are 26 — copy is stale.

### 4.3 RBAC findings (`src/components/RequireRole.tsx`, `App.tsx`)
- `RequireRole` itself is **well written** (redirects unauth → `/login`, shows a 403 panel for wrong role).
- It is applied to **only 8 routes** (all under `/billing`). The SuperAdmin console, IAM Security Center, full Patient EMR, Finance, HR, every clinical Center, and every `/hms/*` route are **completely unguarded**.
- There is **no concept of "is this my patient"** or department-scoping — a logged-in nutritionist can open the ICU ventilator screen.

---

## 5. REMOVE / KEEP / UPGRADE inventory

### 5.1 KEEP (the assets — do not break)
```
The entire design system: src/components/ui/*, DashboardLayout, SummaryCard, StatusBadge,
  SiteHeader/Footer/Hero, all Tailwind tokens.  ← untouched
The two working stores: BillingStore.tsx, LabFlowStore.tsx  ← these become adapters over database.js
The working flow: Cashier capture → Consultation gate unlock → Lab order  (ConsultationModule, BillingInitiation)
All public site pages (Home/About/Services/Departments/Doctors/News/Careers/Contact)
All 678 route targets (the breadth is the product) — they get wired, not deleted
```

### 5.2 UPGRADE (covered by fixes in Sections 8–10)
```
src/data/* (14 files)        → fold into ONE database.js seed (FIX-01)
AuthContext + LoginPage      → real session on DB, single guessRole, persistence (FIX-05..FIX-06)
App.tsx routing              → wrap every /dashboard, /hms, /lab, /pharmacy, /ipd, /discharge,
                                /consultation, /records route in RequireRole (FIX-03)
BillingStore + LabFlowStore  → back onto database.js, unify invoice numbering, link the two (FIX-08, FIX-12)
EMR sync                     → emit real events from real writes (FIX-15)
~30 department Centers       → read/write database.js; enable referrals between departments (Phase 6)
```

### 5.3 REMOVE / RENAME (dead or wrong)
> Search for imports before deleting anything.
```
"OOUTH-" id helper in LabFlowStore.tsx                 → rename to GFA HMS id scheme (FIX-02)
Trailing-space "GFA HMS " literals + "GFA HMS-12345" booking codes  → normalize (FIX-02)
Duplicate guessRole() in LoginPage.tsx                  → import from one module (FIX-05)
Stale "15 Integrated Roles" copy in LoginPage           → fix to 26 (FIX-06, cosmetic)
README.md "TODO: Document your project here"            → real README (FIX-25, last)
```
> **Do NOT delete** any `src/data/*` file until its data has been migrated into `database.js` and all importers repointed (FIX-01 does the migration; FIX-24 removes the emptied files).

---

## 6. Module-by-module maturity audit

Ratings are **current state**, not target. "Wired" = reads/writes shared, cross-module, refresh-safe state.

### 6.1 Billing / Cashier / Consultation gate — **4 / 5 (the reference module)**
| Question | Answer |
|----------|--------|
| Wired E2E? | **Yes, in-session.** `BillingStore` is the single store; cashier `capturePayment` flips invoice + visit status and **unlocks the doctor's consultation gate** live. Emergency override, reversals, shift open/close, audit log all present and coherent. |
| Persistence | **No.** Refresh resets to seed. |
| Gaps | Not linked to `LabFlowStore` (lab payments bypass it); not linked to department billing screens; invoice numbering is a second scheme vs Lab. |
| Files | `contexts/BillingStore.tsx`, `pages/BillingInitiation.tsx`, `pages/BillingRevenueCenter.tsx`, `pages/ConsultationModule.tsx` |

### 6.2 Laboratory (`LabFlowStore`) — **3.5 / 5**
| Question | Answer |
|----------|--------|
| Wired E2E? | **Within Lab, yes.** Full lifecycle `PENDING_DOCTOR → SENT_TO_BILLING → AWAITING_PAYMENT → PAID/NHIA/HMO/WAIVED → SAMPLE_COLLECTED → DRAFT → AWAITING_VALIDATION → COMPLETED`, with audit + toasts. Clean design. |
| Cross-module | **Broken.** "Sent to billing" does **not** create a `BillingStore` invoice; it just flips a local status. The cashier in Billing never sees lab charges. |
| Persistence | No. Own `invoiceSeq`/`sampleSeq` module-level counters reset on reload. |
| Files | `contexts/LabFlowStore.tsx`, `pages/LabModule.tsx`, `pages/LaboratoryCenter.tsx` (209 KB), `pages/LaboratoryExtended.tsx` |

### 6.3 Pharmacy / IPD / Records / Discharge — **2.5 / 5**
| Question | Answer |
|----------|--------|
| Wired E2E? | **Partial.** Read shared seeds from `hmsData.ts`; mutate via local `useState`. `RecordsDepartmentCenter` and `IpdModuleNew` use `useAuth`. No invoice/EMR propagation. |
| Persistence | No. |
| Files | `pages/PharmacyModule.tsx`, `PharmacyCenter.tsx`, `PharmacyProcurement.tsx`, `IpdModuleNew.tsx`, `AdmissionWardCenter.tsx`, `DischargeModuleNew.tsx`, `RecordsDepartmentCenter.tsx` |

### 6.4 Clinical department "Centers" — **2 / 5 (static shells)**
Applies to: **Psychology, Child & Adolescent Psychiatry, Addiction & Rehab, Psychogeriatrics, Physiotherapy, Speech Therapy, Nutrition & Dietetics, Social Work, ICU/Critical Care, Nursing, Radiology.**
| Question | Answer |
|----------|--------|
| Wired E2E? | **No.** Each is a single 100–210 KB file exporting ~20 sub-pages + its own `nav`. Data is inline static or local `useState`. Imports usually just `formatCurrency`. |
| Cross-talk | **None.** A psychology referral to physiotherapy, or an ICU lab order, does not appear anywhere else. No shared patient. |
| Refresh-safe | No. |
| Verdict | The UI is done; the wiring is zero. These are the bulk of Phase 6. |

### 6.5 SuperAdmin Centers: IAM Security, MPI (registration), Patient Portal, Scheduling — **2 / 5**
| Question | Answer |
|----------|--------|
| Wired E2E? | **No.** `PatientRegistrationMpi` (MPI) is where patients *should* be created into the source of truth, but it writes nowhere shared. IAM/Portal/Scheduling are display shells. |
| Note | MPI is strategically important: it must become the canonical "create patient" entry into `database.js` (FIX-10). |

### 6.6 EMR Core + EMR Background Sync — **2 / 5 (simulated)**
| Question | Answer |
|----------|--------|
| Wired E2E? | **No.** `emrSyncData.ts` is a hand-authored event log (synced/retry/dead-letter, NHIS/NIBSS/NPHCDA channels). Nothing in the app emits these events; the numbers never change. |
| Verdict | Beautiful and convincing, but fictional. Make the event feed real (writes emit events) in Phase 5. |

### 6.7 Executive dashboards: Board, CMD, Finance, HR, Admin, IT — **2.5 / 5**
| Question | Answer |
|----------|--------|
| Wired E2E? | **No (read-only over static aggregates).** Finance reads `workflowData`/`invoiceData`; CMD reads `emrSyncData` + `invoiceData`; HR reads `workflowData`. KPIs are precomputed literals, not derived from live records. |
| Fix | After Phase 1, compute these from `database.js` so they move when operations happen (Phase 7). |

### 6.8 Patient-facing: Public site + Patient Portal/Dashboard + Student — **2.5 / 5**
| Question | Answer |
|----------|--------|
| Public appointment form (`site/AppointmentPage.tsx`) | Collects everything, then **dead-ends** — creates no appointment record. Should write to `database.js` and appear in Scheduling/Records (FIX-09). |
| Patient Dashboard | Reads `appointments`, `invoices`, `labRequestsFull`, `prescriptionsFull` from static files for a generic patient — **not the logged-in user's** data. |
| Student | Token module (courses/payments) — fine to defer. |

---

## 7. UX / workflow audit (no visual redesign — flow & clarity only)

| # | Finding | Action |
|---|---------|--------|
| UX-1 | **Refresh destroys everything** (auth + all actions). The #1 UX bug. | Fixed by Phase 1 persistence. |
| UX-2 | **No global patient context.** You can't pick a patient once and have every module follow. | Add a `useCurrentPatient()` selector over `database.js` (FIX-13). |
| UX-3 | **Dead ends:** public appointment, register, "Forgot password", most "Config/AI/Offline/Mobile" tabs render static placeholders. | Wire the real ones (appointment, register); clearly mark the demo-only tabs (FIX-23). |
| UX-4 | **Unguarded deep links** mean a user can land on a 403-less screen for another role and be confused. | Phase 2 guards give a consistent 403. |
| UX-5 | **Cross-module handoffs are invisible.** Lab "sent to billing" never shows up for the cashier; doctor's order never reaches pharmacy. | Phase 4–6 wiring + a shared notifications/worklist. |
| UX-6 | **Sidebar nav per department is hard-coded per file**; a role with cross-department duties can't see a unified worklist. | Optional Phase 7 unified worklist. |
| UX-7 | **Identity/branding inconsistencies** (`OOUTH`, trailing spaces, `GFA HMS-12345`) erode trust in the data. | FIX-02 normalization. |
| UX-8 | **Login claims "15 roles"; demo logins list 26.** | FIX-06. |

---

## 8. PHASE 0 — Stabilize & baseline (do first, low risk)

### FIX-00 — Establish a green baseline
- **Why:** You must know the build/lint/test state before changing anything.
- **Files:** none (commands only).
- **Exact change:** Run `npm install`, `npm run build`, `npm run lint`, `npm test`. Record failures. Fix only **build-breaking** errors here; defer everything else to its phase.
- **Verify:** `npm run build` exits 0. Commit the lockfile if it changed.

### FIX-0A — Normalize project identity constants (cosmetic, no behavior)
- **Why:** `OOUTH`, trailing-space `"GFA HMS "`, and `GFA HMS-12345`-style codes are leftover artifacts that confuse the data story. Centralizing now avoids re-touching 50 files later.
- **Files:** create `src/lib/brand.ts` exporting `HOSPITAL_NAME`, `HOSPITAL_SHORT = 'GFA HMS'`, `hospitalId(seq)`, `bookingCode(seq)`, `invoiceNo(...)`.
- **Exact change:** Add the helpers; do **not** mass-rewrite yet (FIX-02 migrates usages during the DB build). Just stop introducing new inconsistent literals.
- **Verify:** `npm run build` passes; new file is imported by `database.js` in FIX-01.

---

## 9. PHASE 1 — Build `database.js`, the single source of truth (KEYSTONE)

> This phase is the spine of the whole plan. Until it lands, no "end-to-end" claim is real. Do it carefully and in order. Keep the UI untouched; only change where data comes from.

### FIX-01 — Create the canonical in-memory database with persistence
- **Why:** Replace ~14 disconnected seed files with one normalized, persisted, observable dataset — the architecture the owner asked for.
- **Files:** create `src/database.js` (or `src/db/database.ts` — TS preferred for type-safety; the owner said "database.js", so a `.ts` that builds to the same idea is acceptable — confirm preference).
- **Exact change:** Implement:
  1. **One normalized schema** with **one** definition each of: `users`, `patients` (single canonical `Patient` with one `hospitalId`), `staff`, `departments`, `visits`, `encounters`, `appointments`, `labOrders`, `prescriptions`, `radiologyOrders`, `invoices`, `payments`, `admissions`, `beds`, `wards`, `referrals`, `auditLog`, `syncEvents`, `notifications`.
  2. **Seed** it once from the existing data (port the literals out of `src/data/*` — keep the realistic Nigerian content, just unify shapes and IDs via `src/lib/brand.ts`).
  3. **Persistence:** hydrate from `localStorage` on load, write-through on every mutation (debounced). Provide `db.reset()` to reseed.
  4. **Typed accessors + mutators**, e.g. `db.patients.list()/get(id)/create()`, `db.invoices.capture()`, `db.labOrders.advance()`, returning new immutable snapshots.
  5. **Event bus:** `db.on(event, cb)` / `db.emit(event, payload)` so a write in one module notifies others (this powers EMR sync + cross-department worklists).
- **Verify:** A throwaway test creates a patient, reloads (simulate by re-reading localStorage), and finds the patient. `npm run build` passes.

### FIX-02 — Unify patient identity & ID schemes
- **Why:** Cross-module joins require one patient key. (See §3.)
- **Files:** `src/database.js`, `src/lib/brand.ts`.
- **Exact change:** Every patient has exactly one `id` and one `hospitalId` (format from `brand.ts`, e.g. `GFA/HMS/2026/00145`, zero-padded consistently, no trailing space). Map the five legacy identities (`P001`, `PR001`, `OOUTH-00231`, EMR refs, visit-embedded) onto single canonical records during seeding. Replace `OOUTH-` and `GFA HMS-` literals.
- **Verify:** Grep shows no remaining `OOUTH` or `GFA HMS-` or `"GFA HMS "` literals outside `brand.ts` history. Build passes.

### FIX-03 — Introduce a `useDb()` access hook (React binding)
- **Why:** Pages need a stable, reactive way to read/write the DB and re-render on change.
- **Files:** create `src/contexts/DatabaseProvider.tsx`; mount it in `App.tsx` **above** `BillingStoreProvider`/`LabFlowProvider`.
- **Exact change:** Provider subscribes to `db` events and exposes typed selectors + actions via context. Add selector hooks (`usePatients`, `usePatient(id)`, `useInvoices`, `useLabOrders`, …).
- **Verify:** A demo component reads `usePatients()` and updates when `db.patients.create()` runs. Build passes.

### FIX-04 — Migrate `BillingStore` and `LabFlowStore` onto `database.js`
- **Why:** The two working stores must read/write the canonical DB, not their private seeds, so payments/labs are visible everywhere and survive refresh.
- **Files:** `contexts/BillingStore.tsx`, `contexts/LabFlowStore.tsx`.
- **Exact change:** Replace `useState(seed…)` with reads/writes through `useDb()`. Keep the **exact same public API** (`capturePayment`, `addRequest`, …) so consuming pages don't change. Move `invoiceSeq`/`sampleSeq` into `db`.
- **Verify:** Cashier capture in `BillingInitiation` still unlocks the consultation gate in `ConsultationModule`, **and** the change survives a refresh. Build passes.

### FIX-24 — Repoint remaining `src/data/*` importers, then retire emptied files
- **Why:** Finish the migration; remove the fragmentation source.
- **Files:** all pages importing from `src/data/*` (see §inventory); `src/data/*`.
- **Exact change:** Repoint imports to `database.js` selectors. Once a data file has no importers, delete it. Keep `dummyData.ts` exports that are pure helpers (`formatCurrency`) — or move them to `src/lib/format.ts`.
- **Verify:** `npm run build` passes with zero references to deleted files.

---

## 10. PHASE 2 — Real auth, session & route protection

### FIX-05 — One `guessRole`, real-ish login on the DB
- **Why:** Remove duplicated/diverged role logic; authenticate against `db.users`.
- **Files:** create `src/lib/roles.ts` (single `guessRole`, role→landing map, role labels); `contexts/AuthContext.tsx`; `pages/LoginPage.tsx`.
- **Exact change:** Both files import `guessRole` from `roles.ts`. `login()` looks up `db.users` by email; demo mode may still accept any password (keep the "demo logins" UX) but the user object comes from the DB.
- **Verify:** All 26 demo logins land on the correct dashboard. Build passes.

### FIX-06 — Persist the session
- **Why:** Refresh currently logs the user out.
- **Files:** `contexts/AuthContext.tsx`.
- **Exact change:** Persist the authenticated user to `localStorage` (or via `db`); rehydrate on load. Fix the stale "15 Integrated Roles" copy → "26".
- **Verify:** Log in, refresh, still logged in and on the same dashboard. Build passes.

### FIX-03B — Guard every dashboard route
- **Why:** 670 of 678 routes are open. (See §4.3.)
- **Files:** `App.tsx` (plus, optionally, a small `withRole()` route helper).
- **Exact change:** Wrap each route group in `RequireRole` with the correct role set. Suggested matrix:
  - `/dashboard/superadmin/*`, `/dashboard/superadmin/iam/*`, `/dashboard/superadmin/mpi|portal|scheduling|billing/*` → `['superadmin']` (+`admin` where appropriate)
  - `/dashboard/doctor/*`, `/consultation/*` → `['superadmin','doctor','cmd']`
  - `/dashboard/nurse/*` → `['superadmin','nurse']`
  - `/lab/*`, `/dashboard/laboratory/*` → `['superadmin','lab']`
  - `/pharmacy/*`, `/dashboard/pharmacy/*` → `['superadmin','pharmacist']`
  - `/ipd/*`, `/discharge/*`, `/dashboard/admission/*` → `['superadmin','records','nurse','doctor']`
  - `/records/*`, `/hms/*` → `['superadmin','records','admin']`
  - `/dashboard/finance/*` → `['superadmin','finance','cmd','board']`
  - `/dashboard/hr/*` → `['superadmin','hr']`
  - `/dashboard/{psychology|cap|addiction|psychogeriatrics|physiotherapy|speech|nutrition|socialwork|icu|radiology}/*` → `['superadmin', <that role>, 'doctor']`
  - `/dashboard/patient/*` → `['patient']`; `/dashboard/student/*` → `['student']`
  - Keep public site + `/login` open.
- **Verify:** Logged out → any dashboard URL redirects to `/login`. Wrong role → 403 panel. Correct role → renders. Build passes.

---

## 11. Comment standard (apply to every new/edited function)

Per the project rule and the reference plan: **no narration comments.** Comment **intent, constraints, and cross-module contracts** only.

```ts
// Capture a payment against an invoice. When the balance reaches zero we flip the
// linked visit to consultationUnlocked so the doctor's gate opens (see ConsultationGate).
// Cash/POS require an open shift; Bank Transfer is allowed offline and matched later.
function capturePayment(input: CaptureInput) { /* ... */ }
```

Bad (delete on sight): `// set state`, `// import x`, `// loop over patients`, `// return result`.

---

## 12. PHASE 3+ — Wire the workflows end to end (overview)

> These phases assume Phases 1–2 are done. Each turns a "static shell" into a real participant in the shared DB. Full task breakdowns (Why/Files/Exact change/Verify) should be written per module as you reach them; the skeleton and ordering are below.

### Phase 3 — Front door: registration → appointment → visit
- **FIX-09** Public `site/AppointmentPage` writes a real `appointment` into `db`; it appears in Scheduling + Records worklists; sends a (mock) confirmation.
- **FIX-10** MPI (`PatientRegistrationMpi`) becomes the canonical **create-patient** flow into `db.patients` (dedupe against existing `hospitalId`/NIN).
- **FIX-11** Records `TriageQueue`/`PatientDirectory` read/write the same patients + visits.

### Phase 4 — Clinical core loop (the money path)
- **FIX-12** Doctor consultation creates **orders** (lab, drug, imaging) in `db`; each order auto-generates a `BillingStore` invoice (unify the two numbering schemes).
- **FIX-13** Add `useCurrentPatient()` — pick a patient once, every module follows.
- **FIX-14** Lab/Pharmacy/Radiology consume orders from `db`, run their lifecycle, write results back to the patient's `encounters`.

### Phase 5 — EMR + sync become real
- **FIX-15** Every significant `db` write `db.emit()`s a `SyncEvent`; `EmrSyncModule` renders the **live** queue (replace static `emrSyncData`). Keep the retry/dead-letter UI; drive it from real events. Label external channels (NHIS/NIBSS/NPHCDA) explicitly as simulated.

### Phase 6 — Department centers join the network
- **FIX-16..FIX-21** For each Center (Psychology, CAP, Addiction, Psychogeriatrics, Physiotherapy, Speech, Nutrition, Social Work, ICU, Nursing): read the shared patient/visit, accept **referrals** from other departments via `db.referrals`, write notes into `encounters`, and bill via `BillingStore`. Cross-department referral is the acceptance test ("Psychology refers patient to Physiotherapy → Physio sees it").

### Phase 7 — Executive truth & polish
- **FIX-22** Board/CMD/Finance/HR/Admin KPIs computed **from `db`**, not literals — so they move when operations happen.
- **FIX-23** Mark demo-only tabs (Config/AI/Offline/Mobile) consistently so they aren't mistaken for finished features.
- **FIX-25** Real `README.md` documenting the `database.js` contract, roles, and the end-to-end flows.

---

## 13. Phase ordering (do not reorder)

1. **Phase 0** — FIX-00, FIX-0A (baseline + brand constants)
2. **Phase 1** — FIX-01 → FIX-02 → FIX-03 → FIX-04 → FIX-24 (**the database.js keystone**)
3. **Phase 2** — FIX-05 → FIX-06 → FIX-03B (auth + RBAC)
4. **Phase 3** — FIX-09 → FIX-10 → FIX-11 (front door)
5. **Phase 4** — FIX-12 → FIX-13 → FIX-14 (clinical loop)
6. **Phase 5** — FIX-15 (EMR/sync real)
7. **Phase 6** — FIX-16..FIX-21 (departments join)
8. **Phase 7** — FIX-22 → FIX-23 → FIX-25 (executive truth + docs)

**Acceptance test for "wired end to end" (run after Phase 4, expand after Phase 6):**
> Register a patient in MPI → book/admit → doctor orders an FBC → invoice appears for the cashier → cashier captures payment → Lab unlocks, collects sample, enters & validates result → result shows on the patient's EMR and Patient Portal → an EMR `SyncEvent` is emitted → **refresh the page and all of it is still there.**

When that single sentence is true across modules, the platform is genuinely end-to-end.

---

## 14. Quick reference — file map of what to touch

| Concern | Primary files |
|---------|---------------|
| New source of truth | `src/database.js` (new), `src/contexts/DatabaseProvider.tsx` (new), `src/lib/brand.ts` (new), `src/lib/roles.ts` (new) |
| Working stores to migrate | `src/contexts/BillingStore.tsx`, `src/contexts/LabFlowStore.tsx` |
| Auth & guards | `src/contexts/AuthContext.tsx`, `src/pages/LoginPage.tsx`, `src/components/RequireRole.tsx`, `src/App.tsx` |
| Front door | `src/pages/site/AppointmentPage.tsx`, `src/pages/PatientRegistrationMpi.tsx`, `src/pages/RecordsDepartmentCenter.tsx` |
| Clinical loop | `src/pages/ConsultationModule.tsx`, `src/pages/DoctorClinicalCenter.tsx`, `src/pages/LabModule.tsx` / `LaboratoryCenter.tsx`, `src/pages/PharmacyModule.tsx` / `PharmacyCenter.tsx`, `src/pages/RadiologyCenter.tsx`, `src/pages/IpdModuleNew.tsx`, `src/pages/DischargeModuleNew.tsx` |
| EMR / sync | `src/pages/EmrCoreCenter.tsx`, `src/pages/EmrSyncModule.tsx`, `src/data/emrSyncData.ts` |
| Department centers | `Psychology/ChildAdolescentPsychiatry/AddictionRehab/Psychogeriatrics/Physiotherapy/SpeechTherapy/NutritionDietetics/SocialWork/IcuCriticalCare/NursingCenter.tsx` |
| Executive | `BoardDashboard.tsx`, `CmdDashboard.tsx`, `FinanceDashboard.tsx`, `HrDashboard.tsx`, `AdminDashboard.tsx`, `SuperAdminDashboard.tsx`, `ItDashboard.tsx` |
| Data to fold in & retire | `src/data/*.ts` (all 14) |

---

---

# PART II — Blunt correction, complete per-module breakdown, frontend revamp & backend stack

> **Why this part exists:** the first pass (Sections 1–14) was honest about *systemic* problems but **cheated on coverage**. It folded ~30 departments into two summary rows (§6.4, §6.5) and gave them shared ratings instead of treating each user type and each department as its own module with its own fixes. The product owner called that out. They were right. Part II fixes it: every user type and every department gets its own module spec, plus a frontend-revamp contract so a separate agent can build the backend + database against it, plus a real Node/Java/C# recommendation. This part is intentionally exhaustive.

---

## 15. BLUNT coverage confession + the COMPLETE inventory

### 15.1 What the first pass got wrong
- It did **not** enumerate all 26 user types with per-role fixes.
- It did **not** give each of the ~30 department modules its own fix pack.
- It buried the **missing departments** problem (a neuropsychiatric hospital needs units this build doesn't have).
- It did **not** specify the **frontend→backend contract** at all.
- It gave **no** backend stack guidance.

All five are corrected below.

### 15.2 The blunt truth about scope vs. reality
This app has **678 routes** and the **look** of a hospital-wide system, but the number of routes is a **liability, not an achievement**: every route is a maintenance surface, and ~98% of them are unguarded, unpersisted, and disconnected. **Breadth was built before depth.** A real HMS would rather have 8 departments fully wired than 30 departments faked. The plan below assumes you will keep the breadth (it's already built) but you must understand you are wiring *678 routes worth* of surface to one database — budget accordingly.

### 15.3 Complete user-type inventory (26 roles) — coverage matrix

| # | Role (`UserRole`) | Landing route | Dedicated module file | Wired to shared state? | Blunt status |
|---|---|---|---|---|---|
| 1 | `superadmin` | `/dashboard/superadmin` | `SuperAdminDashboard.tsx` (+IAM, MPI, Portal, Scheduling, Billing centers) | No | Giant static console |
| 2 | `board` | `/dashboard/board` | `BoardDashboard.tsx` | No | Static KPIs |
| 3 | `cmd` | `/dashboard/cmd` | `CmdDashboard.tsx` | Reads static `emrSyncData` | Static exec view |
| 4 | `admin` | `/dashboard/admin` | `AdminDashboard.tsx` | No | Static |
| 5 | `finance` | `/dashboard/finance` | `FinanceDashboard.tsx` | Reads static aggregates | Static |
| 6 | `hr` | `/dashboard/hr` | `HrDashboard.tsx` | Reads `workflowData`/`hrData` | Static |
| 7 | `doctor` | `/dashboard/doctor/clinical` | `DoctorClinicalCenter.tsx`, `DoctorExtended.tsx`, `DoctorDashboard.tsx`, `ConsultationModule.tsx`, `EmrCoreCenter.tsx` | **Partly** (Consultation reads BillingStore) | Best-wired clinician |
| 8 | `nurse` | `/dashboard/nurse` | `NursingCenter.tsx` (104 KB) | No | Static shell |
| 9 | `pharmacist` | `/dashboard/pharmacist` | `PharmacyCenter.tsx`, `PharmacyModule.tsx`, `PharmacyProcurement.tsx` | Reads `hmsData`/`pharmacyData`, local mutate | Partial |
| 10 | `lab` | `/dashboard/laboratory` | `LaboratoryCenter.tsx` (209 KB), `LabModule.tsx`, `LaboratoryExtended.tsx` | **Yes** (LabFlowStore) | Best-wired ancillary |
| 11 | `radiology` | `/dashboard/radiology` | `RadiologyCenter.tsx` | Uses BillingStore partially | Mostly static |
| 12 | `psychology` | `/dashboard/psychology` | `PsychologyCenter.tsx` | No | Static shell |
| 13 | `cap` (Child & Adolescent Psychiatry) | `/dashboard/cap` | `ChildAdolescentPsychiatryCenter.tsx` | No | Static shell |
| 14 | `addiction` | `/dashboard/addiction` | `AddictionRehabCenter.tsx` | No | Static shell |
| 15 | `psychogeriatrics` | `/dashboard/psychogeriatrics` | `PsychogeriatricsCenter.tsx` | No | Static shell |
| 16 | `physiotherapy` | `/dashboard/physiotherapy` | `PhysiotherapyCenter.tsx` | No | Static shell |
| 17 | `speech` | `/dashboard/speech` | `SpeechTherapyCenter.tsx` | No | Static shell |
| 18 | `nutrition` | `/dashboard/nutrition` | `NutritionDieteticsCenter.tsx` | No | Static shell |
| 19 | `socialwork` | `/dashboard/socialwork` | `SocialWorkCenter.tsx` | No | Static shell |
| 20 | `icu` | `/dashboard/icu` | `IcuCriticalCareCenter.tsx` | No | Static shell |
| 21 | `cashier` | `/dashboard/cashier` | `HmsModules.tsx`/`BillingInitiation.tsx` | **Yes** (BillingStore) | Wired |
| 22 | `records` | `/dashboard/records` | `RecordsDepartmentCenter.tsx` | Reads `hmsData`, uses `useAuth` | Partial |
| 23 | `it` | `/dashboard/it` | `ItDashboard.tsx` | Reads `hospitalData` | Static |
| 24 | `staff` | `/dashboard/staff` | `StaffDashboard.tsx` | No | Generic placeholder |
| 25 | `student` | `/dashboard/student` | `StudentDashboard.tsx` | No | Token module |
| 26 | `patient` | `/dashboard/patient` | `PatientDashboard.tsx`, `PatientPortalCenter.tsx` | No (reads generic static patient, not "me") | Static |

### 15.4 BLUNT: roles that are conceptually broken or redundant
- **`staff`** is a meaningless catch-all. In a real hospital every employee has a *specific* role. Either delete it or make it the base profile that every clinical role extends. Right now it's a dead generic dashboard.
- **`student`** (medical/nursing students, NYSC, residents) is a token module borrowed from a school template. GFA HMS *is* a training institution, so this is legitimately needed — but it's currently a 2-screen stub, not a training module.
- **`admin` vs `superadmin` vs `cmd` vs `board`** overlap heavily with no clear permission boundary. You need an explicit RACI: who can configure the system (IT/superadmin), who runs the hospital (CMD), who governs (Board), who does day-to-day ops admin (admin).
- **`doctor`** is a single role, but a neuropsychiatric hospital has **consultant psychiatrist, medical officer, resident, house officer** with very different rights (e.g., only consultants sign off ECT, controlled-drug scripts, discharge). One flat `doctor` role is clinically wrong.

### 15.5 Department/module inventory (what EXISTS) — 30 modules
Grouped by function. Each has a base route and a sub-route count (from `App.tsx`).

**Governance & administration**
1. Super Admin console — `/dashboard/superadmin/*` (~20 sub-routes)
2. IAM & Security Center — `/dashboard/superadmin/iam/*` (~20)
3. Board — `/dashboard/board`
4. CMD (Chief Medical Director) — `/dashboard/cmd`
5. Admin — `/dashboard/admin/*` (~7)
6. Finance — `/dashboard/finance/*` (~12)
7. HR — `/dashboard/hr/*` (~16)
8. IT / Systems — `/dashboard/it/*` (~4)

**Patient access & front door**
9. Patient Registration / Master Patient Index (MPI) — `/dashboard/superadmin/mpi/*` (~23)
10. Patient Portal & PWA — `/dashboard/superadmin/portal/*` (~24)
11. Appointment & Scheduling Center — `/dashboard/superadmin/scheduling/*` (~23)
12. Public website — `/`, `/about`, `/services`, `/departments`, `/doctors`, `/news`, `/careers`, `/contact`, `/appointment`
13. Patient Dashboard — `/dashboard/patient/*` (~9)

**Revenue cycle**
14. Billing Initiation (cashier) — `/billing/*` (8, the only guarded routes)
15. Billing, Wallet & Revenue Center — `/dashboard/superadmin/billing/*` (~21)

**Clinical core**
16. Doctor Clinical Center — `/dashboard/doctor/clinical/*` (~33)
17. Consultation Module — `/consultation/*` (5)
18. Unified EMR Core — `/dashboard/doctor/emr/*` (~24)
19. EMR Background Sync — `EmrSyncModule.tsx`
20. Nursing Center — `/dashboard/nurse/*` (~22)

**Ancillary / diagnostics**
21. Laboratory Center + Lab Module + Extended — `/lab/*`, `/dashboard/laboratory/*` (~36)
22. Pharmacy Center + Module + Procurement — `/pharmacy/*`, `/dashboard/pharmacy/*` (~33)
23. Radiology / Imaging / PACS — `/dashboard/radiology/*` (~21)

**Inpatient**
24. IPD / Admission Module — `/ipd/*` (~11)
25. Admission, Ward & Bed Management — `/dashboard/admission/*` (~18)
26. Final Billing & Discharge — `/discharge/*` (~12)
27. Records Department — `/records/*` (~10) + `/hms/*`

**Multi-specialty specialty centers**
28. Clinical Psychology — `/dashboard/psychology/*` (~20)
29. Child & Adolescent Psychiatry — `/dashboard/cap/*` (~21)
30. Addiction Services & Rehab — `/dashboard/addiction/*` (~21)
31. Psychogeriatrics — `/dashboard/psychogeriatrics/*` (~21)
32. Physiotherapy — `/dashboard/physiotherapy/*` (~24)
33. Speech Therapy — `/dashboard/speech/*` (~28)
34. Nutrition & Dietetics — `/dashboard/nutrition/*` (~27)
35. Social Work & Community Support — `/dashboard/socialwork/*` (~25)
36. ICU / Critical Care — `/dashboard/icu/*` (~29)

### 15.6 BLUNT: departments a neuropsychiatric hospital needs that are MISSING
The build is heavy on therapy sub-specialties but **missing several core units** of a federal neuropsychiatric hospital. Confirm against GFA HMS's real org chart, but these are conspicuously absent as modules:

| Missing module | Why it matters | Action |
|---|---|---|
| **General/Adult Outpatient Psychiatry (GOPD/OPD)** | The single highest-volume clinical service. Currently only an "OPC scheduling" tab + generic Doctor center. | Build a first-class Adult Psychiatry OPD module (FIX-Mnew-1) |
| **Forensic Psychiatry unit** | GFA-type hospitals run court-ordered/forensic admissions with custody, legal holds, mental-health-tribunal workflows. | Build forensic module with legal-status tracking |
| **ECT (Electroconvulsive Therapy) suite** | Core psychiatric procedure; needs consent, anaesthesia checklist, session scheduling, outcome tracking. | Build ECT module |
| **Occupational Therapy** | Physio exists; OT (the more central discipline in psychiatry rehab) does not. | Build OT module (mirror Physio) |
| **Psychiatric Emergency / A&E** | Only an "EmergencyScheduling" tab exists; no triage/observation/crisis module. | Build A&E module |
| **Pharmacy: controlled/psychotropic register** | Partially present (`/pharmacy/controlled`) but not wired to dispensing or DEA-style audit. | Wire controlled register E2E |
| **Mortuary** | Standard hospital unit. | Decide in/out of scope; if in, add module |
| **Engineering / Works / Biomedical maintenance** | Asset & equipment maintenance (the MRI-maintenance AI insight implies it). | Add CMMS-lite module |
| **Stores / Central Supply / Procurement** | Only pharmacy procurement exists; no general stores. | Add stores module |
| **Internal Audit / Quality & Safety** | Gov hospital requirement; only scattered "audit" tabs. | Add quality module |
| **Medical Library / Research / Training (residency)** | Teaching hospital; `student` stub is not enough. | Expand training module |
| **Health Records statutory reporting (NHMIS/DHIS2)** | Federal hospitals must report to DHIS2/NHMIS. | Add reporting in Records |

> Decide explicitly, with the client, which of these are **in scope for v1**. Do not silently leave them out — that's how the first audit went wrong.

---

## 16. PER-MODULE FIX PACKS (every user type & department)

> **How to read each pack:** `Owns` = the canonical entities this module creates/edits in `database.js`. `Consumes` = entities it reads from other modules. `Emits` = events other modules react to. `API` = the REST surface the backend agent must implement for this module (Phase B). `Fix tasks` = the wiring work. Status uses the §6 maturity scale.
>
> **Universal rule for every module:** after Phase 1, **delete all inline/static data** in the module file and read/write exclusively through `useDb()` selectors. No module keeps its own private array. This single rule is repeated implicitly in every pack below.

### 16.A GOVERNANCE & ADMIN

#### MOD-01 — Super Admin Console (`superadmin`)
- **Status:** 2/5 static. **Owns:** `systemConfig`, `featureFlags`, `roleDefinitions`, `tenantSettings`. **Consumes:** everything (read-only oversight). **Emits:** `CONFIG_CHANGED`.
- **Fix tasks:** (a) Make role/permission editor write to `db.roleDefinitions` and have `RequireRole` read from it (dynamic RBAC, not hard-coded arrays). (b) Impersonation must set an audited "acting-as" session. (c) Config screens (backup, integrations, NHIS, coding) must persist real settings, not toggle local state. (d) Every action writes `db.auditLog`.
- **API:** `GET/PUT /admin/config`, `GET/POST/PUT/DELETE /admin/roles`, `POST /admin/impersonate`, `GET /admin/audit`.

#### MOD-02 — IAM & Security Center (`superadmin`)
- **Status:** 2/5 static (20 sub-screens: auth, identity, NIN, RBAC, geo, IP, sessions, threats, encryption, compliance, SOC…). **Owns:** `sessions`, `securityEvents`, `apiKeys`. **Consumes:** `users`, `auditLog`.
- **BLUNT:** this is the most over-built, least real module — 20 security dashboards over an app with no real auth. **Down-scope for v1**: keep Sessions, RBAC, Audit, NIN/identity verification; mark the rest (threats/SOC/encryption/AI) explicitly as "roadmap".
- **Fix tasks:** wire Sessions to the real persisted session (FIX-06); RBAC editor → `db.roleDefinitions`; NIN verification → a (mock then real) verification call that stamps `patient.ninVerified`.
- **API:** `GET /iam/sessions`, `DELETE /iam/sessions/:id`, `POST /iam/nin/verify`, `GET /iam/audit`.

#### MOD-03 — Board (`board`)
- **Status:** 2/5 static. **Owns:** nothing (read-only). **Consumes:** finance, occupancy, mortality, quality KPIs.
- **Fix tasks:** compute every KPI from `db` (admissions, revenue, bed occupancy, length-of-stay, readmission). No literals. Add date-range filter. Read-only by definition — no writes.
- **API:** `GET /analytics/board?from=&to=`.

#### MOD-04 — CMD (`cmd`)
- **Status:** 2.5/5 (reads static sync). **Consumes:** all clinical + ops KPIs, approvals queue. **Owns:** `approvals` (executive sign-offs).
- **Fix tasks:** real approvals inbox (leave escalations, waivers, large refunds, capital requests) reading `db.approvals`; KPI tiles from `db`.
- **API:** `GET /analytics/exec`, `GET /approvals?role=cmd`, `POST /approvals/:id/decision`.

#### MOD-05 — Admin (`admin`)
- **Status:** 2/5 static (overview, revenue, staff, packages, insights, students). **Owns:** `servicePackages`, `serviceCatalog` (price list). **Consumes:** patients, staff, invoices.
- **Fix tasks:** the **service catalog / price list** is foundational — make it the single source of prices that Billing, Lab, Pharmacy, Radiology all read. Build CRUD here. This kills hard-coded prices everywhere.
- **API:** `GET/POST/PUT/DELETE /catalog/services`, `GET /catalog/packages`.

#### MOD-06 — Finance (`finance`)
- **Status:** 2.5/5 (static aggregates). **Owns:** `ledger`, `reconciliations`, `refunds`, `payouts`. **Consumes:** `invoices`, `payments`, `discharges`.
- **Fix tasks:** all revenue/cashflow/department-revenue/staff-revenue derived from `db.payments`+`db.invoices`. Discharge-billing screen reads real discharge bills. Reconciliation matches `payments` against bank refs. Refund approvals flow through `db.approvals`.
- **API:** `GET /finance/revenue`, `GET /finance/cashflow`, `GET /finance/reconciliation`, `POST /finance/refunds`.

#### MOD-07 — HR (`hr`)
- **Status:** 2.5/5 (reads `workflowData`/`hrData`). **Owns:** `staff`, `attendance`, `leaveRequests`, `payroll`, `appraisals`, `training`, `retirements`. **Consumes:** `departments`, `users`.
- **Fix tasks:** staff is a **canonical entity** shared with every clinical module (a doctor in HR = the doctor who signs notes). Unify `staff` ↔ `users`. Leave requests flow to approver via `db.approvals` and reflect in attendance. Payroll computed from attendance + grade.
- **API:** `GET/POST/PUT /hr/staff`, `GET/POST /hr/leave`, `POST /hr/leave/:id/decision`, `GET /hr/payroll`, `GET/POST /hr/attendance`.

#### MOD-08 — IT / Systems (`it`)
- **Status:** 2/5 (reads `hospitalData`). **Owns:** `systemFeatures`, `incidents`, `systemAlerts`, `backups`. **Consumes:** `auditLog`, `syncEvents`.
- **Fix tasks:** system status from real `db` health (queue depth, last sync, failed events). Incident log persists. Tie alerts to real `SyncEvent` failures from MOD-19.
- **API:** `GET /it/health`, `GET/POST /it/incidents`, `GET /it/alerts`.

### 16.B FRONT DOOR & PATIENT ACCESS

#### MOD-09 — MPI / Patient Registration (`records`, `superadmin`) — **STRATEGIC**
- **Status:** 2/5 but **most important front-door module**. **Owns:** `patients` (THE canonical create). **Emits:** `PATIENT_REGISTERED`.
- **Fix tasks:** this is the **only** place patients are created. Implement: new-patient form (validated with zod) → `db.patients.create()` with one `hospitalId` (brand format), NIN/NHIA capture, **duplicate detection** (by NIN/phone/name+DOB), next-of-kin, photo/biometric stubs, e-card. Walk-in & emergency quick-reg. Every other module's "add patient" must redirect here or call the same `db.patients.create`.
- **API:** `POST /patients`, `GET /patients?search=`, `GET /patients/:id`, `POST /patients/:id/merge` (dedupe), `POST /patients/:id/verify-nin`.

#### MOD-10 — Patient Portal & PWA (`patient`)
- **Status:** 2/5 static, 24 screens. **Owns:** `portalMessages`, patient-initiated `appointments`. **Consumes:** the **logged-in patient's** own records (the current bug: it shows a generic patient).
- **Fix tasks:** bind every screen to `useCurrentPatient()` = the authenticated patient. Wallet, invoices, appointments, lab/prescription results, admission status — all "mine". Booking writes a real appointment. Telemedicine/caregivers can stay stubbed but labeled.
- **API:** `GET /me`, `GET /me/appointments`, `GET /me/invoices`, `GET /me/results`, `POST /me/appointments`, `GET /me/wallet`.

#### MOD-11 — Appointment & Scheduling Center (`records`, `superadmin`, `doctor`)
- **Status:** 2/5 static, 23 screens. **Owns:** `appointments`, `clinicSlots`, `queues`. **Consumes:** `patients`, `staff` (providers). **Emits:** `APPOINTMENT_BOOKED`, `VISIT_CREATED`.
- **Fix tasks:** real slot model per provider/clinic; booking from public site + portal + front desk all land here; OTP/reminder/payment-gate as steps that flip appointment state; queue management feeds the Consultation queue.
- **API:** `GET /appointments`, `POST /appointments`, `PATCH /appointments/:id`, `GET /slots?provider=&date=`, `GET /queue`.

#### MOD-12 — Public Website (anonymous)
- **Status:** 3/5 (good marketing) but appointment form dead-ends; advertised departments don't match the neuropsychiatric reality (O&G, Ophthalmology, Orthopaedics, Maternity in `dummyData.departments` — wrong for GFA).
- **Fix tasks:** (a) `AppointmentPage` submit → `POST /public/appointments` → creates a pending appointment + patient lead. (b) Replace the generic general-hospital department list with GFA's real services (Adult Psychiatry, CAP, Addiction, Psychogeriatrics, Psychology, Neurology, etc.). (c) `Doctors`/`Departments`/`News`/`Careers` read from `db` (careers → `db.jobPostings`, applications → `db.applications`).
- **API:** `POST /public/appointments`, `POST /public/contact`, `GET /public/doctors`, `GET /public/services`, `GET /public/news`, `POST /public/careers/apply`.

#### MOD-13 — Patient Dashboard (`patient`)
- Merge conceptually with MOD-10 (Portal). One patient experience, not two. **Fix:** dedupe — pick Portal as canonical, redirect `/dashboard/patient/*` into it or share components.

### 16.C REVENUE CYCLE

#### MOD-14 — Billing Initiation / Cashier (`cashier`, `finance`, `admin`, `cmd`, `superadmin`) — **REFERENCE**
- **Status:** 4/5 (BillingStore). **Owns:** `invoices`, `payments`, `cashierShifts`, billing `auditLog`. **Consumes:** `visits`, `serviceCatalog` (prices), orders from Lab/Pharmacy/Radiology/IPD. **Emits:** `INVOICE_CREATED`, `INVOICE_PAID`, `CONSULTATION_UNLOCKED`.
- **Fix tasks:** migrate onto `database.js` (FIX-04); accept invoice line-items generated by **any** department's orders; unify invoice numbering with Lab (FIX-12); prices come from MOD-05 catalog, not literals.
- **API:** `POST /invoices`, `GET /invoices/:id`, `POST /invoices/:id/payments`, `POST /payments/:id/reverse`, `GET /shifts/current`, `POST /shifts/open|close`.

#### MOD-15 — Billing, Wallet & Revenue Center (`finance`, `superadmin`)
- **Status:** 2.5/5, 21 screens (service/departmental/insurance/psychiatry/split billing, refunds, receipts, POS, analytics). **Owns:** `wallets`, `splitBills`, `insuranceClaims`. **Consumes:** `invoices`, `payments`.
- **Fix tasks:** wallet engine real (top-up/deduct against `db.wallets`); insurance/NHIA/HMO billing creates `claims` tied to invoices; analytics from `db`.
- **API:** `GET /wallets/:patientId`, `POST /wallets/:id/topup`, `POST /claims`, `GET /revenue/analytics`.

### 16.D CLINICAL CORE

#### MOD-16 — Doctor Clinical Center (`doctor`, `cmd`) — **best-wired clinician, 33 screens**
- **Status:** 3/5. **Owns:** `encounters`, `clinicalNotes`, `diagnoses`, `orders` (lab/drug/imaging), `referrals`, `certificates`, `wardRounds`. **Consumes:** `patients`, `visits`, results from ancillaries. **Emits:** `CONSULTATION_COMPLETED`, `ORDER_CREATED`, `REFERRAL_CREATED`, `PRESCRIPTION_CREATED`.
- **Fix tasks:** ordering creates real `db.orders` that **auto-bill** (MOD-14) and **appear in** Lab/Pharmacy/Radiology worklists; notes write to `encounters`; referrals create `db.referrals` consumed by specialty centers; diagnosis uses ICD-10/DSM-5 codes (needed for EMR sync + NHIS).
- **Role nuance:** split `doctor` into `consultant` / `medical_officer` / `resident` for sign-off rights (controlled drugs, ECT, discharge).
- **API:** `POST /encounters`, `POST /orders`, `POST /prescriptions`, `POST /referrals`, `GET /patients/:id/timeline`.

#### MOD-17 — Consultation Module (`doctor`) — wired to BillingStore
- **Status:** 3.5/5. **Owns:** `consultationSessions`. **Consumes:** `visits` (gate), `patientRecords`, `drugStock`, `labRequests`. **Emits:** `CONSULTATION_COMPLETED`.
- **Fix tasks:** keep the payment-gate (the crown jewel); migrate reads to `db`; on "complete", write encounter + emit sync event; orders raised here route to ancillaries.
- **API:** `GET /consultation/queue`, `GET /consultation/visit/:code`, `POST /consultation/:code/complete`.

#### MOD-18 — Unified EMR Core (`doctor`, `nurse`, `psychology`, all clinical, 24 screens)
- **Status:** 2/5 static. **Owns:** the **read-model** of the patient chart (timeline aggregating encounters, labs, drugs, imaging, notes, consents, care plans). **Consumes:** everything clinical.
- **Fix tasks:** this is the **patient chart aggregator** — it must be a *view* over `db`, not its own data. Build `db.patientChart(patientId)` that joins encounters + orders + results + admissions + notes into one timeline. Every clinical module writes; EMR Core reads.
- **API:** `GET /patients/:id/chart`, `POST /patients/:id/consents`, `POST /patients/:id/care-plans`.

#### MOD-19 — EMR Background Sync (`it`, `superadmin`)
- **Status:** 2/5 simulated. **Owns:** `syncEvents`, `idMappings`, `deadLetterQueue`. **Consumes:** events from every module.
- **Fix tasks:** replace static `emrSyncData` with a **real event log** populated by `db.emit()`. Every significant write enqueues a `SyncEvent`; a mock worker advances PENDING→SYNCED (and randomly RETRY/FAIL for realism, or just succeed). External targets (NHIS/NIBSS/NPHCDA) stay simulated but **labeled**. This is where the backend later attaches real integrations.
- **API:** `GET /sync/events`, `POST /sync/events/:id/retry`, `GET /sync/health`.

#### MOD-20 — Nursing Center (`nurse`, 104 KB, 22 screens)
- **Status:** 2/5 static. **Owns:** `vitals`, `medicationAdmin` (MAR), `nursingNotes`, `observations`, `carePlans`, `handovers`, `shifts`. **Consumes:** `admissions`, `prescriptions` (to administer), `patients`. **Emits:** `VITALS_RECORDED`, `DRUG_ADMINISTERED`.
- **Fix tasks:** MAR pulls real prescriptions from Pharmacy/Doctor; vitals write to patient chart; handover reads live ward census; ICU observation shares with MOD-36.
- **API:** `POST /patients/:id/vitals`, `GET /mar/:admissionId`, `POST /mar/:id/administer`, `POST /handover`.

### 16.E ANCILLARY / DIAGNOSTICS

#### MOD-21 — Laboratory (`lab`, 36 screens) — wired via LabFlowStore
- **Status:** 3.5/5. **Owns:** `labOrders`, `samples`, `labResults`, `labCatalog`. **Consumes:** `orders` from doctors, prices from catalog. **Emits:** `LAB_RESULT_READY`.
- **Fix tasks:** **connect to Billing** — `sendToBilling` must `db.invoices` create an invoice line (currently fake); unify numbering (FIX-12); results write to patient chart + emit sync; doctor-originated orders appear automatically.
- **API:** `GET /lab/orders`, `POST /lab/orders/:id/sample`, `POST /lab/orders/:id/result`, `POST /lab/orders/:id/validate`, `GET /lab/catalog`.

#### MOD-22 — Pharmacy (`pharmacist`, 33 screens)
- **Status:** 2.5/5. **Owns:** `drugCatalog`, `stock`, `stockMovements`, `dispenses`, `controlledRegister`, `procurement`. **Consumes:** `prescriptions` from doctors. **Emits:** `DRUG_DISPENSED`, `STOCK_LOW`.
- **Fix tasks:** dispensing queue reads real `db.prescriptions`; dispense decrements `stock` and emits; controlled/psychotropic register (critical for psychiatry) audited; procurement creates POs; billing line on dispense; interaction checks against patient meds.
- **API:** `GET /pharmacy/queue`, `POST /pharmacy/:rxId/dispense`, `GET /pharmacy/stock`, `POST /pharmacy/procurement`, `GET /pharmacy/controlled`.

#### MOD-23 — Radiology / Imaging / PACS (`radiology`, 21 screens)
- **Status:** 2.5/5. **Owns:** `imagingOrders`, `imagingReports`, EEG/ECG reports, `pacsStudies`. **Consumes:** `orders`. **Emits:** `IMAGING_RESULT_READY`.
- **Fix tasks:** mirror Lab's lifecycle (order→bill→schedule→acquire→report→validate→chart). EEG/ECG are neuro-critical here — keep. PACS viewer can stay a stub but wired to study metadata.
- **API:** `GET /imaging/orders`, `POST /imaging/:id/report`, `POST /imaging/:id/validate`.

### 16.F INPATIENT

#### MOD-24/25 — IPD + Admission/Ward/Bed (`nurse`, `doctor`, `records`, 11+18 screens)
- **Status:** 2.5/5. **Owns:** `admissions`, `wards`, `beds`, `bedAssignments`, `transfers`, `trialLeave`, `dama`. **Consumes:** `patients`, `referrals`. **Emits:** `ADMISSION_CREATED`, `BED_TRANSFER`, `DISCHARGE_REQUESTED`.
- **BLUNT:** IPD (`IpdModuleNew`) and Admission/Ward (`AdmissionWardCenter`) **overlap massively** — two modules for the same job. Pick one as canonical bed/admission authority; make the other a view. Don't ship both as separate writers.
- **Fix tasks:** one bed board (capacity-enforced, no double-booking); admission from referral/A&E; continuous daily billing accrues to invoice; trial-leave & DAMA are psychiatric-specific — keep and wire to legal status.
- **API:** `POST /admissions`, `GET /beds`, `POST /admissions/:id/transfer`, `POST /admissions/:id/trial-leave`, `POST /admissions/:id/discharge`.

#### MOD-26 — Final Billing & Discharge (`records`, `finance`, `doctor`, 12 screens)
- **Status:** 2.5/5. **Owns:** `dischargeSummaries`, `finalBills`, `clearances`. **Consumes:** `admissions`, all charges. **Emits:** `DISCHARGE_COMPLETED`, `BED_RELEASED`.
- **Fix tasks:** aggregate ALL charges across the stay (ward, drugs, labs, imaging, procedures) into one final bill; finance clearance gate; bed release frees the bed in MOD-24; discharge summary writes to chart + emits sync.
- **API:** `GET /discharge/:admissionId/bill`, `POST /discharge/:id/clear`, `POST /discharge/:id/complete`.

#### MOD-27 — Records / HIM (`records`, 10 screens + `/hms/*`)
- **Status:** 2.5/5 (uses auth). **Owns:** statutory `documents`, `triage`, master `patientDirectory`. **Consumes:** patients, visits, admissions. **Emits:** statutory reports.
- **Fix tasks:** triage queue feeds OPD/A&E; document management attaches to patients; daily/statutory reports (NHMIS/DHIS2) computed from `db`.
- **API:** `GET /records/triage`, `GET /records/reports/nhmis`, `POST /records/documents`.

### 16.G NEUROPSYCHIATRIC SPECIALTY CENTERS (MOD-28..MOD-36)

> These nine centers are architecturally **identical static shells**. They share one fix template, applied per center. Do them as a batch with a shared pattern, not nine snowflakes.

**Shared template (apply to Psychology, CAP, Addiction, Psychogeriatrics, Physiotherapy, Speech, Nutrition, Social Work, ICU):**
- **Owns:** `{dept}Assessments`, `{dept}TreatmentPlans`, `{dept}Sessions`/`{dept}Notes`, `{dept}Outcomes`. **Consumes:** `patients`, `referrals` (incoming from doctors/other depts). **Emits:** `REFERRAL_ACCEPTED`, `SESSION_COMPLETED`, `{DEPT}_NOTE_ADDED`.
- **Fix tasks (per center):**
  1. Delete inline data; bind to `useDb()` and `useCurrentPatient()`.
  2. **Inbound referrals:** show `db.referrals.where(targetDept = me)` so a doctor's/another dept's referral actually arrives. **This is the acceptance test for "departments talk to each other."**
  3. Assessments/sessions write to the patient chart (visible in EMR Core MOD-18).
  4. Billing: chargeable sessions create invoice lines (MOD-14).
  5. Outbound referrals to other centers via `db.referrals.create`.
  6. Mark the boilerplate tabs (Config/AI/Offline/Mobile/Research) as roadmap, consistently.
- **API (parameterized by `:dept`):** `GET /referrals?dept=:dept`, `POST /referrals/:id/accept`, `POST /:dept/assessments`, `POST /:dept/sessions`, `GET /:dept/caseload`.

Per-center specifics worth preserving:
- **MOD-28 Psychology:** IQ/personality assessments, SATSAT program, outcome monitoring → keep as structured assessment instruments (scored, charted).
- **MOD-29 CAP (Child & Adolescent):** child registration, development tracking, autism/ADHD, **safeguarding** (legally sensitive — audit + restricted access), school liaison, MDT.
- **MOD-30 Addiction:** ASI, detox management, drug screening (links to Lab), relapse/aftercare, community reintegration.
- **MOD-31 Psychogeriatrics:** memory clinic, cognitive/functional assessment, frailty/falls, **elder-abuse screening** (restricted), caregiver support.
- **MOD-32 Physiotherapy:** referral→assessment→treatment plan→sessions; mobility/falls; neuro-rehab.
- **MOD-33 Speech Therapy:** dysphagia (clinical-risk — links to Nutrition feeding), language/voice/fluency, teletherapy, offline sync.
- **MOD-34 Nutrition & Dietetics:** anthropometrics, malnutrition screening, therapeutic/enteral feeding, **catering/kitchen** (ward meal orders ← links to inpatient), allergy register (clinical-safety, links to chart).
- **MOD-35 Social Work:** family/home assessment, home visits, **trial leave / DAMA** (overlaps IPD — share the entity, don't duplicate), welfare, legal liaison, vulnerable-patient register.
- **MOD-36 ICU / Critical Care:** admission, ventilator, code-blue, charts/observation (shares with Nursing MOD-20), mortality, handover. Highest-acuity — vitals/observation must be real-time-ish over `db`.

---

## 17. FRONTEND REVAMP SPEC — make it backend-ready (hand-off to a backend agent)

> Goal: refactor the frontend so that **swapping `database.js` (local) for a real HTTP API is a one-file change**. The backend agent then implements the API contract that the frontend already expects. This is the single most valuable structural change after Phase 1.

### 17.1 The core principle: program against an interface, not an implementation
Today pages import data directly (`import { patients } from '@/data/...'`). That is unswappable. Revamp to a **repository interface** that has two implementations: `LocalRepo` (over `database.js`) now, `HttpRepo` (over the backend) later. Pages never know which is active.

```ts
// src/data-access/repository.ts  — the contract the backend MUST satisfy
export interface Repository {
  patients: Resource<Patient, PatientCreate, PatientUpdate>;
  appointments: Resource<Appointment, ...>;
  invoices: InvoiceResource;          // + capture(), reverse()
  orders: OrderResource;              // lab/drug/imaging
  encounters: Resource<Encounter, ...>;
  admissions: AdmissionResource;      // + transfer(), discharge()
  referrals: ReferralResource;        // + accept()
  // ...one per entity in §17.3
}

// Generic CRUD shape every resource implements
export interface Resource<T, C, U> {
  list(query?: Query): Promise<Paginated<T>>;
  get(id: string): Promise<T>;
  create(input: C): Promise<T>;
  update(id: string, patch: U): Promise<T>;
  remove(id: string): Promise<void>;
}
```

```ts
// src/data-access/local.ts   — wraps database.js (use NOW)
export const localRepo: Repository = { /* maps to db.* */ };

// src/data-access/http.ts    — wraps fetch (use LATER, backend agent fills the URLs)
export const httpRepo: Repository = { /* fetch(`${API}/patients`...) */ };

// src/data-access/index.ts   — the ONLY switch
export const repo = import.meta.env.VITE_USE_API === 'true' ? httpRepo : localRepo;
```

**Definition of done:** every page imports `repo` (via TanStack Query hooks), never `@/data/*` and never `db` directly. Flip `VITE_USE_API` and the app runs on the backend with zero page changes.

### 17.2 Use TanStack Query for real (it's already installed and idle)
Wrap the repo in query hooks so caching, loading, and refetch are uniform and backend-ready:

```ts
// src/data-access/hooks.ts
export const usePatients = (q?: Query) =>
  useQuery({ queryKey: ['patients', q], queryFn: () => repo.patients.list(q) });
export const useCreatePatient = () =>
  useMutation({ mutationFn: repo.patients.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }) });
```
This makes the eventual backend swap free: `LocalRepo` resolves instantly; `HttpRepo` hits the network; the component code is identical.

### 17.3 Define the entity/DTO catalog (the database schema, frontend-first)
Create `src/data-access/types.ts` as the **authoritative schema** the backend will mirror 1:1. Minimum entities (each with `id`, `createdAt`, `updatedAt`, `createdBy`):

```
User(id,email,name,role,staffId?)          Staff(id,userId,name,cadre,departmentId,grade,status)
Department(id,name,kind)                    Patient(id,hospitalId,nin,nhia,name,dob,sex,phone,address,bloodGroup,allergies[],nextOfKin,flags[])
Appointment(id,patientId,providerId,deptId,datetime,channel,status)
Visit(id,patientId,type,deptId,invoiceId?,consultationUnlocked,status)
Encounter(id,patientId,visitId,providerId,soap,diagnoses[icd10],createdAt)
Order(id,patientId,visitId,kind:lab|drug|imaging,items[],status,invoiceLineId?)
LabResult(id,orderId,analyte,value,unit,flag,validatedBy?)
Prescription(id,patientId,encounterId,drugs[],status)  Dispense(id,prescriptionId,items[],by)
ImagingReport(id,orderId,modality,body,validatedBy?)
Invoice(id,patientId,visitId?,lines[{desc,qty,unitPrice,source}],total,paid,balance,status)
Payment(id,invoiceId,amount,channel,ref,cashier,reversedBy?)
Wallet(id,patientId,balance,txns[])        InsuranceClaim(id,invoiceId,scheme:NHIA|HMO,authCode,status)
Admission(id,patientId,wardId,bedId,admittingDoctorId,legalStatus,status)
Ward(id,name,kind,beds[])                  Bed(id,wardId,label,status)
Transfer(id,admissionId,fromBedId,toBedId,reason,by)
Referral(id,patientId,fromDeptId,toDeptId,reason,status,acceptedBy?)
Assessment(id,patientId,dept,instrument,scores,by)   TreatmentPlan(id,patientId,dept,goals[],by)
Vitals(id,patientId,admissionId?,temp,bp,pulse,spo2,by)
MedicationAdmin(id,admissionId,prescriptionId,given,by)
DischargeSummary(id,admissionId,diagnosis,plan,by)
ServiceCatalogItem(id,name,category,price,deptId)    JobPosting / Application / NewsArticle (public)
LeaveRequest / AttendanceRecord / PayrollRun (HR)    Approval(id,kind,payload,status,decidedBy?)
AuditLog(id,actor,role,action,entity,entityId,at)    SyncEvent(id,type,module,target,status,retryCount,...)
RoleDefinition(id,role,permissions[])                Session(id,userId,startedAt,ip,device)
```
> This list **is** the database schema. The backend agent generates tables/migrations from it. The frontend already produces and consumes exactly these shapes via `database.js`.

### 17.4 Other backend-readiness changes
- **Env config:** add `.env` with `VITE_API_BASE_URL`, `VITE_USE_API`. Create `src/lib/env.ts` to read them. (Today: none exist.)
- **Auth tokens:** `HttpRepo` must send `Authorization: Bearer <token>`; `AuthContext` stores the token. Design login response as `{ user, token }` now (even if `LocalRepo` returns a fake token), so nothing changes later.
- **IDs:** stop generating IDs with `Date.now()` in the UI. The backend owns ID generation; `LocalRepo` mimics it. Treat IDs as server-assigned (return them from `create`).
- **Validation:** define **zod schemas** per entity in `types.ts`; reuse them for form validation now and as the backend's request DTOs later (zod → JSON Schema/OpenAPI is trivial).
- **Errors:** `HttpRepo` normalizes `{status, code, message}`; `LocalRepo` throws the same shape, so error UI is written once.
- **Pagination/filter contract:** fix `Query = { page, pageSize, search, sort, filters }` and `Paginated<T> = { items, total, page }` now, so list screens are paginate-ready.
- **OpenAPI:** generate `openapi.yaml` from the zod types and ship it with the repo — that is literally the backend agent's build spec.

### 17.5 Order of the revamp (do alongside Phases 1–2)
1. `types.ts` (entities + zod) — derived from `database.js`.
2. `repository.ts` (interface).
3. `local.ts` (wrap `database.js`).
4. `hooks.ts` (TanStack Query over `repo`).
5. Migrate pages module-by-module to the hooks (same order as §13 phases).
6. `http.ts` + `.env` (skeleton now; backend agent fills it).
7. Emit `openapi.yaml`.

---

## 18. BACKEND STACK RECOMMENDATION (genuine Node vs Java vs C#)

> You asked for a real opinion, not a fence-sit. Here it is, with the reasoning, for **this** project: a TypeScript/React HMS for a Nigerian federal neuropsychiatric hospital, needing NHIS/NIBSS integration, FHIR/HL7 interoperability, audit/compliance, and a frontend whose entire data model is already written in TypeScript.

### 18.1 The three options, honestly

| Criterion | **Node (NestJS + Prisma + PostgreSQL)** | **Java (Spring Boot + JPA/Hibernate + PostgreSQL)** | **C# (.NET 8 + EF Core + PostgreSQL)** |
|---|---|---|---|
| Reuse of existing TS model (§17.3) | **Best** — share types/zod verbatim, near-zero translation | Manual re-modeling in Java | Manual re-modeling in C# |
| Speed to first end-to-end | **Fastest** | Slowest (ceremony, config) | Fast |
| Type safety / correctness | Strong (TS) | **Strongest** (mature, strict) | **Strongest** |
| Healthcare/FHIR libraries | Good (`@types/fhir`, smart-on-fhir) | **Best-in-class** (HAPI FHIR) | Very good (Firely SDK) |
| Enterprise/gov procurement fit | OK | **Best** (gov/enterprise default) | **Best** (gov/Microsoft shops) |
| Nigerian hiring pool | **Largest** (JS everywhere) | Large | Smaller |
| Long-term maintainability at scale | Good with discipline | **Excellent** | **Excellent** |
| Ops/hosting cost & simplicity | **Lowest** (one language, light runtime) | Heavier (JVM) | Light (.NET is now cross-platform) |
| Performance under load | Very good | Excellent | Excellent |
| Risk | Discipline-dependent (easy to make a mess) | Over-engineering risk, slower delivery | Smaller local talent pool |

### 18.2 The recommendation — **primary: Node + NestJS + Prisma + PostgreSQL**

**Pick Node/NestJS.** Reasons, ranked:
1. **The entire data model already exists in TypeScript** (§17.3). With NestJS + Prisma you reuse the exact entity shapes and zod validators — the backend becomes a near-mechanical port of `database.js`, not a re-design. This single factor probably halves time-to-working-system.
2. **NestJS gives you the enterprise structure** (modules, DI, guards, interceptors, DTO validation via class-validator/zod, OpenAPI generation) that answers the usual "Node isn't disciplined enough" objection. It maps cleanly onto your per-module breakdown in §16 — one Nest module per HMS module.
3. **One language across the stack** = smaller team, shared types (via a shared package), faster onboarding, easiest hiring in Nigeria.
4. **Prisma + PostgreSQL** gives you typed queries, migrations, and a schema that mirrors §17.3 line-for-line. PostgreSQL is the right DB (relational integrity for clinical/financial data, JSONB for flexible clinical notes, mature, free).
5. **FHIR interoperability** is achievable in Node; if/when NHIS or national EMR requires FHIR, add a FHIR facade — you don't need HAPI for v1.

**Concrete v1 stack:**
```
Runtime:     Node 20 LTS + TypeScript
Framework:   NestJS (REST; one module per §16 HMS module)
ORM:         Prisma  (schema generated from §17.3 entities)
DB:          PostgreSQL 16  (+ Redis for sessions/queues/cache)
Auth:        JWT access + refresh, bcrypt/argon2, RBAC guards reading RoleDefinition
Validation:  zod (shared with frontend) or class-validator DTOs
Async/sync:  BullMQ (Redis) for the EMR SyncEvent worker (MOD-19) + NHIS/NIBSS retries
Docs:        @nestjs/swagger → OpenAPI (matches the frontend's openapi.yaml)
Files:       S3-compatible storage (MinIO on-prem) for scans/photos/PACS metadata
Hosting:     Docker; on-prem or NgGov cloud (data-residency matters for patient data)
```

### 18.3 When to choose otherwise (don't ignore this)
- **Choose Java + Spring Boot + HAPI FHIR** if: the hospital/Federal Ministry **mandates** Java for procurement/maintenance, OR FHIR/HL7 interoperability with the national health stack is a **day-1 hard requirement**. HAPI FHIR is the most complete FHIR server anywhere and that can outweigh the TypeScript reuse advantage. Expect slower delivery.
- **Choose C# + .NET 8 + EF Core + Firely** if: the institution is a **Microsoft/Windows shop** (AD/Entra, SQL Server, existing .NET staff). .NET 8 is cross-platform, fast, and excellent; the only real downside here is a smaller local hiring pool and the loss of TS model reuse.
- **Do not** pick PHP/Laravel, Python/Django, or raw Express-without-structure for this. Django is fine generically but loses the TS-reuse edge; raw Express invites the mess NestJS prevents.

### 18.4 Non-negotiables regardless of language
- **PostgreSQL** (not MongoDB) — clinical + financial data is relational and needs constraints/transactions. Use JSONB for flexible note bodies.
- **Audit everything** — append-only `AuditLog`; patient-data access is legally sensitive (esp. CAP safeguarding, addiction, forensic).
- **RBAC + record-level scoping** server-side — never trust the frontend guards (which are UX only).
- **Data residency & encryption** — patient data encrypted at rest and in transit; host in-country.
- **Migrations from §17.3** — the schema is already designed; generate, don't reinvent.
- **The backend implements the §16 API contract exactly** so the frontend's `HttpRepo` works by flipping `VITE_USE_API=true`.

### 18.5 Hand-off bundle for the backend agent
Give the backend agent exactly these, produced during Phases 1–2 + §17:
1. `src/data-access/types.ts` (entities + zod) — **the schema**.
2. `src/data-access/repository.ts` — **the API surface**.
3. `openapi.yaml` — generated from the above.
4. `database.js` seed data — **the fixtures/migration seed**.
5. This document §16 (per-module endpoints) + §17 (contract).
With that, the backend is a deterministic build, not a guessing game.

---

## 19. Revised phase ordering (incorporating Part II)

1. **Phase 0** — FIX-00, FIX-0A (baseline + brand).
2. **Phase 1** — `database.js` keystone (FIX-01→04, 24) **+ §17.1–17.3 repository/types in parallel**.
3. **Phase 2** — auth, session, RBAC (FIX-05, 06, 03B) **+ dynamic RBAC from `RoleDefinition` (MOD-01)**.
4. **Phase 3** — front door: MOD-09 (MPI), MOD-11 (Scheduling), MOD-12 (public appointment), MOD-13/10 (portal).
5. **Phase 4** — clinical loop: MOD-16/17 (doctor/consult) → MOD-21/22/23 (lab/pharmacy/radiology) → MOD-14/15 (billing) → MOD-20 (nursing).
6. **Phase 5** — MOD-18 (EMR chart) + MOD-19 (real sync events).
7. **Phase 6** — inpatient MOD-24/25/26/27, then the 9 specialty centers MOD-28..36 (batch template).
8. **Phase 7** — governance/exec truth MOD-03..08, missing-department decisions (§15.6), demo-tab labeling, README.
9. **Phase 8 (handoff)** — emit `openapi.yaml`, finalize `HttpRepo`, hand the §18.5 bundle to the backend agent; build the Node/NestJS backend; flip `VITE_USE_API=true`.

---

## 20. Final blunt summary

- **Coverage:** Part II now treats **all 26 user types** and **all 30 existing department modules** individually, and **names the missing ones** (§15.6) instead of pretending the set is complete.
- **The build is a façade with two real rooms** (Billing+Consult, Lab). Everything else is set-dressing until Phase 1 gives it a floor (`database.js`) and Phase 2 gives it locks (RBAC).
- **The frontend is not backend-ready today** (no repo layer, no env, no API client, TanStack Query idle, zod idle). §17 fixes that and turns the whole app into a precise spec for the backend.
- **Backend: build it in Node + NestJS + Prisma + PostgreSQL** because your data model is already TypeScript — unless gov mandate forces Java, or you're a Microsoft shop (then C#).
- **Do not add a single new feature/route until Phase 1 + Phase 2 are done.** The system already has 678 routes and almost no spine. More breadth now is negligence; depth is the only honest next move.

*End of audit narrative. Part III below is the paste-ready build manual. Start at Phase 0 → build `database.js` (Phase 1) and the repository layer (§17) together → lock it down (Phase 2) → wire modules (Phases 3–7) → hand the contract to the backend agent (Phase 8). The single source of truth and the repository interface are the two dependencies that unblock literally everything else.*

---

# PART III — Revamp Implementation Guide (paste-ready, for the executing AI agent)

> **This is the build manual.** Parts I–II say *what* and *why*. Part III says *exactly how*, with paste-ready code. Follow it top to bottom. Every code block is written to match the **existing** APIs (`BillingStore`, `LabFlowStore`, `AuthContext`, `RequireRole`) so consuming pages keep working.
>
> **Language choice:** the owner asked for `database.js`. We implement it as **`src/db/database.ts`** (TypeScript) for type-safety and to double as the backend schema. If you truly need a `.js`, strip the types — but keep `.ts`; it is the single highest-value artifact in the project.

## III.0 — Agent operating rules (read once, obey always)

1. **Do not touch visual design.** No edits to `src/components/ui/*`, `DashboardLayout`, Tailwind tokens, colors, fonts, spacing.
2. **One concern per commit.** Commit message = step ID (e.g. `STEP-04: database engine + seed`).
3. **Build must stay green.** Run `npm run build` after every step. If red, fix before moving on.
4. **Never break a public API.** When migrating `BillingStore`/`LabFlowStore`, keep the **exact same exported function names and signatures**. Pages must not change in those steps.
5. **No narration comments.** Comment intent/constraints/cross-module contracts only.
6. **Refresh test after every wiring step:** do the action → hit F5 → the action's result must still be there.
7. **Work in this order.** Steps depend on earlier steps. Do not skip.

Target folder structure you will create:
```
src/
  db/
    database.ts          # the single source of truth (engine + seed)
    persistence.ts       # localStorage hydrate/save
    ids.ts               # server-style id generation
    events.ts            # typed event bus
    seed.ts              # initial data (ported from src/data/*)
  data-access/
    types.ts             # entities + zod schemas (== backend schema)
    repository.ts        # the interface the backend must satisfy
    local.ts             # Repository impl over db (use NOW)
    http.ts              # Repository impl over fetch (backend agent fills)
    index.ts             # picks local vs http via env
    hooks.ts             # TanStack Query hooks over `repo`
  contexts/
    DatabaseProvider.tsx # re-render on db change
  lib/
    brand.ts             # hospital identity constants
    roles.ts             # single guessRole + role→route + permissions
    env.ts               # typed env access
```

---

## STEP 0 — Baseline & env

**0.1** Confirm green baseline:
```bash
npm install
npm run build
npm run lint
```
Fix only build-breaking errors now.

**0.2** Create env files (none exist today).

`.env`:
```
VITE_USE_API=false
VITE_API_BASE_URL=http://localhost:4000
```
`.env.example` (commit this; gitignore `.env` if it holds secrets later):
```
VITE_USE_API=false
VITE_API_BASE_URL=http://localhost:4000
```
`src/lib/env.ts`:
```ts
// Typed, central access to Vite env. Never read import.meta.env elsewhere.
export const env = {
  useApi: import.meta.env.VITE_USE_API === 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
} as const;
```

**Commit:** `STEP-00: env config + typed env access`.

---

## STEP 1 — Brand & ID constants

`src/lib/brand.ts`:
```ts
// Canonical hospital identity. All IDs/codes/labels come from here so the data
// story is consistent (kills the OOUTH/"GFA HMS "/GFA HMS-12345 leftovers).
export const HOSPITAL_NAME = 'GFA Demo Hospital';
export const HOSPITAL_SHORT = 'GFA HMS';
export const HOSPITAL_CODE = 'GFA';

// Hospital number: GFA/HMS/2026/000145  (one format, zero-padded to 6)
export const hospitalId = (seq: number, year = new Date().getFullYear()) =>
  `${HOSPITAL_CODE}/HMS/${year}/${String(seq).padStart(6, '0')}`;

export const bookingCode = (seq: number) => `GFA-APPT-${String(seq).padStart(5, '0')}`;
export const invoiceNo  = (seq: number) => `INV-${String(seq).padStart(6, '0')}`;
export const receiptNo  = (seq: number) => `RCP-${String(seq).padStart(6, '0')}`;
export const sampleNo   = (seq: number) => `SMP-${String(seq).padStart(6, '0')}`;
```
**Commit:** `STEP-01: brand + id format helpers`.

---

## STEP 2 — Entity & DTO catalog (`types.ts`) — this IS the database schema

Define every entity once, with a zod schema (reused for form validation now and as backend DTOs later). Start with the spine; add the rest by the same pattern.

`src/data-access/types.ts`:
```ts
import { z } from 'zod';

// ---- shared primitives ----
export const Id = z.string();
export const Timestamps = z.object({
  id: Id,
  createdAt: z.string(),       // ISO
  updatedAt: z.string(),
  createdBy: z.string().optional(),
});
export type WithMeta<T> = T & z.infer<typeof Timestamps>;

export const Query = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(50),
  search: z.string().optional(),
  sort: z.string().optional(),
  filters: z.record(z.any()).optional(),
});
export type Query = z.infer<typeof Query>;
export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number; }

// ---- enums (mirror existing union types) ----
export const PaymentStatus = z.enum(['UNPAID','PENDING','PAID','FAILED','PARTIAL']);
export const PaymentChannel = z.enum([
  'POS Card','Cash','Bank Transfer','SMS Pay Link','USSD','Online Card','Wallet','NHIA','HMO',
]);
export const Role = z.enum([
  'superadmin','admin','staff','student','patient','cmd','board','finance','hr','doctor','it',
  'nurse','pharmacist','lab','radiology','psychology','cap','addiction','psychogeriatrics',
  'physiotherapy','speech','nutrition','socialwork','icu','cashier','records',
]);
export type Role = z.infer<typeof Role>;

// ---- Patient (the canonical record — replaces 5 incompatible shapes) ----
export const PatientCreate = z.object({
  name: z.string().min(2),
  nin: z.string().optional(),
  nhia: z.string().optional(),
  phone: z.string().min(7),
  sex: z.enum(['Male','Female']),
  dob: z.string().optional(),
  age: z.number().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  insurance: z.enum(['NHIS','Private','HMO','None']).default('None'),
  nextOfKin: z.object({ name: z.string(), phone: z.string(), relationship: z.string() }).optional(),
  source: z.enum(['Walk-in','Online','Referral','Emergency']).default('Walk-in'),
});
export type PatientCreate = z.infer<typeof PatientCreate>;
export interface Patient extends z.infer<typeof PatientCreate> {
  id: string; hospitalId: string; ninVerified?: boolean;
  flags?: string[]; createdAt: string; updatedAt: string;
}

// ---- Visit / Invoice / Payment (match billingData.ts EXACTLY so BillingStore still works) ----
export interface Visit {
  id: string; visitCode: string; patientId: string; patientName: string; hospitalId: string;
  phone: string; department: string;
  type: 'OPD'|'Surgery'|'Maternity'|'Pediatric'|'Emergency';
  triagePriority: 'Routine'|'Urgent'|'Emergency';
  attendingDoctor: string; consultationFee: number; invoiceId: string;
  paymentStatus: z.infer<typeof PaymentStatus>; consultationUnlocked: boolean;
  emergencyOverride?: { doctor: string; reason: string; timestamp: string; reviewed: boolean };
  createdAt: string;
}
export interface InvoiceLine { desc: string; qty: number; unitPrice: number; source: string; }
export interface Invoice {
  id: string; invoiceId: string; visitCode: string; patientId: string; patientName: string;
  hospitalId: string; phone: string; department: string;
  lines?: InvoiceLine[];                                   // NEW: itemized; total === amount
  amount: number; amountPaid: number; balance: number;
  status: z.infer<typeof PaymentStatus>;
  channelsActive: z.infer<typeof PaymentChannel>[]; channelUsed?: z.infer<typeof PaymentChannel>;
  ussdCode: string; smsSent: boolean; virtualAccount: string; createdAt: string;
}
export interface Payment {
  id: string; ref: string; invoiceId: string; patientName: string;
  channel: z.infer<typeof PaymentChannel>; amount: number; status: z.infer<typeof PaymentStatus>;
  posTerminal?: string; bankRef?: string; cashier?: string; timestamp: string; matched: boolean;
}

// ---- Cross-module glue ----
export interface Order {
  id: string; patientId: string; visitId?: string; kind: 'lab'|'drug'|'imaging';
  items: { code: string; name: string; price: number }[];
  status: string; invoiceId?: string; orderedBy: string; createdAt: string; updatedAt: string;
}
export interface Referral {
  id: string; patientId: string; fromDept: string; toDept: string; reason: string;
  status: 'PENDING'|'ACCEPTED'|'COMPLETED'|'REJECTED'; acceptedBy?: string;
  createdAt: string; updatedAt: string;
}
export interface AuditEntry {
  id: string; actor: string; role: string; action: string;
  entity?: string; entityId?: string; at: string;
}
export interface SyncEvent {
  id: string; type: string; module: string; target: 'EMR'|'NHIS'|'NIBSS'|'NPHCDA';
  status: 'PENDING'|'IN_FLIGHT'|'SYNCED'|'RETRY'|'FAILED'|'DEAD_LETTER';
  retryCount: number; maxRetries: number; hmsRef: string; patientId?: string; createdAt: string;
}

// Add the rest from audit §17.3 by the same pattern:
// Staff, Department, Appointment, Encounter, Prescription, Dispense, ImagingReport, LabResult,
// Admission, Ward, Bed, Transfer, Assessment, TreatmentPlan, Vitals, MedicationAdmin,
// DischargeSummary, ServiceCatalogItem, Wallet, InsuranceClaim, LeaveRequest, AttendanceRecord,
// Approval, RoleDefinition, Session, JobPosting, Application, NewsArticle.
```
> Keeping `Visit`/`Invoice`/`Payment` field-identical to `billingData.ts` is deliberate: STEP-08 swaps the store's storage without changing its public API.

**Commit:** `STEP-02: entity + zod schema catalog`.

---

## STEP 3 — IDs, persistence, event bus

`src/db/ids.ts`:
```ts
// Monotonic, prefix-based ids. The backend will own ids later; LocalRepo mimics that
// by returning ids from create(). Never call these from components.
const counters: Record<string, number> = {};
export const nextId = (prefix: string, start = 1000) => {
  counters[prefix] = (counters[prefix] ?? start) + 1;
  return `${prefix}-${counters[prefix]}`;
};
export const seedCounter = (prefix: string, value: number) => {
  counters[prefix] = Math.max(counters[prefix] ?? 0, value);
};
export const nowIso = () => new Date().toISOString();
export const nowHuman = () => new Date().toISOString().replace('T', ' ').slice(0, 16);
```

`src/db/events.ts`:
```ts
// Tiny typed event bus. Writes emit; modules subscribe to react cross-department.
export type DbEvent =
  | 'CHANGED'                 // generic: any collection changed (drives React re-render)
  | 'PATIENT_REGISTERED' | 'APPOINTMENT_BOOKED' | 'VISIT_CREATED'
  | 'INVOICE_CREATED' | 'INVOICE_PAID' | 'CONSULTATION_UNLOCKED'
  | 'ORDER_CREATED' | 'LAB_RESULT_READY' | 'DRUG_DISPENSED' | 'IMAGING_RESULT_READY'
  | 'REFERRAL_CREATED' | 'REFERRAL_ACCEPTED'
  | 'ADMISSION_CREATED' | 'BED_TRANSFER' | 'DISCHARGE_COMPLETED';

type Handler = (payload?: any) => void;
const handlers: Record<string, Set<Handler>> = {};
export const on = (e: DbEvent, h: Handler) => {
  (handlers[e] ??= new Set()).add(h);
  return () => handlers[e]?.delete(h);
};
export const emit = (e: DbEvent, payload?: any) => {
  handlers[e]?.forEach(h => h(payload));
  if (e !== 'CHANGED') handlers['CHANGED']?.forEach(h => h(payload)); // every domain event also bumps CHANGED
};
```

`src/db/persistence.ts`:
```ts
const KEY = 'gfa_db_v1';

export const load = <T,>(): T | null => {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as T) : null; }
  catch { return null; }
};

let timer: ReturnType<typeof setTimeout> | null = null;
export const saveDebounced = (state: unknown) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota: ignore */ }
  }, 150);
};

export const clear = () => localStorage.removeItem(KEY);
```
**Commit:** `STEP-03: ids, persistence, event bus`.

---

## STEP 4 — The database engine + seed (the keystone)

`src/db/seed.ts` — port literals out of `src/data/*` into one normalized snapshot. Keep the realistic Nigerian content; unify ids via `brand.ts`. Minimal starting seed:
```ts
import { hospitalId } from '@/lib/brand';
import type { Patient, Visit, Invoice, Payment } from '@/data-access/types';

export const seedPatients: Patient[] = [
  { id: 'PT-1001', hospitalId: hospitalId(145), name: 'John Doe', phone: '08012345678',
    sex: 'Male', age: 42, address: 'No 12, Adeola Odeku St, Lagos', bloodGroup: 'O+',
    allergies: ['Penicillin'], insurance: 'NHIS', nin: '12345678901', source: 'Walk-in',
    createdAt: '2026-03-25T08:00:00Z', updatedAt: '2026-03-25T08:00:00Z' },
  // ...port the other patients from hmsData.patientRecords with ONE id each
];

// Build visits/invoices/payments from the existing billingData literals, but add patientId
// by matching hospitalId. (Copy billingData.ts arrays here, add patientId, drop the old file later.)
export const seedVisits: Visit[] = [/* from billingData.visits + patientId */];
export const seedInvoices: Invoice[] = [/* from billingData.billingInvoices + patientId + lines */];
export const seedPayments: Payment[] = [/* from billingData.billingTxns */];
```

`src/db/database.ts` — the engine:
```ts
import { load, saveDebounced } from './persistence';
import { emit, on, type DbEvent } from './events';
import { nextId, nowIso, nowHuman, seedCounter } from './ids';
import { hospitalId } from '@/lib/brand';
import * as seed from './seed';
import type {
  Patient, PatientCreate, Visit, Invoice, Payment, Order, Referral, AuditEntry, SyncEvent,
} from '@/data-access/types';

// The whole hospital, normalized, in one object. Add collections as you port modules.
interface DbState {
  patients: Patient[];
  visits: Visit[];
  invoices: Invoice[];
  payments: Payment[];
  orders: Order[];
  referrals: Referral[];
  audit: AuditEntry[];
  syncEvents: SyncEvent[];
  // ...appointments, encounters, prescriptions, admissions, beds, wards, vitals, staff, etc.
}

const freshState = (): DbState => ({
  patients: seed.seedPatients,
  visits: seed.seedVisits,
  invoices: seed.seedInvoices,
  payments: seed.seedPayments,
  orders: [],
  referrals: [],
  audit: [],
  syncEvents: [],
});

// Hydrate from localStorage; fall back to seed on first run / corruption.
let state: DbState = load<DbState>() ?? freshState();

// Keep id counters ahead of any persisted ids so new ids never collide.
seedCounter('INV', 2000); seedCounter('PT', 2000); seedCounter('VST', 40000);

const commit = () => { saveDebounced(state); emit('CHANGED'); };

// Generic helpers
const all = <K extends keyof DbState>(k: K): DbState[K] => state[k];
const find = <K extends keyof DbState>(k: K, id: string): any =>
  (state[k] as any[]).find(r => r.id === id || r.invoiceId === id || r.visitCode === id);

const insert = <K extends keyof DbState>(k: K, row: any) => {
  (state[k] as any[]).unshift(row); commit(); return row;
};
const update = <K extends keyof DbState>(k: K, id: string, patch: any) => {
  state[k] = (state[k] as any[]).map(r =>
    (r.id === id || r.invoiceId === id || r.visitCode === id)
      ? { ...r, ...patch, updatedAt: nowIso() } : r) as any;
  commit(); return find(k, id);
};

function logAudit(e: Omit<AuditEntry, 'id' | 'at'>) {
  insert('audit', { ...e, id: nextId('AUD'), at: nowHuman() });
}
function enqueueSync(type: string, module: string, hmsRef: string, patientId?: string) {
  insert('syncEvents', {
    id: nextId('EV'), type, module, target: 'EMR', status: 'PENDING',
    retryCount: 0, maxRetries: 5, hmsRef, patientId, createdAt: nowIso(),
  } as SyncEvent);
}

// Domain mutators (add one per module as you migrate it)
export const db = {
  on, emit,
  reset() { state = freshState(); commit(); },
  snapshot: () => state,

  patients: {
    list: () => all('patients'),
    get: (id: string) => find('patients', id),
    update: (id: string, p: Partial<Patient>) => update('patients', id, p),
    create(input: PatientCreate): Patient {
      const seq = Number(nextId('PT').split('-')[1]);
      const row: Patient = {
        ...input, allergies: input.allergies ?? [],
        id: `PT-${seq}`, hospitalId: hospitalId(seq),
        createdAt: nowIso(), updatedAt: nowIso(),
      };
      insert('patients', row);
      emit('PATIENT_REGISTERED', row);
      logAudit({ actor: input.source ?? 'Front Desk', role: 'records', action: `Registered patient ${row.name}`, entity: 'patient', entityId: row.id });
      enqueueSync('PATIENT_REGISTERED', 'Records', row.id, row.id);
      return row;
    },
  },

  visits:   { list: () => all('visits'),   get: (id: string) => find('visits', id),   update: (id: string, p: Partial<Visit>) => update('visits', id, p) },
  invoices: { list: () => all('invoices'), get: (id: string) => find('invoices', id), update: (id: string, p: Partial<Invoice>) => update('invoices', id, p), insert: (row: Invoice) => insert('invoices', row) },
  payments: { list: () => all('payments'), insert: (row: Payment) => insert('payments', row), update: (id: string, p: Partial<Payment>) => update('payments', id, p) },
  orders:   { list: () => all('orders'),   get: (id: string) => find('orders', id), insert: (row: Order) => insert('orders', row), update: (id: string, p: Partial<Order>) => update('orders', id, p) },
  referrals:{ list: () => all('referrals'),insert: (row: Referral) => insert('referrals', row), update: (id: string, p: Partial<Referral>) => update('referrals', id, p) },
  audit:    { list: () => all('audit'), add: logAudit },
  syncEvents:{ list: () => all('syncEvents') },
};

export type { DbState, DbEvent };
```
> Notes: add a domain mutator (like `patients.create`) for each module as you reach it — each one `insert/update`s, then `emit`s its domain event, writes `audit`, and `enqueueSync`. That single pattern is what makes the whole hospital "talk to itself".

**Verify:** in a throwaway test, `db.patients.create({...})`, then re-`load()` and confirm the patient persisted.
**Commit:** `STEP-04: database engine + seed + persistence`.

---

## STEP 5 — Repository interface (the backend contract)

`src/data-access/repository.ts`:
```ts
import type { Patient, PatientCreate, Invoice, Payment, Order, Referral, Query, Paginated } from './types';

export interface Resource<T, C> {
  list(q?: Query): Promise<Paginated<T>>;
  get(id: string): Promise<T>;
  create(input: C): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface InvoiceResource extends Resource<Invoice, Partial<Invoice>> {
  capture(input: { invoiceId: string; amount: number; channel: string; cashier?: string }): Promise<{ ok: boolean; receipt?: string; message: string }>;
}

export interface Repository {
  patients: Resource<Patient, PatientCreate>;
  invoices: InvoiceResource;
  payments: Resource<Payment, Partial<Payment>>;
  orders: Resource<Order, Partial<Order>>;
  referrals: Resource<Referral, Partial<Referral>> & { accept(id: string, by: string): Promise<Referral>; };
  // add one resource per entity as modules migrate
}
```
**Commit:** `STEP-05: repository interface`.

---

## STEP 6 — Local repository (over `db`)

`src/data-access/local.ts`:
```ts
import { db } from '@/db/database';
import type { Repository } from './repository';
import type { Query, Paginated } from './types';

// Local list helper: filter/search/paginate over an in-memory array.
function page<T>(rows: T[], q?: Query): Paginated<T> {
  let items = rows;
  if (q?.search) {
    const s = q.search.toLowerCase();
    items = items.filter(r => JSON.stringify(r).toLowerCase().includes(s));
  }
  const pageSize = q?.pageSize ?? 50, p = q?.page ?? 1;
  const start = (p - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page: p, pageSize };
}
const ok = <T,>(v: T) => Promise.resolve(v);

export const localRepo: Repository = {
  patients: {
    list: q => ok(page(db.patients.list(), q)),
    get: id => ok(db.patients.get(id)),
    create: input => ok(db.patients.create(input)),
    update: (id, patch) => ok(db.patients.update(id, patch)),
    remove: () => ok(undefined),
  },
  invoices: {
    list: q => ok(page(db.invoices.list(), q)),
    get: id => ok(db.invoices.get(id)),
    create: input => ok(db.invoices.insert(input as any)),
    update: (id, patch) => ok(db.invoices.update(id, patch)),
    remove: () => ok(undefined),
    capture: input => ok(captureViaStore(input)), // STEP-08 wires this
  },
  payments: { list: q => ok(page(db.payments.list(), q)), get: id => ok(db.payments.list().find(p => p.id === id)!), create: i => ok(db.payments.insert(i as any)), update: (id, p) => ok(db.payments.update(id, p)), remove: () => ok(undefined) },
  orders:   { list: q => ok(page(db.orders.list(), q)),   get: id => ok(db.orders.get(id)),   create: i => ok(db.orders.insert(i as any)),   update: (id, p) => ok(db.orders.update(id, p)),   remove: () => ok(undefined) },
  referrals:{ list: q => ok(page(db.referrals.list(), q)),get: id => ok(db.referrals.list().find(r => r.id === id)!),create: i => ok(db.referrals.insert(i as any)), update: (id, p) => ok(db.referrals.update(id, p)), remove: () => ok(undefined),
    accept: (id, by) => ok(db.referrals.update(id, { status: 'ACCEPTED', acceptedBy: by })) },
};

function captureViaStore(_input: any): any { return { ok: false, message: 'wired in STEP-08' }; }
```

`src/data-access/index.ts`:
```ts
import { env } from '@/lib/env';
import { localRepo } from './local';
// import { httpRepo } from './http';  // enable in STEP-13
export const repo = env.useApi ? /* httpRepo */ localRepo : localRepo;
```
**Commit:** `STEP-06: local repository over db`.

---

## STEP 7 — React binding + TanStack Query hooks

`src/contexts/DatabaseProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '@/db/database';

// Re-renders subscribers whenever any db write fires 'CHANGED'. Pair with TanStack Query.
const Ctx = createContext(0);
export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => db.on('CHANGED', () => setTick(t => t + 1)), []);
  return <Ctx.Provider value={tick}>{children}</Ctx.Provider>;
};
export const useDbTick = () => useContext(Ctx);
```

`src/data-access/hooks.ts`:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repo } from './index';
import { useDbTick } from '@/contexts/DatabaseProvider';
import type { PatientCreate, Query } from './types';

// Local mode: include db tick in the key so writes refetch instantly.
// Http mode (later): the tick is constant; normal network caching applies.
export const usePatients = (q?: Query) => {
  const tick = useDbTick();
  return useQuery({ queryKey: ['patients', q, tick], queryFn: () => repo.patients.list(q) });
};
export const usePatient = (id?: string) => {
  const tick = useDbTick();
  return useQuery({ queryKey: ['patient', id, tick], queryFn: () => repo.patients.get(id!), enabled: !!id });
};
export const useCreatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientCreate) => repo.patients.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
};
export const useReferrals = (dept?: string) => {
  const tick = useDbTick();
  return useQuery({
    queryKey: ['referrals', dept, tick],
    queryFn: async () => (await repo.referrals.list()).items.filter(r => !dept || r.toDept === dept),
  });
};
```

Mount the provider in `src/App.tsx` **above** the existing stores:
```tsx
// App.tsx — add DatabaseProvider as the outermost data provider
import { DatabaseProvider } from '@/contexts/DatabaseProvider';
// ...
<AuthProvider>
  <DatabaseProvider>            {/* NEW */}
    <BillingStoreProvider>
      <LabFlowProvider>
        {/* unchanged */}
      </LabFlowProvider>
    </BillingStoreProvider>
  </DatabaseProvider>           {/* NEW */}
</AuthProvider>
```
**Verify:** a scratch component using `usePatients()` re-renders after `repo.patients.create(...)`.
**Commit:** `STEP-07: DatabaseProvider + query hooks`.

---

## STEP 8 — Migrate `BillingStore` onto `db` (keep its public API identical)

> The existing `BillingStore` exposes `capturePayment, emergencyOverride, resendPayLink, createInvoice, reverseTxn, reprintReceipt, openShift, closeShift, logAudit` and selectors `useInvoice, useVisitByCode`. **Do not change any of these signatures.** Only change where data lives: `useState(seed)` → `db`.

Before (current `src/contexts/BillingStore.tsx`):
```tsx
const [visits, setVisits] = useState<Visit[]>(seedVisits);
const [invoices, setInvoices] = useState<BillingInvoice[]>(seedInvoices);
const [txns, setTxns] = useState<BillingTxn[]>(seedTxns);
const [audit, setAudit] = useState<AuditLog[]>(seedAudit);
```
After:
```tsx
import { db } from '@/db/database';
import { useDbTick } from '@/contexts/DatabaseProvider';
// ...
const _tick = useDbTick();                 // re-render when db changes
const visits   = db.visits.list();
const invoices = db.invoices.list();
const txns     = db.payments.list();
const audit    = db.audit.list();
```
Rewrite each mutator to call `db` instead of `setX`. Example — `capturePayment` keeps the same signature and return shape:
```tsx
const capturePayment: BillingStoreCtx['capturePayment'] = ({ invoiceId, amount, channel, cashier, terminal, bankRef }) => {
  if (!shift.open && (channel === 'Cash' || channel === 'POS Card'))
    return { ok: false, message: 'Shift is closed. Open shift before capturing cash/POS.' };
  const inv = db.invoices.get(invoiceId);
  if (!inv) return { ok: false, message: 'Invoice not found' };
  if (amount <= 0) return { ok: false, message: 'Amount must be greater than zero' };
  if (amount > inv.balance) return { ok: false, message: `Amount exceeds balance (${inv.balance})` };

  const receipt = receiptNo(nextSeq());
  const newPaid = inv.amountPaid + amount;
  const newBal = inv.amount - newPaid;
  const newStatus = newBal === 0 ? 'PAID' : 'PARTIAL';

  db.invoices.update(invoiceId, { amountPaid: newPaid, balance: newBal, status: newStatus, channelUsed: channel });
  db.visits.update(inv.visitCode, {
    paymentStatus: newStatus,
    consultationUnlocked: newStatus === 'PAID' || undefined, // keep existing semantics
  });
  db.payments.insert({
    id: nextId('BTX'), ref: receipt, invoiceId, patientName: inv.patientName,
    channel, amount, status: newStatus, posTerminal: terminal, bankRef, cashier,
    timestamp: nowHuman(), matched: channel !== 'Bank Transfer',
  } as any);
  db.audit.add({ actor: cashier ?? 'Cashier', role: 'cashier',
    action: `Captured ${channel} ₦${amount.toLocaleString()} → ${receipt}`, entity: 'invoice', entityId: invoiceId });
  if (newStatus === 'PAID') db.emit('CONSULTATION_UNLOCKED', { visitCode: inv.visitCode });
  db.emit('INVOICE_PAID', { invoiceId });

  return { ok: true, receipt, message: newStatus === 'PAID' ? 'Payment captured. Doctor consultation unlocked.' : 'Partial payment captured.' };
};
```
Then point `localRepo.invoices.capture` (STEP-06) at this same logic (extract to a shared function so both the store and the repo call it).

**Verify (critical):** In `BillingInitiation`, capture a payment → `ConsultationModule` queue shows the visit unlocked → **refresh** → still unlocked. This proves persistence + the gate survive.
**Commit:** `STEP-08: BillingStore backed by db (API unchanged)`.

---

## STEP 9 — Migrate `LabFlowStore` + connect it to Billing

> Same rule: keep `addRequest, sendToBilling, generateInvoice, markPaid, …, validate` signatures. Move `requests` into `db.orders` (kind:'lab') or a `db.labOrders` collection. The key new behavior: **`sendToBilling` must create a real invoice line** so the cashier sees lab charges.

`sendToBilling` after:
```tsx
const sendToBilling: Ctx['sendToBilling'] = (id, by = 'Lab User') => {
  const req = db.orders.get(id);                       // lab order
  if (!req) return;
  const amount = req.items.reduce((s, t) => s + t.price, 0);
  // Reuse BillingStore.createInvoice via db so ONE invoice authority exists.
  const inv = db.invoices.insert(buildInvoice({
    patientId: req.patientId, patientName: req.patientName, hospitalId: req.hospitalId,
    phone: req.phone ?? '', department: 'Laboratory', amount,
    lines: req.items.map(t => ({ desc: t.name, qty: 1, unitPrice: t.price, source: 'Lab' })),
  }));
  db.orders.update(id, { status: 'AWAITING_PAYMENT', invoiceId: inv.invoiceId });
  db.audit.add({ actor: by, role: 'lab', action: `Lab order ${id} sent to billing (${inv.invoiceId})`, entity: 'order', entityId: id });
  toast.success('Laboratory request sent to billing.');
};
```
> `buildInvoice` is the shared invoice factory extracted in STEP-08 (one numbering scheme for the whole hospital — fixes the dual-numbering bug). When the cashier captures payment on that invoice, the lab order's status should advance to `PAID` via an `INVOICE_PAID` listener:
```tsx
// register once in LabFlowProvider
useEffect(() => db.on('INVOICE_PAID', ({ invoiceId }) => {
  const order = db.orders.list().find(o => o.invoiceId === invoiceId && o.kind === 'lab');
  if (order) db.orders.update(order.id, { status: 'PAID' });
}), []);
```
**Verify:** Doctor orders FBC → lab sends to billing → cashier sees the invoice in Billing → captures → lab order flips to PAID (collection-ready) → refresh persists.
**Commit:** `STEP-09: LabFlow on db + real billing link`.

---

## STEP 10 — Auth: one `guessRole`, persisted session, token-shaped login

`src/lib/roles.ts`:
```ts
import type { Role } from '@/data-access/types';

// Single source for role inference + landing + nav permissions. Imported by BOTH
// AuthContext and LoginPage (kills the duplicated/diverged guessRole).
export const guessRole = (email: string): Role => {
  const e = email.toLowerCase();
  const map: [string[], Role][] = [
    [['super','root'],'superadmin'], [['board'],'board'], [['cmd'],'cmd'],
    [['finance'],'finance'], [['hr'],'hr'], [['doctor'],'doctor'], [['it'],'it'],
    [['nurse'],'nurse'], [['pharm'],'pharmacist'], [['radiology','radio','imaging'],'radiology'],
    [['cap','child','adolescent'],'cap'], [['addiction','rehab','detox','substance'],'addiction'],
    [['psychogeriatric','geriatric','elderly','dementia'],'psychogeriatrics'],
    [['speech','slt','swallow','dysphagia','language'],'speech'],
    [['physio','mobility'],'physiotherapy'],
    [['nutrition','dietetic','dietitian','kitchen','catering'],'nutrition'],
    [['socialwork','social','welfare'],'socialwork'],
    [['icu','critical','hdu','ventilator','codeblue'],'icu'],
    [['psychology','psych'],'psychology'], [['lab'],'lab'], [['cashier'],'cashier'],
    [['records'],'records'], [['admin'],'admin'], [['staff'],'staff'], [['student'],'student'],
  ];
  for (const [tokens, role] of map) if (tokens.some(t => e.includes(t))) return role;
  return 'patient';
};

export const landingFor = (role: Role): string =>
  role === 'lab' ? '/dashboard/laboratory'
  : role === 'doctor' ? '/dashboard/doctor/clinical'
  : `/dashboard/${role}`;
```

Rewrite `src/contexts/AuthContext.tsx` — persist + token shape (so `HttpRepo` works later unchanged):
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { guessRole } from '@/lib/roles';
import { db } from '@/db/database';
import type { Role } from '@/data-access/types';

interface AuthUser { id: string; name: string; email: string; role: Role; token: string; }
interface AuthState {
  isAuthenticated: boolean; user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, role: Role, password: string) => boolean;
  logout: () => void;
}
const KEY = 'gfa_session_v1';
const Ctx = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  });
  useEffect(() => {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  }, [user]);

  const login = (email: string, _password: string) => {
    // Demo mode: any password. Look up a real user if present, else synthesize.
    const found = (db as any).users?.list?.().find?.((u: any) => u.email === email);
    const role = (found?.role as Role) ?? guessRole(email);
    setUser({ id: found?.id ?? 'u-' + Date.now(), name: found?.name ?? email.split('@')[0],
              email, role, token: 'demo.' + btoa(email) });
    return true;
  };
  const register = (name: string, email: string, role: Role, _p: string) => {
    setUser({ id: 'u-' + Date.now(), name, email, role, token: 'demo.' + btoa(email) });
    return true;
  };
  const logout = () => setUser(null);

  return <Ctx.Provider value={{ isAuthenticated: !!user, user, login, register, logout }}>{children}</Ctx.Provider>;
};
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
};
```
In `LoginPage.tsx`: delete the local `guessRole`, import from `@/lib/roles`, and use `landingFor(role)`:
```tsx
import { guessRole, landingFor } from '@/lib/roles';
// ...
const handleLogin = () => { const role = guessRole(loginEmail); if (login(loginEmail, loginPassword)) navigate(landingFor(role)); };
```
**Verify:** log in, refresh → still logged in on the same dashboard.
**Commit:** `STEP-10: unified roles + persisted session`.

---

## STEP 11 — RBAC on every route

`RequireRole` already works. Add a tiny helper and wrap groups.

`src/components/withRole.tsx`:
```tsx
import { RequireRole } from '@/components/RequireRole';
import type { Role } from '@/data-access/types';
import type { ReactElement } from 'react';
// Wrap an element in a role guard. Usage: element={withRole(['lab'], <LabDashboard />)}
export const withRole = (roles: Role[], el: ReactElement) => <RequireRole roles={roles}>{el}</RequireRole>;
```
Apply per group in `App.tsx` (use the matrix in audit §FIX-03B). Example:
```tsx
{/* Laboratory */}
<Route path="/dashboard/laboratory" element={withRole(['superadmin','lab'], <LabCenterDashboard />)} />
<Route path="/dashboard/laboratory/results" element={withRole(['superadmin','lab'], <LabCenterResultEntry />)} />
{/* Nursing */}
<Route path="/dashboard/nurse" element={withRole(['superadmin','nurse'], <NurseDashboard />)} />
{/* Patient portal */}
<Route path="/dashboard/patient" element={withRole(['patient'], <PatientOverview />)} />
```
> Tip: to avoid editing 678 lines by hand, group routes into arrays and `.map()` them with the guard. But do it carefully and keep the file readable.

Optional (better): make RBAC dynamic by reading `db.roleDefinitions` so SuperAdmin can edit permissions without code changes — defer to MOD-01.

**Verify:** logged out → dashboard URL redirects to `/login`. Wrong role → 403 panel. Right role → renders.
**Commit:** `STEP-11: role guards on all dashboard routes`.

---

## STEP 12 — Module migration recipe (apply to every page) + worked example

**The recipe (repeat per module):**
1. Open the page file. Find every `import { x } from '@/data/...'` and every inline `const data = [...]`.
2. Replace reads with a hook: `const { data } = useXxx()`.
3. Replace writes (the `useState` + button handlers) with a mutation: `const m = useCreateXxx(); m.mutate(payload)`.
4. Delete the inline/static array.
5. If the module receives work from others, add an **inbound queue** (referrals/orders).
6. Refresh-test. Commit `STEP-12/<module>: wire <module> to db`.

**Worked example — Psychology inbound referrals (proves cross-department talk).**
In `DoctorClinicalCenter` (referrer), the "refer" button:
```tsx
import { repo } from '@/data-access';
import { useAuth } from '@/contexts/AuthContext';
// ...
const { user } = useAuth();
const refer = async (patientId: string) => {
  await repo.referrals.create({
    patientId, fromDept: 'Doctor', toDept: 'psychology',
    reason: 'Cognitive assessment requested', status: 'PENDING',
  } as any);
  toast.success('Referral sent to Psychology.');
};
```
In `PsychologyCenter` dashboard (receiver) — replace static data with the live inbound queue:
```tsx
import { useReferrals } from '@/data-access/hooks';
import { repo } from '@/data-access';
import { useAuth } from '@/contexts/AuthContext';

export const PsychologyDashboard = () => {
  const { user } = useAuth();
  const { data: referrals = [] } = useReferrals('psychology');   // live, persisted
  const accept = (id: string) => repo.referrals.accept(id, user?.name ?? 'Psychologist');

  return (
    <Shell title="Dashboard">
      {/* keep the existing card/table styling; only the data source changed */}
      <Table>
        <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>From</TableHead><TableHead>Reason</TableHead><TableHead/></TableRow></TableHeader>
        <TableBody>
          {referrals.map(r => (
            <TableRow key={r.id}>
              <TableCell>{r.patientId}</TableCell>
              <TableCell>{r.fromDept}</TableCell>
              <TableCell>{r.reason}</TableCell>
              <TableCell>
                {r.status === 'PENDING'
                  ? <Button size="sm" onClick={() => accept(r.id)}>Accept</Button>
                  : <Badge>{r.status}</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Shell>
  );
};
```
**Acceptance for "departments talk":** doctor clicks Refer → switch to Psychology login → the referral is in the inbox → Accept → refresh → still ACCEPTED. When this works for one pair, the same `referrals` pattern wires all 9 specialty centers.

---

## STEP 13 — HTTP repository (the backend swap)

`src/data-access/http.ts`:
```ts
import { env } from '@/lib/env';
import type { Repository } from './repository';
import type { Query, Paginated } from './types';

function authToken() { try { return JSON.parse(localStorage.getItem('gfa_session_v1') || 'null')?.token; } catch { return null; } }
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(authToken() ? { Authorization: `Bearer ${authToken()}` } : {}), ...init?.headers },
  });
  if (!res.ok) throw { status: res.status, message: await res.text() };
  return res.status === 204 ? (undefined as T) : res.json();
}
const qs = (q?: Query) => q ? '?' + new URLSearchParams(Object.entries(q).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : '';

export const httpRepo: Repository = {
  patients: {
    list: q => api<Paginated<any>>(`/patients${qs(q)}`),
    get: id => api(`/patients/${id}`),
    create: input => api('/patients', { method: 'POST', body: JSON.stringify(input) }),
    update: (id, patch) => api(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: id => api(`/patients/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list: q => api(`/invoices${qs(q)}`), get: id => api(`/invoices/${id}`),
    create: i => api('/invoices', { method: 'POST', body: JSON.stringify(i) }),
    update: (id, p) => api(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
    remove: id => api(`/invoices/${id}`, { method: 'DELETE' }),
    capture: input => api(`/invoices/${input.invoiceId}/payments`, { method: 'POST', body: JSON.stringify(input) }),
  },
  // ...mirror every resource: GET list/get, POST create, PATCH update, DELETE remove
  payments: null as any, orders: null as any, referrals: null as any, // fill identically
};
```
Then flip the switch in `index.ts`:
```ts
export const repo = env.useApi ? httpRepo : localRepo;
```
> The backend agent's job is to make these exact paths return these exact shapes. Nothing in the pages changes.

**Commit:** `STEP-13: http repository (backend-ready)`.

---

## STEP 14 — Emit the backend build spec (OpenAPI)

Generate `openapi.yaml` from the zod schemas so the backend is a deterministic build.
```bash
npm i -D zod-to-openapi
```
`scripts/gen-openapi.ts` (run with `tsx`):
```ts
import { OpenApiGeneratorV3, extendZodWithOpenApi } from 'zod-to-openapi';
import { z } from 'zod';
import * as T from '../src/data-access/types';
extendZodWithOpenApi(z);
// Register each schema + path (PatientCreate, Query, etc.), then:
// writeFileSync('openapi.yaml', yaml.stringify(generator.generateDocument({...})))
```
Hand the backend agent the §18.5 bundle: `types.ts`, `repository.ts`, `openapi.yaml`, `db/seed.ts`, and audit §16.

**Commit:** `STEP-14: openapi spec + handoff bundle`.

---

## STEP 15 — Tests (one smoke test per wired flow)

`src/db/database.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './database';
import { clear } from './persistence';

describe('db', () => {
  beforeEach(() => { clear(); db.reset(); });

  it('creates a patient with one hospitalId and persists', () => {
    const p = db.patients.create({ name: 'Test Patient', phone: '08000000000', sex: 'Male', allergies: [], insurance: 'None', source: 'Walk-in' } as any);
    expect(p.hospitalId).toMatch(/^GFA\/ARO\/\d{4}\/\d{6}$/);
    expect(db.patients.get(p.id)).toBeTruthy();
  });

  it('payment on an invoice unlocks the linked visit', () => {
    const inv = db.invoices.list()[0];
    // call the shared capture function; assert visit.consultationUnlocked === true when PAID
  });
});
```
Run: `npm test`.
**Commit:** `STEP-15: smoke tests for db + billing flow`.

---

## STEP 16 — Per-step Definition of Done (gate every commit)

- [ ] `npm run build` green
- [ ] `npm run lint` no new errors
- [ ] The touched flow works **after F5** (persistence)
- [ ] No page imports `@/data/*` for the migrated module (reads via `repo`/hooks)
- [ ] No public store API signature changed
- [ ] Audit entry written for any state-changing action
- [ ] Comment standard respected (intent only)

---

## Appendix A — Exact execution order

```
STEP-00 env
STEP-01 brand
STEP-02 types.ts (+zod)
STEP-03 ids/persistence/events
STEP-04 database.ts + seed         ← keystone
STEP-05 repository.ts
STEP-06 local.ts
STEP-07 DatabaseProvider + hooks (+mount in App.tsx)
STEP-08 BillingStore → db          ← do not change its API
STEP-09 LabFlowStore → db + billing link
STEP-10 roles.ts + AuthContext (persist) + LoginPage
STEP-11 route guards (App.tsx)
STEP-12 migrate modules one by one (front door → clinical → ancillary → inpatient → specialty → exec)
STEP-13 http.ts
STEP-14 openapi + handoff
STEP-15 tests
STEP-16 DoD gate (every commit)
```

## Appendix B — Module migration queue (STEP-12 order)

1. MPI / registration (creates patients)  →  2. Scheduling + public appointment  →  3. Records/triage
4. Doctor/Consultation (orders+referrals) →  5. Lab  →  6. Pharmacy  →  7. Radiology  →  8. Billing center  →  9. Nursing
10. EMR chart (read-model)  →  11. EMR sync (real events)
12. IPD/Admission/Ward (pick ONE bed authority)  →  13. Discharge  →  14. Records statutory
15. Psychology → 16. CAP → 17. Addiction → 18. Psychogeriatrics → 19. Physiotherapy → 20. Speech → 21. Nutrition → 22. Social Work → 23. ICU  (all via the referral template)
24. Board → 25. CMD → 26. Finance → 27. HR → 28. Admin (service catalog) → 29. IT → 30. Super Admin (dynamic RBAC) → 31. IAM (down-scoped)

*End of document. Build STEP-04 first; everything else is leverage on top of it.*
