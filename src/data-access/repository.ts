import type {
  Patient,
  PatientCreate,
  Invoice,
  Payment,
  Order,
  Referral,
  Query,
  Paginated,
  PaymentChannel,
} from './types';

export interface Resource<T, C> {
  list(q?: Query): Promise<Paginated<T>>;
  get(id: string): Promise<T>;
  create(input: C): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface InvoiceResource extends Resource<Invoice, Partial<Invoice>> {
  capture(input: {
    invoiceId: string;
    amount: number;
    channel: PaymentChannel;
    cashier?: string;
    terminal?: string;
    bankRef?: string;
  }): Promise<{ ok: boolean; receipt?: string; message: string }>;
}

export interface Repository {
  patients: Resource<Patient, PatientCreate>;
  invoices: InvoiceResource;
  payments: Resource<Payment, Partial<Payment>>;
  orders: Resource<Order, Partial<Order>>;
  referrals: Resource<Referral, Partial<Referral>> & {
    accept(id: string, by: string): Promise<Referral>;
  };
}
