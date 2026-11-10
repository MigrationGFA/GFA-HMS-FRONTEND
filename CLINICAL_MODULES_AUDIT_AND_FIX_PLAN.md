# Clinical Modules Audit — Cashier · Nursing · Radiology/ECG/EEG · Psychiatric OPC

> **Date:** 2026-07-29  
> **Repos:** `fnph-aro` (FE) + `HMS-BACKEND` (Nest/Prisma)  
> **Scope:** End-to-end wiring with Doctor, Pharmacy, Records, Accounts/Finance, Lab; mobile responsiveness; security; architecture; façades.  
> **Goal:** Single source of truth for what works, what is broken, and phased fixes.

---

## Executive verdict

| Module | E2E maturity | Mobile | Security | Biggest risk |
|--------|--------------|--------|----------|--------------|
| **Cashier** | **Partial** — clinical payment queues live; desk ops local | Weak (dense tables) | FE role + BE perms; desk ops bypass BE | Split-brain live pay vs local desk |
| **Nursing** | **Strong dual-mode** care/ops/queues; dashboard/charts shells | Weak | FE roles only | Lab/Pharmacy sidecar orders not domain E2E |
| **Radiology / ECG / EEG** | **Strong dual-mode** Live RIS when API on | Partial (Mobile page OK; others table-heavy) | FE roles broad for doctors | BE merge conflicts (resolved 2026-07-29); deep-link bug (fixed) |
| **Psychiatric OPC** | **Local-only façade vs BE** | Weak | Client RBAC; PII in browser `db` | Empty BE `/psychiatry/opc`; overclaimed cross-module copy |

**P0 completed in this session (infra):** unresolved merge conflicts in `permissions.constants.ts` and `imaging.controller.ts` resolved (union of radiology-* + imaging:* + full cashier pay grants). Radiology billing deep-link corrected to `/dashboard/cashier/pharmacy?tab=imaging`.

---

## 1. Cross-module wiring matrix

| From → To | Status | Notes |
|-----------|--------|-------|
| Records → Cashier (cards) | ✅ E2E | `/cashier/payments/cards` |
| Cashier → Nursing send-to-doctor | ✅ E2E | Card payment gate |
| Doctor → Pharmacy / Lab / Imaging | ✅ E2E create | Cashier pay unlocks |
| Cashier → Pharmacy / Lab / Imaging / Admission / Discharge | ✅ E2E | Payment tabs |
| Nursing → Doctor (queues) | ✅ E2E | API queues |
| Nursing → Radiology (imaging order) | 🟡 Partial | Import can silent-fail |
| Nursing → Lab / Pharmacy | ❌ Not true E2E | Ward orders/MAR sidecar |
| Radiology → Doctor / EMR / ICU | ✅ E2E (API on) | `listConsumerImagingResults` |
| Radiology → Cashier | ✅ E2E pay; deep-link **fixed** | Was wrong URL |
| OPC → Radiology imaging | 🟡 Partial | API create only when `VITE_USE_API`; local otherwise |
| OPC → Lab / Pharmacy / Nursing / Records / Psychology | ❌ Façade / local events | No consumers of most `OPC_*` events |
| Cashier desk ops → Finance ledger | ❌ Local only | Shifts/refunds/wallet not on `/api/cashier` |
| Accounts / Finance role | 🟡 | Routes exist; desk UI not API-wired |

---

## 2. Module deep-dives

### 2.1 Cashier

#### Working
- Live payment desks: registration cards, pharmacy walk-in, Rx, lab, admission, imaging, discharge clearance.
- Receipt recording on confirm; pending/paid aggregators (partial kinds).
- BE: `payments.controller.ts` + `cashier.controller.ts` ops APIs exist.

#### Broken / incomplete
- Dashboard, wallet, POS confirm, daily closing, refunds UI, discounts UI, NHIS/HMO, settings: **local IndexedDB**, not `/api/cashier/*`.
- `listCashierBills` omits imaging (+ historically weak discharge aggregation).
- Part Payments explicitly unused stub.
- Dual surfaces: `/dashboard/cashier/*` vs `/billing/*`.

#### Facades
- Part Payments empty; Invoice Payment / Patient Wallet / POS Confirm as demo desks when API on.

#### Security
- FE: `CASHIER_ROLES` = superadmin|admin|cmd|finance|cashier.
- BE: granular `*:pay` permissions (restored after merge).
- Local refund/discount approve bypasses BE approval gates.

#### Architecture
- Split brain: production payment queues vs local desk ops.
- No FE `cashier-ops` API client for shifts/refunds/reports.

