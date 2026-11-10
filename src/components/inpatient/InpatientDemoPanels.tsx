import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { BedDouble, FlaskConical, Pill, ScanLine, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDbTick } from '@/contexts/DatabaseProvider';
import { db } from '@/db/database';
import { notify } from '@/lib/notify';
import { saveLabResults } from '@/lib/api/laboratory';
import { dispensePrescription } from '@/lib/api/prescriptions';
import {
  INPATIENT_DEPOSIT,
  captureInpatientDeposit,
  demoNumber,
  inpatientChart,
  listInpatientAdmissions,
  listUnpaidDeposits,
  registerInpatient,
  releaseImagingReport,
  resetInpatientDemo,
  sendWardOrders,
} from '@/lib/demo/inpatientCase';

const registerSchema = z.object({
  name: z.string().min(2, 'Enter the patient name'),
  sex: z.enum(['Male', 'Female']),
  phone: z.string().min(7, 'Enter a phone number'),
  wardId: z.string().min(1, 'Choose a ward'),
  diagnosis: z.string().min(3, 'Enter the working diagnosis'),
});

type RegisterValues = z.infer<typeof registerSchema>;

const card = 'bg-white border border-slate-200 shadow-md rounded-xl p-5 mb-6';

export function InpatientRegisterCard() {
  useDbTick();
  const wards = db.wards.list();
  const waiting = listUnpaidDeposits();
  const [receipt, setReceipt] = useState<{ hospitalId: string; invoiceId: string; name: string } | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      sex: 'Male',
      phone: '',
      wardId: wards[0]?.id ?? 'WRD-1',
      diagnosis: '',
    },
  });

  const onSubmit = form.handleSubmit(values => {
    const created = registerInpatient(values);
    setReceipt({ hospitalId: created.hospitalId, invoiceId: created.invoiceId, name: created.patientName });
    form.reset({ ...values, name: '', phone: '', diagnosis: '' });
    notify.success('inpatient-register', `${created.patientName} registered. Hand ${created.invoiceId} to the cashier.`);
  });

  const reset = () => {
    if (!window.confirm('Reset the inpatient test cases and restore the cashier seed?')) return;
    resetInpatientDemo();
    setReceipt(null);
    notify.success('inpatient-reset', 'Inpatient test reset. One deposit is waiting at the cashier.');
  };

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Register inpatient
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Creates the chart, an unpaid ₦{INPATIENT_DEPOSIT.toLocaleString()} deposit, and a pending admission. The cashier payment admits the patient.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={reset}>Reset test case</Button>
      </div>
      {waiting.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2">
          Already waiting at the cashier: {waiting.map(row => `${row.patientName} · ${row.hospitalId} · ${row.invoiceId}`).join('; ')}
        </div>
      )}
      {receipt && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm px-3 py-2">
          <div className="font-medium">{receipt.name} is registered.</div>
          <div>Hospital number <span className="font-mono">{receipt.hospitalId}</span></div>
          <div>Invoice for the cashier <span className="font-mono">{receipt.invoiceId}</span></div>
        </div>
      )}
      <form onSubmit={onSubmit} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="inpatient-name">Name</Label>
          <Input id="inpatient-name" {...form.register('name')} />
          {form.formState.errors.name && <p className="text-xs text-rose-600 mt-1">{form.formState.errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="inpatient-sex">Sex</Label>
          <select id="inpatient-sex" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register('sex')}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div>
          <Label htmlFor="inpatient-phone">Phone</Label>
          <Input id="inpatient-phone" {...form.register('phone')} />
          {form.formState.errors.phone && <p className="text-xs text-rose-600 mt-1">{form.formState.errors.phone.message}</p>}
        </div>
        <div>
          <Label htmlFor="inpatient-ward">Ward</Label>
          <select id="inpatient-ward" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register('wardId')}>
            {wards.map(ward => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="inpatient-dx">Diagnosis</Label>
          <Input id="inpatient-dx" {...form.register('diagnosis')} />
          {form.formState.errors.diagnosis && <p className="text-xs text-rose-600 mt-1">{form.formState.errors.diagnosis.message}</p>}
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button type="submit">Register inpatient</Button>
        </div>
      </form>
    </section>
  );
}

