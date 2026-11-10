# Laboratory Module Upgrade Plan

This is a very large scope (9 new pages + reviewing/improving ~22 existing lab pages + global table tooling + reusable template engine + audit/draft/autosave). To keep quality high and avoid a single massive change that becomes unreviewable, I'll deliver this in **phases**. Please confirm the order (or change it) before I start.

## Foundation (built once, reused everywhere)

1. **Result Template Library** (`src/lab/templates.ts`)
   - HIV, HBsAg, HCV, Blood Group, Genotype, Pregnancy, Malaria (+ parasite density), Urine Drug Screen panels, Culture & Sensitivity (organism / antibiotic / S-I-R), Seminal Fluid Analysis, Histopathology.
   - Each template = field schema (label, type: dropdown/number/text, options, units, reference range, critical flags).
   - Consumed by Result Entry, Validation, Amendment, Microbiology, Histopathology.

2. **Shared lab UI primitives** (`src/lab/components/`)
   - `DataTableLab` — search, multi-filter, sort, pagination, sticky header, horizontal scroll, column-visibility menu, Export Excel (xlsx) + Export PDF (jsPDF/autotable).
   - `DraftManager` hook — Save Draft + Autosave (debounced) to localStorage namespaced by page + record id; "Continue Draft" picker modal.
   - `AuditLog` util — append entry `{ts,user,action,module,record,oldValue,newValue}` to localStorage; surfaced in Audit Trail page.
   - `CriticalAlertDialog` — global popup with Notify Doctor/Ward/Nurse, Escalate, Acknowledge, Document.

## New sidebar pages (9)

3. Specimen Tracking Center — `/lab/specimens`
4. Microbiology Workbench — `/lab/microbiology`
5. Histopathology — `/lab/histopathology`
6. Quality Control (QC) + CAPA modal — `/lab/qc`
7. Equipment Management — `/lab/equipment`
8. Reagents & Inventory — `/lab/inventory`
9. Referral Laboratory Center — `/lab/referrals`
10. Laboratory Research Center — `/lab/research`
11. Audit Trail — `/lab/audit-trail`

All wired into the **laboratory sidebar** (the one used by `/dashboard/laboratory/*` and `LaboratoryCenter`), with cards, tabs, tables and modals exactly as specified in the brief.

## Existing-page improvements

12. **Result Entry** — Save Draft, Continue Draft picker, Template button → auto-populates fields, autosave indicator.
13. **Validation** — side-by-side Original vs Current, patient history panel, previous similar tests, critical alert banner, doctor notes.
14. **Amendment** — template-driven, full audit entry on save.
15. **All Results Dashboard** — tabs: All / Pending Validation / Critical / Amended / Cancelled / Released.
16. **Reporting Center** — Daily/Weekly/Monthly/Annual prebuilt + flexible builder (date range, dept, test, doctor, ward, status) with Preview / Download / Print.
17. **Analytics Dashboard** — TAT, revenue, scientist productivity, top tests, rejected samples, critical results, positivity rate, drug-abuse & psychiatric analytics.
18. **Communication Center** — internal chat panel, doctor/ward/nurse notification queues, SMS / Email / WhatsApp tabs.
19. **Critical Alerts** — list + auto-popup hook fired from result entry when value is flagged critical.
20. **Lab Dashboard, Unified Request Center, Lab Billing, Walk-In, Sample Collection, Drug Screen, Culture, SFA, Blood Bank, Patient History, Print Center, Mobile, Config** — swap their tables to `DataTableLab`, ensure every button opens its modal/drawer or navigates, add confirmation toasts, hook into audit log.

## Delivery phases (one PR per phase, in this order)

- **Phase 1 (Foundation):** items 1–2. No visible page changes yet, but unblocks everything.
- **Phase 2 (New pages A):** Specimen Tracking, Microbiology, Histopathology, QC.
- **Phase 3 (New pages B):** Equipment, Inventory, Referral, Research, Audit Trail.
- **Phase 4 (Result workflow):** Result Entry + Validation + Amendment + All Results + Critical Alerts.
- **Phase 5 (Reporting/Analytics/Comms):** Reporting, Analytics, Communication Center.
- **Phase 6 (Sweep):** Dashboard, Request Center, Billing, Walk-In, Sample Collection, Drug Screen, Culture, SFA, Blood Bank, History, Print, Mobile, Config — apply shared table + button/modal audit.

## Technical notes (for reference)

- All data stays frontend-only with Nigerian dummy data and ₦ currency, per project memory.
- Styling uses existing teal/blue/green tokens + DM Sans; no hardcoded colors.
- Exports: `xlsx` for Excel, `jspdf` + `jspdf-autotable` for PDF (will install in Phase 1).
- Drafts/audit/QC failures/CAPA all persisted to `localStorage` under `aro.lab.*` keys.
- Routes added alongside existing `/dashboard/laboratory/*` set; nothing is removed.

## Questions before I start

1. **Phase order OK?** Or do you want me to start with a specific phase (e.g. Phase 4 result workflow first because it's user-facing)?
2. **Scope per turn:** Phase 1 + Phase 2 in one go, then stop for review? Or one phase at a time?
3. **Mount point:** Add new pages to the `/dashboard/laboratory/*` sidebar (LaboratoryCenter) — confirm that's the sidebar you mean by "lab sidebar", not the `/lab/*` set used elsewhere.