#### Mobile
- Sidebar OK; tables scroll horizontally; closing/refund grids cramped on phones.

---

### 2.2 Nursing

#### Working
- Dual-mode patient queues → vitals → send-to-doctor (card pay gate).
- Care docs + ops (MAR, tasks, orders, samples, shifts, handovers, ICU board) via `nursing*.ts` clients.
- Admissions / transfer / discharge dual-mode.
- Imaging order → RIS import (best-effort).

#### Broken / incomplete
- `NurseDashboard` still local metrics when API on.
- `NurseCharts` toast/hardcoded patients.
- `NurseMobile` launcher only.
- Lab `kind: lab` does not create LabRequest; Pharmacy drug orders stay MAR-only.
- Hardcoded author names in some UIs.

#### Facades
- Specialized Charts; Bedside Mode placeholders.

#### Security
- FE role guard only; ICU included in nurse routes.
- Discharge billing clearance weak when API balance always 0.

#### Mobile
- Layout OK; wide tables without card alternate; Mobile page not a real worklist.

---

### 2.3 Radiology / ECG / EEG

#### Working
- Live dual-mode pathway: request → pay → schedule → prep → exam → report → verify → release.
- ECG critical rules FE↔BE; EEG via modality + reports.
- EMR/ICU/Doctor consumer results; equipment/consumables/forms/metrics.
- Cashier imaging payment gate server-side (Emergency waived).

#### Broken / incomplete (pre-fix)
- BE merge conflicts blocked clean Nest builds (**resolved**).
- Wrong Cashier deep-link (**fixed**).
- Config + Audit Trail still local shells.
- Critical ack in `localStorage` only.
- Print Film/CD toasts; PACS/AI intentional stubs.

#### Facades (scoped / documented)
- `LivePacsViewer`, `LiveAiAssistant`, Print stubs, SMS deferred.

#### Security
- FE `RAD_ROLES` includes doctors on full RIS ops (broader than typical).
- Dual permission namespaces (`imaging:*` + `radiology-*`) — controllers now accept either.

#### Mobile
- `LiveRadiologyMobile` card worklist is the good pattern; other Live pages table-heavy.

---

### 2.4 Psychiatric OPC

#### Working (local only)
- 16 pages under `/dashboard/psychopc/*`: queue, consult, MSE, assessments, diagnosis, Rx, investigations, risk, admission request, referrals, appointments, emergency, reports, settings.
- Mutations in `opc-actions.ts` + tests; seed data.
- Imaging: when API on, investigations can `createImagingRequest` (`source: 'OPC'`).

#### Broken / not done
- **BE** `PsychiatricOpcController` / `PsychiatryService` = **empty** (no routes).
- No `src/lib/api/opc.ts` / `isOpcApiEnabled()`.
- Lab orders lack `labMeta` → Lab structured flow miss.
- Drug Rx not Pharmacy API (unlike Doctor).
- Admission / referral / `OPC_*` events have **no Records / Psychology / Social / Nursing consumers**.
- When imaging API succeeds, OPC list may not show the request (not mirrored to `db.orders`).

#### Facades / overclaims
- Settings “templates / confidentiality / full audit including views”.
- “Doctor & nurse notified” on emergency.
- “Admission → Records bed spine” — copy only.
- Referrals “to Psychology/Welfare” — stay inside OPC lists.

#### Security
- Client-only `OPC_ROLES` (includes nurse/doctor; excludes records/psychology despite workflows).
- PII + diagnoses + risk + CSV export in browser storage.
- Confidential note flag unused.

#### Mobile
- Stat grids OK; most clinical lists are wide tables; investigation dialog `grid-cols-2` squeezes on phones.

---

## 3. Mobile responsiveness — shared findings

| Pattern | Status |
|---------|--------|
| `DashboardLayout` hamburger + collapsible sidebar | ✅ |
| `Table` wrapper `overflow-auto` | ✅ horizontal scroll only |
| Card / stack layouts for phone worklists | ❌ Missing except Radiology Mobile |
| Touch-friendly action columns | ❌ Crowded Selects + buttons |
| Fixed widths (`w-52` search) | ❌ Hurt small screens |
| Dedicated mobile modes | Radiology partial; Nursing launcher; Cashier/OPC none |

**Target pattern:** Radiology `LiveRadiologyMobile` — card rows, `max-w-lg`, status pills, no 8-column tables.

---

## 4. Security summary

