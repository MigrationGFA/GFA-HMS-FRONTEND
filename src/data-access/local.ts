import { db } from '@/db/database';
import { captureInvoicePayment } from '@/lib/billing-actions';
import type { Repository } from './repository';
import type { Query, Paginated } from './types';

function page<T>(rows: T[], q?: Query): Paginated<T> {
  let items = rows;
  if (q?.search) {
    const s = q.search.toLowerCase();
    items = items.filter(r => JSON.stringify(r).toLowerCase().includes(s));
  }
  const pageSize = q?.pageSize ?? 50;
  const p = q?.page ?? 1;
  const start = (p - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page: p, pageSize };
}

const ok = <T,>(v: T) => Promise.resolve(v);

const requireRow = <T,>(row: T | undefined, label: string): T => {
  if (!row) throw new Error(`${label} not found`);
  return row;
};

export const localRepo: Repository = {
  patients: {
    list: q => ok(page(db.patients.list(), q)),
    get: id => ok(requireRow(db.patients.get(id), `Patient ${id}`)),
    create: input => ok(db.patients.create(input)),
    update: (id, patch) => ok(requireRow(db.patients.update(id, patch), `Patient ${id}`)),
    remove: () => ok(undefined),
  },
  invoices: {
    list: q => ok(page(db.invoices.list(), q)),
    get: id => ok(requireRow(db.invoices.get(id), `Invoice ${id}`)),
    create: input => ok(db.invoices.insert(input as Parameters<typeof db.invoices.insert>[0])),
    update: (id, patch) => ok(requireRow(db.invoices.update(id, patch), `Invoice ${id}`)),
    remove: () => ok(undefined),
    capture: input => ok(captureInvoicePayment(input)),
  },
  payments: {
    list: q => ok(page(db.payments.list(), q)),
    get: id => ok(requireRow(db.payments.list().find(p => p.id === id), `Payment ${id}`)),
    create: input => ok(db.payments.insert(input as Parameters<typeof db.payments.insert>[0])),
    update: (id, patch) => ok(requireRow(db.payments.update(id, patch), `Payment ${id}`)),
    remove: () => ok(undefined),
  },
  orders: {
    list: q => ok(page(db.orders.list(), q)),
    get: id => ok(requireRow(db.orders.get(id), `Order ${id}`)),
    create: input => ok(db.orders.insert(input as Parameters<typeof db.orders.insert>[0])),
    update: (id, patch) => ok(requireRow(db.orders.update(id, patch), `Order ${id}`)),
    remove: () => ok(undefined),
  },
  referrals: {
    list: q => ok(page(db.referrals.list(), q)),
    get: id => ok(requireRow(db.referrals.list().find(r => r.id === id), `Referral ${id}`)),
    create: input => ok(db.referrals.insert(input as Parameters<typeof db.referrals.insert>[0])),
    update: (id, patch) => ok(requireRow(db.referrals.update(id, patch), `Referral ${id}`)),
    remove: () => ok(undefined),
    accept: (id, by) => ok(requireRow(
      db.referrals.update(id, { status: 'ACCEPTED', acceptedBy: by }),
      `Referral ${id}`,
    )),
  },
};
