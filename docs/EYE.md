# Eye Clinic (demonstration)

Frontend-only ophthalmology and optometry workspace. There is no backend. Records stay in this browser and are not written to a hospital server, a diagnostic device, or the cashier.

## Access

1. Open `/login`.
2. Choose **Eye Clinic**.
3. Password: `password`.
4. Email: `eye@gfa-health.demo` (Dr. Adaeze Okonkwo).
5. You land on `/dashboard/eye`.

Doctors, administrators, CMD, and super administrators can also open these routes.

## What is included

- Dashboard with today’s workflow, room status, alerts, and a reset for the sample data.
- Patient list, registration with an optional hospital ID, and a tabbed profile.
- Visual acuity for OD (right), OS (left), and OU, using labelled notations such as 6/6 through no light perception.
- Refraction, including draft and saved results, comparison, and spectacle generation only from a saved subjective or final refraction that has a sphere.
- Eye examination. Sections stay blank until the clinician chooses a finding. A symptom can be flagged for review. It does not create a diagnosis.
- Consultations, ophthalmic history, and a diagnosis catalogue the clinician applies by hand.
- Treatment plans and procedures. A plan item becomes completed only after a procedure is recorded.
- Medication prescriptions with an allergy warning and an unsigned print preview.
- Investigations with typed mock reports, referrals, follow-ups, and education leaflets.
- Spectacle and contact-lens records. Contact-lens values are never copied from a spectacle prescription.
- Appointments, a day and week schedule, rooms, equipment, inventory, and clinical and operational reports.

## Clinical limits

OD is the right eye and OS is the left eye. The demo does not calculate a diagnosis, a medicine, or a spectacle prescription from a symptom, an acuity line, or one intraocular pressure reading. Spectacle and medication print views have no signature and are not legally authorised. Estimated cost is not revenue.

## Data

The store key is `gfa_eye_v1`. **Reset demo data** on the Eye Clinic dashboard restores the sample set. Dental and other departments keep their own data.
