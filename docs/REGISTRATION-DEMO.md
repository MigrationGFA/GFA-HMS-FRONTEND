# Registration demo (browser only)

Password for every demo login is `password`. Nothing is sent to a server. The card lives in this browser under `gfa_registration_desk_v1`.

1. Sign in as `records@gfa-health.demo` and open **Patient Entry** (`/hms/identity`).
2. Start a walk-in. Surname, first name, date of birth, a mobile number, and next of kin are required.
3. On **Registration Charges** the fee is **₦500** (consultation and card fees are ₦0).
4. Choose **Create Record & Card**. The patient stays on this step until Cashier is paid.
5. HMO check: pick Hygeia, NHIA, or Reliance and enter any enrollee number, for example `HYG-123456`. Coverage shows as ACTIVE.
6. Sign in as `cashier@gfa-health.demo` and open **New Patient Cards** (`/dashboard/cashier/cards`). Collect the ₦500 in cash.
7. Return to Records, choose **Check payment**, then continue. Triage, nursing, and the consultation queue stay disabled until the card is paid.
8. Sign in as `nurse@gfa-health.demo` and open **Patient Queues** (`/dashboard/nurse/queues`). The patient appears there after triage. Record vitals, then choose **Doctor** to send them to consultation. Unpaid cards stay off the doctor's start list. Records can send the same paid patient from Patient Entry with **Proceed to Triage** or **Consultation Queue**.
9. Sign in as `doctor@gfa-health.demo` and open **Clinical Overview** (`/dashboard/doctor/clinical`) or **Consultation Workspace** (`/dashboard/doctor/clinical/workspace`). The patient is waiting. Start the visit, write the note, and complete it. The queue and the note stay in this browser (`gfa_consultation_v1`).
10. During the visit, the buttons under the note open dummy lists: drugs such as Paracetamol, tests such as Full Blood Count, and studies such as Chest X-ray. Sending one stores it in this browser (`gfa_clinical_orders_v1`).
11. Sign in as `cashier@gfa-health.demo` and take payment for the prescription, lab request, or imaging request. Pharmacy (`/pharmacy/queue`) can then dispense it. Laboratory and Radiology can collect, result, or report it. Records and Nursing see an admission, referral, or transfer from the same visit.
12. On the same visit, Imaging Request lists a priced study for each scan, including CT brain. Documentation, Timeline, Emergency, Communication, Certificates, Notifications, and Analytics (`/dashboard/doctor/clinical/...`) read this browser (`gfa_doctor_clinical_v1`). Timeline search opens the consultation note. Certificates include sick leave, fitness, excuse from duty, medical report, referral, admission, confidential report, and follow-up.
