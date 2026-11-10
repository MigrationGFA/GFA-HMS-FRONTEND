# Radiology, EEG & ECG — End-to-End Wiring Plan (Frontend → Backend → DB)

> **Scope:** Wire the Radiology & ECG/EEG dashboard from the GFA HMS frontend (`fnph-aro`) through the NestJS API (`HMS-BACKEND`) into Postgres (Prisma).  
> **Branch context:** Work lands on `Abdul-Azeez` after merge with `main`.  
> **Product rule:** Dual-mode (`VITE_USE_API` + `src/lib/api/imaging.ts`); local `db` fallback when API off.

---

## Progress log

| Phase | Status | Notes |
|-------|--------|--------|
| **Phase 0** | ✅ **DONE** | Prisma RIS models, permissions, RadiologyModule |
| **Phase 1** | ✅ **DONE** | `imaging.ts` + Live request/queue/dashboard |
| **Phase 2** | ✅ **DONE** | Nursing import + OPC/Doctor create |
| **Phase 3** | ✅ **DONE** | Cashier imaging pay + schedule gate |
| **Phase 4** | ✅ **DONE** | Exam → report → verify → release + critical |
| **Phase 5** | ✅ **DONE** | Shared ECG rules FE+BE (aligned inputs); STEMI/QTc/VT fixtures; Live ECG patient picker; critical ack persistence |
| **Phase 6** | ✅ **DONE** | EEG modality path; equipment/consumable **create + adjust**; forms with `RADIOLOGY_FORMS_*` perms; metrics + Live Analytics/Reports; exam consumable+studyUid |
| **Phase 7** | ✅ **DONE** | EMR/ICU/Doctor consumers (no demo fallback when API on); `IMAGING_RESULT_READY`; pathway Vitest + Playwright route suite |
| **Phase 8** | ✅ **DONE** (scoped) | studyUid deep links, Archive/Print/PACS, Mobile worklist, Live AI assistive shell, in-app Comms/Alerts; real DICOM/AI inference deferred by design |

**Verification (2026-07-27, Phases 5–8 close-out):** `npx tsc --noEmit` ✅ · vitest ECG+radiology+pathway (25) ✅

---

## 0. Maturity

| Layer | Status |
|-------|--------|
| FE Live RIS pages | Dual-mode complete for core + Phase 5–8 surfaces (incl. Reports, History, AI) |
| FE API client | `src/lib/api/imaging.ts` (Phases 0–8) |
| BE Nest radiology | Full routes: results/forms/equipment CRUD/consumables/ECG |
| Prisma | `radiology.prisma` |
| EMR / ICU / Doctor | Live released/critical consumers (empty when API empty — no hardcoded demo) |
| Local fallback | Works when `VITE_USE_API=false` |

---

## 1. Fixes status

| Fix | Status |
|-----|--------|
| F-01 API client | ✅ |
| F-02 Nest controllers | ✅ |
| F-03 Prisma schema | ✅ |
| F-04 Module DI | ✅ |
| F-05 Doctor personId | ✅ |
| F-06 Payment gate | ✅ |
| **F-07 IMAGING_RESULT_READY** | ✅ Done — FE emit on release; BE audit `imaging-result:ready` |
| **F-08 PACS/AI/Mobile** | ✅ Scoped complete — Live PACS/AI/Mobile; real DICOM/AI deferred |
| F-09 EEG via modality | ✅ |
| F-10 Permissions | ✅ (+ `RADIOLOGY_FORMS_READ/CREATE`) |
| F-11 Dual-mode pages | ✅ |
| F-12 UX feedback | ✅ |

---

## 3. Phases 5–8 detail

### Phase 5 — ECG — ✅ DONE

| Task | Done |
|------|------|
| Port critical rules to shared evaluator | ✅ `ecg-rules.ts` (BE) + `ecg-critical-rules.ts` (FE) — aligned `qtc`/`qtcMs`/`stElevation` |
| Wire EcgReporting + Critical Findings | ✅ Live pages + local patient picker |
| Fixture matrix STEMI / QTc>500 / VT / HR extremes | ✅ FE Vitest + BE Jest |
| In-app critical surface + ack | ✅ LiveAlerts (localStorage ack) + LiveComms |

### Phase 6 — EEG / equipment / consumables / forms / analytics — ✅ DONE

| Task | Done |
|------|------|
| EEG reporting via modality + reports | ✅ LiveEegReporting |
| Equipment POST + PATCH; Consumable POST + adjust | ✅ BE + Live UI dialogs |
| Forms list/create + dedicated permissions | ✅ `GET/POST /api/radiology/forms` |
| Metrics + modality utilisation + Reports page | ✅ LiveAnalytics + LiveReports |
| completeImaging stock/hours + studyUid UI | ✅ Exam room consumable + UID fields |

### Phase 7 — EMR / ICU / hardening — ✅ DONE

| Task | Done |
|------|------|
| EMR Radiology Integration live | ✅ `listConsumerImagingResults` |
| ICU Radiology live (no demo when API on) | ✅ |
| Doctor Imaging reports/critical API (no sample inject when API on) | ✅ |
| `IMAGING_RESULT_READY` on release | ✅ |
| Pathway automated tests | ✅ Vitest pathway + Playwright multi-route suite |

### Phase 8 — PACS / AI / Mobile (scoped) — ✅ DONE

| In scope | Done |
|----------|------|
| studyUid storage + Archive dual-mode | ✅ |
| PACS deep-link stub `?studyUid=` | ✅ LivePacsViewer |
| Print Film/CD/PDF stubs on released | ✅ |
| Mobile responsive worklist | ✅ |
| Critical in-app alerts | ✅ |
| AI assistive shell (LiveAiAssistant, no auto-finalize) | ✅ |
| Real DICOM viewport / ML models | Deferred (documented) |

---

## 7. Definition of done

- [x] Prisma RIS models  
- [x] Nest routes + permissions (incl. forms)  
- [x] Dual-mode imaging client + Live pages  
- [x] Nursing/Doctor/OPC import/create  
- [x] Payment gate server-side  
- [x] Report verify/release  
- [x] ECG critical detection + fixtures  
- [x] EEG via modality  
- [x] EMR/ICU show released/critical results  
- [x] `IMAGING_RESULT_READY`  
- [x] Tests + build green; this plan updated  
- [x] Local `db` when API off  
- [x] Phase 8 scoped shells (deep links / print / mobile / AI assistive)

---

## Key files (Phases 5–8)

| Area | Path |
|------|------|
| ECG rules FE | `src/lib/ecg-critical-rules.ts` |
| ECG rules BE | `HMS-BACKEND/.../radiology/ecg-rules.ts` |
| API client | `src/lib/api/imaging.ts` |
| Live pages | `src/pages/radiology/RadiologyWorkflowPages.tsx` |
| EMR | `src/pages/EmrCoreCenter.tsx` → `RadiologyIntegration` |
| ICU | `src/pages/IcuCriticalCareCenter.tsx` → `IcuRadiology` |
| BE controller | `radiology.controller.ts` (`/results`, `/forms`, equipment POST/PATCH, consumable POST/adjust) |
| Pathway tests | `src/lib/radiology-pathway.e2e.test.ts`, `e2e/radiology-pathway.spec.ts` |

---

*Phases 0–8 marked complete 2026-07-27 (Phase 8 = scoped product deliverables, not vendor DICOM/AI).*