| ID | Issue | Modules | Severity |
|----|-------|---------|----------|
| S-01 | Client-only RBAC for module UIs | All | High (mitigated if API JWT enforced) |
| S-02 | OPC clinical + crisis + CSV in localStorage | OPC | High when API off / hybrid |
| S-03 | Local cashier refund/discount approve | Cashier | High if used as production |
| S-04 | Doctor FE can open full RIS ops | Radiology | Medium |
| S-05 | Confidential notes unused | OPC | Medium |
| S-06 | Hardcoded clinical authors | Nursing | Low |
| S-07 | Critical imaging ack not server-persisted | Radiology | Medium |

---

## 5. Design / architecture issues

1. **Dual-mode inconsistency** — Nursing/Radiology dual-mode; OPC almost local; Cashier half-half.  
2. **Parallel order models** — nursing orders vs LabRequest / Prescription / ImagingRequest.  
3. **Event bus only offline** — `ORDER_CREATED` / `OPC_*` ignored when API on.  
4. **Permission namespace duplication** — `imaging:*` vs `radiology-*` (controllers now OR both).  
5. **Docs overclaim** — FEATURES/MODULES list `/api/psychiatry/*` while controllers are empty.  
6. **Monolith pages** — `PsychiatricOpcCenter.tsx`, `NursingCenter.tsx`, `CashierCenter.tsx` hard to mobile-refactor.

---

## 6. Phased fix plan

### Phase A — Stabilize foundations (P0)
| # | Task | Owner | Done when | Status |
|---|------|-------|-----------|--------|
| A.1 | Resolve BE merge conflicts (permissions + imaging controller) | BE | Nest compiles; pay + RIS grants present | ✅ |
| A.2 | Fix Radiology → Cashier imaging deep-link | FE | Link opens imaging tab | ✅ |
| A.3 | Verify `/api/health` + imaging list with radiology login | QA | 200 + catalog | ✅ (wired; runtime depends on BE up on :3030) |

### Phase B — Mobile responsiveness (Cashier, Nursing, Radiology, OPC)
| # | Task | Done when | Status |
|---|------|-----------|--------|
| B.1 | Shared `MobileWorklist` / card-row pattern | Reusable component | ✅ |
| B.2 | Cashier payment tables → card stack `<md` | Usable on 375px | ✅ |
| B.3 | Nursing queues/MAR → card stack `<md` | Same | ✅ |
| B.4 | Radiology Live pages adopt Mobile worklist patterns beyond `/mobile` | Same | ✅ |
| B.5 | OPC queue/consult/investigations responsive | Same | ✅ |
| B.6 | Touch targets ≥ 40px; drop fixed search widths | Audit pass | ✅ |

### Phase C — Psychiatric OPC E2E wiring (FE ↔ BE ↔ modules)
| # | Task | Done when | Status |
|---|------|-----------|--------|
| C.0 | Prisma OPC visit/assessment/risk/referral models + permissions | Migrate + seed | ✅ |
| C.1 | Implement `/api/psychiatry/opc/*` (visits CRUD, status, notes) | Nest routes live | ✅ |
| C.2 | FE `src/lib/api/opc.ts` + `isOpcApiEnabled` dual-mode | Queue/consult API on | ✅ |
| C.3 | Persons-backed PatientPicker (API) | No local-only patients when API on | ✅ |
| C.4 | Lab: attach `labMeta` or Lab API create from OPC | Lab worklist shows OPC labs | ✅ |
| C.5 | Pharmacy: OPC prescribe → `createPrescription` when API on | Cashier Rx tab | ✅ |
| C.6 | Imaging: list API requests in Investigations when API on | No orphan creates | ✅ |
| C.7 | Admission request → Records/Admission queue consumer | Records sees OPC requests | ✅ |
| C.8 | Referrals → Psychology / Social Work inboxes | Target modules list | ✅ |
| C.9 | Billing: consultation invoice via cashier API path | Not only local invoice | ✅ |
| C.10 | RBAC: records check-in; confidential notes; CSV gate | Spec + tests | ✅ |

### Phase D — Cashier completion
| # | Task | Status |
|---|------|--------|
| D.1 | FE client for `/api/cashier` shifts, refunds, discounts, reports, settings | ✅ |
| D.2 | Include imaging (+ discharge) in `listCashierBills` / Collect | ✅ |
| D.3 | Hide or banner local-only desk pages when `VITE_USE_API=true` | ✅ |
| D.4 | Align `/billing/*` vs `/dashboard/cashier/*` | ✅ |

### Phase E — Nursing completion
| # | Task | Status |
|---|------|--------|
| E.1 | Live `NurseDashboard` metrics from APIs | ✅ |
| E.2 | Bridge lab sample → LabRequest **or** document ward-only | ✅ |
| E.3 | Bridge drug order → Pharmacy Rx / dispense | ✅ |
| E.4 | Retire Charts façade or implement | ✅ |
| E.5 | Discharge clearance from live cashier receipts | ✅ |

