# Changelog

## 2026-11-05

- Doctor clinical pages now use dummy data stored in this browser. Every imaging scan in the consultation popup has a catalog price. Documentation, the note timeline, emergency, messages, certificates, notifications, analytics, and discharge drafts show rows and can be updated without a server. Certificate types include sick leave, fitness for work, excuse from duty, medical report, referral letter, admission recommendation, a confidential report, and a follow-up certificate.

## 2026-11-04

- Consultation actions now use dummy catalogs stored in this browser. A prescription, lab request, imaging request, diagnosis, admission, referral, or transfer made during a visit appears for Cashier and the department that acts on it. Clinical Payments opens the unpaid prescription instead of a blank page. Pharmacy can dispense after payment, Laboratory can collect and validate a result, and Radiology can accept the study and save a report.
- The doctor consultation queue now reads this browser only. A patient Records or Nursing sends to consultation appears on the doctor overview and Consultation Workspace, where the doctor can start the visit, write the note, complete it, and schedule a follow-up. Those screens no longer call the encounter or overview endpoints.
- Patient Entry no longer crashes when switching Walk-In, Online Booking, or Internal Referral, or when searching for a patient.
- The nurse Patient Queue loads in this browser. It lists walk-in patients after triage, including the ₦500 registration just paid at Cashier, instead of crashing on an empty list.
- Walk-in registration uses a ₦500 fee in this browser. HMO eligibility (Hygeia, NHIA, Reliance) confirms locally. Cashier collects the fee on New Patient Cards, and triage stays locked until that payment is marked paid. See `docs/REGISTRATION-DEMO.md`.
- Records overview no longer crashes on login. The offline overview returns real counts from the browser database.
- Added a local inpatient test path. One chart moves from Records to Cashier, Nursing, the doctor, Laboratory, Radiology, and Pharmacy, and it survives refresh. See `docs/INPATIENT-DEMO.md`. Password for the demo logins is `password`.

## 2026-10-27

- Removed the Students screen from the Admin Officer workspace. Admin pages now use coloured summary cards and white panels, and sidebar links such as beds, outstanding balances, and price approvals open a distinct screen. Daily department reports are laid out for reading.
- Added a Paediatrics demonstration workspace at `/dashboard/paeds` for newborns, infants, children, and adolescents. Sign in as `paeds@gfa-health.demo` (password `password`). Records stay in this browser under `gfa_paeds_v1`. See `docs/PAEDS.md`.
- Added an Eye Clinic demonstration workspace at `/dashboard/eye`, including acuity, refraction, examination, spectacles, contact lenses, consultations, and clinic operations. Sign in as `eye@gfa-health.demo` (password `password`). Records stay in this browser under `gfa_eye_v1`. See `docs/EYE.md`.
- Added a Dental Department demonstration workspace at `/dashboard/dental`, including patients, an interactive odontogram, encounters, treatment plans, procedures, prescriptions, investigations, referrals, appointments, follow-ups, services, inventory, and reports.
- Added the demo login `dental@gfa-health.demo` (password `password`). Dental data is stored in this browser under `gfa_dental_v1` and can be reset from the dental dashboard.
- Prevented the public appointment page from crashing when the offline service list does not include an `items` array.
