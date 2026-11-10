// NursingStore — single source of truth for ward nursing.
// Reads/writes db (admissions, beds, vitals, mar, notes, care plans, tasks,
// observations, intake/output, handovers, incidents, education, forms) and
// listens to cross-module events (doctor orders, pharmacy dispensing).

import { createContext, useCallback, useContext, useEffect } from 'react';
import { db } from '@/db/database';
import { useDbTick } from '@/contexts/DatabaseProvider';
import * as nursing from '@/lib/nursing-actions';
import type { Order } from '@/data-access/types';

type NursingApi = typeof nursing;

const C = createContext<NursingApi | undefined>(undefined);

export const NursingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useDbTick(); // re-render on any db commit

  useEffect(() => {
    // Doctor drug orders → MAR entries
    const off1 = db.on('ORDER_CREATED', (payload) => {
      const { orderId, kind } = (payload ?? {}) as { orderId?: string; kind?: string };
      if (kind === 'drug' && orderId) {
        const order = db.orders.get(orderId) as Order | undefined;
        if (order) nursing.importDrugOrderToMar(order);
      }
    });
    // Pharmacy dispensed → mark MAR ready
    const off2 = db.on('DRUG_DISPENSED', (payload) => {
      const { orderId } = (payload ?? {}) as { orderId?: string };
      if (orderId) nursing.markMarDispensed(orderId);
    });
    return () => { off1(); off2(); };
  }, []);

  return <C.Provider value={nursing}>{children}</C.Provider>;
};

export const useNursing = (): NursingApi => {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useNursing must be used within NursingProvider');
  return ctx;
};
