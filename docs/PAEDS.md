# Paediatrics (demonstration)

Frontend-only paediatric workspace. There is no backend. Records stay in this browser under `gfa_paeds_v1` and are not written to a hospital server, the cashier, or the hospital-wide admission list.

## Access

1. Open `/login`.
2. Choose **Paediatrics**.
3. Password: `password`.
4. Email: `paeds@gfa-health.demo` (Dr. Funmilayo Adeyemi).
5. You land on `/dashboard/paeds`.

Doctors, nurses, administrators, CMD, and super administrators can also open these routes. The Nurse home path is unchanged. Child and Adolescent Psychiatry remains `cap@gfa-health.demo`.

Inside the workspace, forms can be attributed to the paediatrician, the paediatric nurse, or the department administrator.

## What is included

- Dashboard counts, today’s list, flow stages, growth and immunisation summaries, and alerts from the same store.
- Child registration with a guardian. Birth history is optional.
- Triage and vital signs with paediatric age labels. No adult reference ranges.
- Growth history chart of the child’s own measurements. No percentiles or nutrition diagnosis.
- Developmental and newborn assessments. Unexamined sections stay blank.
- Immunisation rows. A booked visit is not a given dose. Names are demonstration labels, not a national schedule.
- Consultations, diagnoses, referrals, and follow-ups.
- Prescriptions with an optional weight multiplication that the clinician reviews. The product is not a verified dose.
- Investigations with typed results and no invented reference ranges.
- A paediatric demonstration ward. An occupied bed cannot be assigned twice.
- Nursing observations, discharge documentation, and emergency notes without an automated score.
- Services, equipment, and four reports with print and a local CSV.

## Limits

Reset demo data on the dashboard restores the sample children. Growth charts are measurement history only. Immunisation due dates are entered by staff. Estimated service prices are not revenue. Print views have no signature.
