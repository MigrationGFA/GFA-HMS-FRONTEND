// Typed event bus — writes emit; modules subscribe to react cross-department.
export type DbEvent =
  | 'CHANGED'
  | 'PATIENT_REGISTERED'
  | 'APPOINTMENT_BOOKED'
  | 'VISIT_CREATED'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'CONSULTATION_UNLOCKED'
  | 'ORDER_CREATED'
  | 'LAB_RESULT_READY'
  | 'DRUG_DISPENSED'
  | 'IMAGING_RESULT_READY'
  | 'REFERRAL_CREATED'
  | 'REFERRAL_ACCEPTED'
  | 'ADMISSION_CREATED'
  | 'BED_TRANSFER'
  | 'BED_STATUS_CHANGED'
  | 'DISCHARGE_ORDERED'
  | 'DISCHARGE_COMPLETED'
  | 'VITALS_RECORDED'
  | 'VITALS_CRITICAL'
  | 'MED_ADMINISTERED'
  | 'NURSING_NOTE_ADDED'
  | 'NURSING_TASK_UPDATED'
  | 'SAMPLE_COLLECTED'
  | 'HANDOVER_SUBMITTED'
  | 'INCIDENT_REPORTED'
  | 'CARE_PLAN_UPDATED'
  | 'NURSING_FORM_SAVED'
  | 'WALLET_FUNDED'
  | 'WALLET_PAYMENT'
  | 'REFUND_REQUESTED'
  | 'REFUND_APPROVED'
  | 'REFUND_REJECTED'
  | 'DISCOUNT_REQUESTED'
  | 'DISCOUNT_APPROVED'
  | 'DISCOUNT_REJECTED'
  | 'SHIFT_OPENED'
  | 'SHIFT_CLOSED'
  | 'RAD_REQUEST_CREATED'
  | 'RAD_REQUEST_ACCEPTED'
  | 'RAD_SCHEDULED'
  | 'RAD_IMAGING_DONE'
  | 'RAD_REPORT_SUBMITTED'
  | 'RAD_REPORT_VERIFIED'
  | 'RAD_RESULT_RELEASED'
  | 'RAD_CRITICAL_FINDING'
  | 'ECG_RECORDED'
  | 'ECG_VERIFIED'
  | 'EQUIPMENT_STATUS_CHANGED'
  | 'OPC_VISIT_CREATED'
  | 'OPC_VISIT_UPDATED'
  | 'OPC_ASSESSMENT_SAVED'
  | 'OPC_DIAGNOSIS_ADDED'
  | 'OPC_NOTE_SAVED'
  | 'OPC_RISK_FLAGGED'
  | 'OPC_ADMISSION_REQUESTED'
  | 'OPC_REFERRAL_CREATED'
  | 'OPC_APPT_BOOKED';

type Handler = (payload?: unknown) => void;
const handlers: Partial<Record<DbEvent, Set<Handler>>> = {};

export const on = (event: DbEvent, handler: Handler): (() => void) => {
  if (!handlers[event]) handlers[event] = new Set();
  handlers[event]!.add(handler);
  return () => handlers[event]?.delete(handler);
};

export const emit = (event: DbEvent, payload?: unknown) => {
  handlers[event]?.forEach(h => h(payload));
  if (event !== 'CHANGED') handlers.CHANGED?.forEach(h => h(payload));
};

export const clearHandlers = () => {
  Object.keys(handlers).forEach(k => delete handlers[k as DbEvent]);
};
