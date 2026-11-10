import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repo } from './index';
import { useDbTick } from '@/contexts/DatabaseProvider';
import type { PatientCreate, Query } from './types';

// Local mode: include db tick in the key so writes refetch instantly.
// Http mode (later): the tick is constant; normal network caching applies.
export const usePatients = (q?: Query) => {
  const tick = useDbTick();
  return useQuery({ queryKey: ['patients', q, tick], queryFn: () => repo.patients.list(q) });
};

export const usePatient = (id?: string) => {
  const tick = useDbTick();
  return useQuery({
    queryKey: ['patient', id, tick],
    queryFn: () => repo.patients.get(id!),
    enabled: !!id,
  });
};

export const useCreatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientCreate) => repo.patients.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
};

export const useReferrals = (dept?: string) => {
  const tick = useDbTick();
  return useQuery({
    queryKey: ['referrals', dept, tick],
    queryFn: async () => (await repo.referrals.list()).items.filter(r => !dept || r.toDept === dept),
  });
};

export const useInvoices = (q?: Query) => {
  const tick = useDbTick();
  return useQuery({ queryKey: ['invoices', q, tick], queryFn: () => repo.invoices.list(q) });
};

export const useCapturePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: repo.invoices.capture,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};