export function InpatientDepositCard() {
  useDbTick();
  const deposits = listUnpaidDeposits();
  const [busy, setBusy] = useState<string | null>(null);

  const pay = (invoiceId: string, name: string) => {
    setBusy(invoiceId);
    const result = captureInpatientDeposit(invoiceId);
    setBusy(null);
    if (!result.ok) {
      notify.error('inpatient-pay', result.message);
      return;
    }
    notify.success('inpatient-pay', `${name} deposit captured. The patient is now admitted.`);
  };

  return (
    <section className={card}>
      <h3 className="font-display font-semibold mb-1">Inpatient deposits</h3>
      <p className="text-sm text-muted-foreground mb-3">Capturing the deposit admits the patient onto the next free general bed.</p>
      {deposits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No unpaid inpatient deposit. Register one from Records.</p>
      ) : (
        <ul className="space-y-2">
          {deposits.map(row => (
            <li key={row.invoiceId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <div className="font-medium">{row.patientName}</div>
                <div className="text-xs text-muted-foreground font-mono">{row.hospitalId} · {row.invoiceId} · {row.wardName}</div>
                <div className="text-xs">{row.diagnosis}</div>
              </div>
              <Button size="sm" disabled={busy === row.invoiceId} onClick={() => pay(row.invoiceId, row.patientName)}>
                {busy === row.invoiceId ? 'Capturing…' : `Capture ₦${row.amount.toLocaleString()}`}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function InpatientWardBoard() {
  useDbTick();
  const rows = listInpatientAdmissions();
  const [busy, setBusy] = useState<string | null>(null);

  const send = (admissionId: string, name: string) => {
    setBusy(admissionId);
    const result = sendWardOrders(admissionId);
    setBusy(null);
    if (!result.ok) {
      notify.error('inpatient-orders', result.message);
      return;
    }
    notify.success('inpatient-orders', `${name}: ${result.message}`);
  };

  return (
    <section className={card}>
      <h3 className="font-display font-semibold flex items-center gap-2 mb-1">
        <BedDouble className="h-4 w-4 text-primary" /> Inpatient ward
      </h3>
      <p className="text-sm text-muted-foreground mb-3">One action sends a full blood count, a chest X-ray, and paracetamol after the deposit is paid.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inpatient test case yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(admission => {
            const chart = inpatientChart(admission.id);
            const admitted = admission.status === 'ADMITTED';
            return (
              <li key={admission.id} className="rounded-lg border border-slate-200 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{admission.patientName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{admission.hospitalId} · {admission.wardName ?? 'Ward'} · {admission.bedLabel ?? 'awaiting bed'}</div>
                    <div className="text-sm mt-1">{admission.diagnosis}</div>
                    <div className="text-xs mt-1">{admitted ? 'Admitted' : admission.status === 'PENDING' ? 'Waiting for cashier' : admission.status}</div>
                  </div>
                  <Button size="sm" disabled={!admitted || busy === admission.id} onClick={() => send(admission.id, admission.patientName)}>
                    {busy === admission.id ? 'Sending…' : 'Send FBC, chest X-ray, and paracetamol'}
                  </Button>
                </div>
                {chart && (chart.lab || chart.drug || chart.imaging) && (
                  <dl className="mt-3 grid sm:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-slate-50 px-2 py-2">
                      <dt className="font-medium">Laboratory</dt>
                      <dd>{chart.lab ? (chart.lab.status === 'Validated' ? chart.lab.labMeta?.clinicalNote : chart.lab.status) : '—'}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2 py-2">
                      <dt className="font-medium">Radiology</dt>
                      <dd>{chart.report?.impression ?? chart.imaging?.status ?? '—'}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2 py-2">
                      <dt className="font-medium">Pharmacy</dt>
                      <dd>{chart.drug ? `${chart.drug.items[0]?.name ?? 'Drug'} · ${chart.drug.status}` : '—'}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2 py-2 sm:col-span-3">
                      <dt className="font-medium">Vitals</dt>
                      <dd>{chart.vitals.length ? `${chart.vitals.length} recorded` : 'None yet'}</dd>
                    </div>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function InpatientLabCard() {
  useDbTick();
  const orders = db.orders.list().filter(order => order.kind === 'lab' && order.labMeta?.clinicalNote?.includes('inpatient-demo') && order.status !== 'Validated');
  const [busy, setBusy] = useState<string | null>(null);

  const result = async (orderId: string) => {
    setBusy(orderId);
    try {
      await saveLabResults(demoNumber(orderId), {
        action: 'submit',
        items: [{ requestItemId: 1, values: { result: 'normal' }, comment: 'FBC within normal limits' }],
      });
      notify.success('inpatient-lab', 'Full blood count resulted. The doctor can read it on the ward list.');
    } catch {
      notify.error('inpatient-lab', 'Could not store the result');
    } finally {
      setBusy(null);
    }
  };

  if (orders.length === 0) return null;
  return (
    <section className={card}>
      <h3 className="font-display font-semibold flex items-center gap-2 mb-2">
        <FlaskConical className="h-4 w-4 text-primary" /> Inpatient requests
      </h3>
      <ul className="space-y-2">
        {orders.map(order => {
          const patient = db.patients.get(order.patientId);
          return (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{patient?.name ?? 'Patient'} · Full blood count</div>
                <div className="text-xs font-mono text-muted-foreground">{patient?.hospitalId} · {order.id}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild><Link to="/dashboard/laboratory/requests">Open queue</Link></Button>
                <Button size="sm" disabled={busy === order.id} onClick={() => void result(order.id)}>
                  {busy === order.id ? 'Saving…' : 'Mark resulted'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function InpatientImagingCard() {
  useDbTick();
  const requests = db.imagingRequests.list().filter(row => row.clinicalNotes?.includes('inpatient-demo') && !['REPORTED', 'VERIFIED', 'RELEASED'].includes(row.status));
  const [busy, setBusy] = useState<string | null>(null);

  const report = (id: string, name: string) => {
    setBusy(id);
    const result = releaseImagingReport(id);
    setBusy(null);
    if (!result.ok) {
      notify.error('inpatient-rad', result.message);
      return;
    }
    notify.success('inpatient-rad', `${name}: report released for the doctor.`);
  };

  if (requests.length === 0) return null;
  return (
    <section className={card}>
      <h3 className="font-display font-semibold flex items-center gap-2 mb-2">
        <ScanLine className="h-4 w-4 text-primary" /> Inpatient imaging
      </h3>
      <ul className="space-y-2">
        {requests.map(row => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{row.patientName} · {row.modality} {row.region}</div>
              <div className="text-xs font-mono text-muted-foreground">{row.hospitalId} · {row.status}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild><Link to="/dashboard/radiology/request">Open queue</Link></Button>
              <Button size="sm" disabled={busy === row.id} onClick={() => report(row.id, row.patientName)}>
                {busy === row.id ? 'Reporting…' : 'Release report'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InpatientPharmacyCard() {
  useDbTick();
  const orders = db.orders.list().filter(order => order.kind === 'drug' && order.status === 'Sent' && db.patients.get(order.patientId)?.flags?.includes('inpatient-demo'));
  const [busy, setBusy] = useState<string | null>(null);

  const dispense = async (orderId: string, name: string) => {
    setBusy(orderId);
    try {
      await dispensePrescription(demoNumber(orderId), {});
      notify.success('inpatient-pharm', `${name} dispensed.`);
    } catch {
      notify.error('inpatient-pharm', 'Could not dispense');
    } finally {
      setBusy(null);
    }
  };

  if (orders.length === 0) return null;
  return (
    <section className={card}>
      <h3 className="font-display font-semibold flex items-center gap-2 mb-2">
        <Pill className="h-4 w-4 text-primary" /> Inpatient prescriptions
      </h3>
      <ul className="space-y-2">
        {orders.map(order => {
          const patient = db.patients.get(order.patientId);
          return (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{patient?.name} · {order.items[0]?.name}</div>
                <div className="text-xs font-mono text-muted-foreground">{patient?.hospitalId} · {order.id}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild><Link to="/pharmacy/queue">Open queue</Link></Button>
                <Button size="sm" disabled={busy === order.id} onClick={() => void dispense(order.id, order.items[0]?.name ?? 'Drug')}>
                  {busy === order.id ? 'Dispensing…' : 'Dispense'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
