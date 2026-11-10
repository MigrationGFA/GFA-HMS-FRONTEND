import type { WalletAccount, WalletTxn, CashierShift } from '@/data-access/types';
import { seedPatients } from './seed';

const iso = (d: string) => (d.includes('T') ? d : `${d.replace(' ', 'T')}:00.000Z`);

// Give the first two seed patients funded wallets (admission/long-stay deposits).
const walletable = seedPatients.slice(0, 2);
export const seedWallets: WalletAccount[] = walletable.map((p, i) => ({
  id: `WAL-${3001 + i}`,
  patientId: p.id,
  patientName: p.name,
  hospitalId: p.hospitalId,
  balance: i === 0 ? 25000 : 8000,
  createdAt: iso('2026-06-20 09:00'),
  updatedAt: iso('2026-06-20 09:00'),
}));

export const seedWalletTxns: WalletTxn[] = seedWallets.map((w, i) => ({
  id: `WTX-${4001 + i}`,
  walletId: w.id,
  patientId: w.patientId,
  kind: 'DEPOSIT',
  amount: w.balance,
  balanceAfter: w.balance,
  method: 'Cash',
  ref: `DEP-${4001 + i}`,
  note: 'Admission deposit',
  by: 'Hafsat Bello',
  at: w.createdAt,
}));

// One open shift so the cashier desk is live on first load.
export const seedCashierShifts: CashierShift[] = [
  {
    id: 'SHF-5001',
    cashier: 'Hafsat Bello',
    openingFloat: 20000,
    openedAt: iso('2026-06-28 07:30'),
    status: 'OPEN',
    totals: { cash: 0, pos: 0, transfer: 0, online: 0, wallet: 0, nhia: 0, hmo: 0 },
    refundsTotal: 0,
    expectedCash: 20000,
  },
];
