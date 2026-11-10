# Inpatient local test

One inpatient stays in this browser. Records creates the chart, the cashier deposit admits the patient, and nursing, the doctor, laboratory, radiology, and pharmacy work on that same chart. Nothing is sent to a server.

Password for every login is `password`.

| Step | Login | Where | What to do |
| --- | --- | --- | --- |
| 1 | `records@gfa-health.demo` | `/dashboard/records` | The overview loads with counts. Register an inpatient, or use the seed already waiting at the cashier. Note the hospital number and invoice number. |
| 2 | `cashier@gfa-health.demo` | `/dashboard/cashier` | Capture the unpaid deposit. That admits the patient onto the next free general bed. |
| 3 | `nurse@gfa-health.demo` | `/dashboard/nurse` | The admitted patient is on the ward. Record vitals. They are stored with the admission. |
| 4 | `doctor@gfa-health.demo` | `/dashboard/doctor/clinical` | The same patient is on the inpatient ward list. Send the full blood count, chest X-ray, and paracetamol together. |
| 5 | `lab@gfa-health.demo` | `/dashboard/laboratory` | Mark the full blood count resulted. The doctor's ward list shows the result. |
| 6 | `radiology@gfa-health.demo` | `/dashboard/radiology` | Release the chest X-ray report. The same request is also on `/dashboard/radiology/request`. |
| 7 | `pharmacist@gfa-health.demo` | `/pharmacy` | Dispense the paracetamol. The prescription queue is `/pharmacy/queue`. |

Refresh the browser at any step. The case remains in local storage.

**Reset test case** on the Records overview removes only these inpatient demo rows and puts Chinedu Okeke back at the cashier with an unpaid deposit. The rest of the hospital seed is left in place.

The deposit is ₦20,000. Orders are added to that invoice only after it is paid, and they are covered by the deposit.
