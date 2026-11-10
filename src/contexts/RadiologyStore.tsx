// RadiologyStore — single source of truth for the Radiology & ECG (RIS) module.
// Reads/writes db (imagingRequests, radiologyReports, ecgStudies, radEquipment,
// radConsumables, radForms) and listens to cross-module events:
//   ORDER_CREATED (kind:'imaging')  → import doctor imaging order into the RIS
//   INVOICE_PAID                    → flip the matching imaging request to PAID

import { createContext, useContext, useEffect } from 'react';
import { db } from '@/db/database';
import { useDbTick } from '@/contexts/DatabaseProvider';
import * as radiology from '@/lib/radiology-actions';
import type { Order } from '@/data-access/types';
import { isImagingApiEnabled } from '@/lib/api/imaging';

type RadiologyApi = typeof radiology;

const C = createContext<RadiologyApi | undefined>(undefined);

export const RadiologyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useDbTick();

  useEffect(() => {
    // When live API is on, nursing/billing mutate Postgres directly — skip local db mirrors.
    if (isImagingApiEnabled()) return;

    const off1 = db.on('ORDER_CREATED', (payload) => {
      const { orderId, kind } = (payload ?? {}) as { orderId?: string; kind?: string };
      if (kind === 'imaging' && orderId) {
        const order = db.orders.get(orderId) as Order | undefined;
        if (order) radiology.importImagingOrder(order);
      }
    });
    const off2 = db.on('INVOICE_PAID', (payload) => {
      const { invoiceId } = (payload ?? {}) as { invoiceId?: string };
      if (invoiceId) radiology.onInvoicePaidForRad(invoiceId);
    });
    return () => { off1(); off2(); };
  }, []);

  return <C.Provider value={radiology}>{children}</C.Provider>;
};

export const useRadiology = (): RadiologyApi => {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useRadiology must be used within RadiologyProvider');
  return ctx;
};
