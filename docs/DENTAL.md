# Dental Department (demonstration)

Frontend-only dental clinic for the GFA Health HMS demo. There is no backend, and records are not sent to a hospital server.

## Access

1. Open `/login`.
2. Choose **Dental Department**.
3. Password: `password`.
4. Email: `dental@gfa-health.demo`.
5. You land on `/dashboard/dental`.

Doctors, administrators, CMD, and super administrators can also open these routes.

Log out from the sidebar. That returns you to the public site; sign in again from `/login`.

## What is included

- Dashboard with today’s appointments, chair status, alerts, and charts.
- Patient directory, registration (including a link to an existing HMS sample patient), and a tabbed profile.
- Interactive FDI odontogram for adult and primary teeth, with surface findings.
- Encounters, multi-item treatment plans, procedures, prescriptions (with allergy warnings and a print preview), investigations, and referrals.
- Appointments (list, day, and week), a chair schedule, and follow-ups.
- Service catalogue and supply inventory.
- Clinical and operational reports, with print and a local CSV download.

## Data

Changes are kept in `localStorage` (`gfa_dental_v1`) so a refresh keeps the demo. **Reset demo data** on the dental dashboard restores the sample set. Other departments are not affected.

Prices and medication entries are illustrative. Prescriptions are not legally authorised and do not include a signature. Estimated treatment value is not collected revenue.
