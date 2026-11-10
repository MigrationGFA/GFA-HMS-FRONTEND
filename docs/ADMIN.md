# Admin Officer

The Admin Officer home remains the command-center layout at `/dashboard/admin`. Sign in as `admin@gfa-health.demo` (password `password`). CMD and Super Admin can open the same routes. The CMD overview itself is unchanged. Students are not part of this workspace.

## What is stored where

- Invoices, payments, and reversals stay in the existing billing store. Billed, gross collections, refunds, net collections, and outstanding balances are calculated from those records. Discounts are ₦0 because that store has no discount field.
- Departments, the service catalogue, price history, the staff roster, department reports, and administrative issues stay in this browser under `gfa_admin_v1`. Reset is on the admin dashboard.
- Dental, Eye, and Paediatrics counts and stock alerts are read from those departments. They are not copied into a second stock book.
- A price change updates the catalogue for the next invoice created from the admin finance screen. It does not rewrite an invoice that already has an amount. Creating an invoice copies the current catalogue price, and the date filter widens if that invoice falls outside the selected period.
- The admin screen does not mark an invoice paid. Collection stays on the paypoint.

## Routes

- `/dashboard/admin` dashboard
- `/dashboard/admin/departments` and `/dashboard/admin/departments/:id`
- `/dashboard/admin/operations`
- `/dashboard/admin/finance` and `/dashboard/admin/revenue`
- `/dashboard/admin/invoices`
- `/dashboard/admin/services`
- `/dashboard/admin/staff`
- `/dashboard/admin/reports`
- `/dashboard/admin/inventory`
- `/dashboard/admin/settings`

Department heads in Dental, Eye, Paediatrics, Laboratory, Pharmacy, and Nursing can submit a daily report from their home screen. The admin reads it under Department reports. Opening a report does not approve it. A clarification needs a written note.

Admissions and beds, outstanding balances, and price approvals are separate screens from patient flow, revenue, and settings, even though they share a path.

Attendance on the staff screen is demonstration data, not a clock-in feed. Patient flow for departments without a clinic store is also labelled as demonstration activity.