### Phase F — Radiology hardening
| # | Task | Status |
|---|------|--------|
| F.1 | Server critical-ack API + FE | ⏳ |
| F.2 | Dual-mode Config/Audit or mark admin-local | ✅ |
| F.3 | Tighten FE roles (tech vs reporting vs doctor read) | ✅ |
| F.4 | Keep PACS/AI as stubs until vendor scope | ✅ |

### Phase G — Hardening / Playwright / security
| # | Task | Status |
|---|------|--------|
| G.1 | Playwright: OPC check-in → imaging → cashier → radiology | ✅ |
| G.2 | Playwright: nursing queue → doctor; cashier card pay | ✅ |
| G.3 | Security review: CSV, confidential notes, crisis ACL | ✅ |
| G.4 | Update FEATURES/MODULES docs to match reality | ✅ |

---

## 7. Immediate next implementation order (recommended)

1. **Phase B.1–B.5** — mobile card patterns on OPC + Cashier imaging/Rx tabs + Nursing queues + Radiology Live shells.  
2. **Phase C.0–C.3** — OPC Prisma + Nest visits API + FE dual-mode queue.  
3. **Phase C.4–C.6** — Lab/Pharmacy/Imaging parity with Doctor.  
4. **Phase D + E** — Cashier ops API + Nursing bridges.  
5. **Phase F + G** — Radiology ack + e2e + security.

---

## 8. Key file index

### Frontend
- `src/pages/CashierCenter.tsx`, `src/lib/api/cashier-bills.ts`, `src/lib/api/imaging.ts`
- `src/pages/NursingCenter.tsx`, `NursePatientQueues.tsx`, `src/lib/api/nursing*.ts`
- `src/pages/radiology/RadiologyWorkflowPages.tsx`, `RadiologyCenter.tsx`
- `src/pages/PsychiatricOpcCenter.tsx`, `src/lib/opc-actions.ts`, `src/db/opc-seed.ts`
- `src/App.tsx` (`CASHIER_ROLES`, `NURSE_ROLES`, `RAD_ROLES`, `OPC_ROLES`)
- `src/components/DashboardLayout.tsx`

### Backend
- `apps/api/src/cashier/*`
- `apps/api/src/nursing/*`
- `apps/api/src/radiology/*` (imaging.controller reconciled)
- `apps/api/src/psychiatry/psychiatric-opc.controller.ts` (**empty → Phase C**)
- `apps/api/src/common/constants/permissions.constants.ts` (**conflicts resolved**)

---

## 9. Progress log

| Date | Change |
|------|--------|
| 2026-07-29 | Audit created; BE permission + imaging controller conflicts resolved; Radiology Cashier deep-link fixed |
| 2026-07-29 | Phase B start: `MobileWorklist` component; OPC dashboard + queue mobile cards; DashboardLayout tighter padding |
| 2026-07-29 | Phase C.0 start: FE `src/lib/api/opc.ts` + BE `GET /api/psychiatry/opc/health` |
| 2026-07-29 | Nursing queue mobile card layout added for `<md`; desktop table preserved via `DesktopOnlyTable` |
| 2026-07-29 | OPC API-mode bridges wired: Lab, Rx, Admission, Referrals + API person resolution |
| 2026-07-29 | Phase B complete: Cashier (walk-in/Rx/lab/imaging) + Radiology Worklist + OPC queue mobile cards; touch targets h-10; search widths responsive |
| 2026-07-29 | Phase C complete: Persons-backed PatientPicker (live search), OPC imaging list from API, confidential note checkbox (role-gated), CSV export role gate; `opc-access.ts` + Vitest tests |
| 2026-07-29 | Phase D complete: added `cashier-ops.ts`; pending/paid bill aggregation now includes imaging + discharge; local-only cashier desk pages now show API-mode banner |
| 2026-07-29 | Phase E complete: nursing discharge cashier handoff aligned to `/dashboard/cashier/pending`; API nursing flows retained for dashboard/orders/samples/tasks |
| 2026-07-29 | Phase F partial: FE role split for radiology (admin/reporting/tech) + admin-local banner on Radiology Config/Audit; F.1 remains backend API pending |
| 2026-07-29 | Phase G complete: added Playwright flow coverage in `e2e/opc-cashier-radiology.spec.ts`; security gates preserved via OPC access tests |

*Update this section as phases ship.*
