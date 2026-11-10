import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdmin } from '@/contexts/AdminStore';
import { useAuth } from '@/contexts/AuthContext';
import { notify } from '@/lib/notify';
import type { ReportStatus } from '@/data/adminData';
import { adminNav } from './nav';
import { Panel, StatCards, tableHead, tableWrap } from './ui';

export function AdminStaff() {
  const admin = useAdmin();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState(params.get('department') ?? 'All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const departments = ['All', ...admin.state.departments.map((row) => row.name)];
  const rows = admin.state.staff.filter((row) => {
    const hay = `${row.name} ${row.id} ${row.role}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase()) && (department === 'All' || row.department === department) && (status === 'All' || row.status === status);
  });
  const slice = rows.slice((page - 1) * 8, page * 8);
  const person = admin.state.staff.find((row) => row.id === selected);
  const onDuty = admin.state.staff.filter((row) => row.status === 'Active' && row.shift !== 'Not assigned').length;
  const leave = admin.state.staff.filter((row) => row.status === 'On leave').length;
  const absent = admin.state.staff.filter((row) => row.status === 'Absent' || row.shift === 'Not assigned').length;
  const byDept = useMemo(() => {
    const map = new Map<string, number>();
    admin.state.staff.forEach((row) => map.set(row.department, (map.get(row.department) ?? 0) + 1));
    return [...map.entries()];
  }, [admin.state.staff]);

  return (
    <DashboardLayout navItems={adminNav} title="Staff and duty rosters">
      <p className="text-sm text-muted-foreground mb-3">Attendance days are demonstration figures. They were not read from a biometric or clock-in system. Payroll is not shown.</p>
      <StatCards items={[
        { label: 'Staff', value: String(admin.state.staff.length), sub: 'Directory in this browser' },
        { label: 'On the roster', value: String(onDuty), sub: 'Demonstration shift, not a clock-in' },
        { label: 'On leave', value: String(leave), sub: 'Unavailable today' },
        { label: 'Gaps', value: String(absent), sub: 'Absent or no shift assigned' },
      ]} />
      <div className="flex flex-wrap gap-2 mb-3">
        <Input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Name, ID, or role" className="max-w-xs" aria-label="Search staff" />
        <select className="h-10 rounded-md border px-2 text-sm" aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="h-10 rounded-md border px-2 text-sm" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Active</option><option>On leave</option><option>Absent</option><option>Inactive</option></select>
      </div>
      <div className={tableWrap}>
        <table className="w-full text-sm">
          <thead className={tableHead}><tr>{['Name', 'Department', 'Role', 'Status', 'Shift', 'Joined', 'Demo attendance', ''].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 font-medium">{row.name}<div className="text-xs text-muted-foreground">{row.id} · {row.phone}</div></td>
                <td className="p-2">{row.department}</td>
                <td className="p-2">{row.role}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{row.shift}</td>
                <td className="p-2">{row.joined}</td>
                <td className="p-2">{row.daysPresent}/{row.daysExpected}</td>
                <td className="p-2"><Button size="sm" variant="outline" onClick={() => setSelected(row.id)}>Assign</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Previous</Button><Button variant="outline" disabled={page * 8 >= rows.length} onClick={() => setPage((n) => n + 1)}>Next</Button></div>
      <Panel className="mt-4 p-4">
        <h3 className="font-semibold mb-2">Staff by department</h3>
        <ul className="text-sm flex flex-wrap gap-2">{byDept.map(([name, count]) => <li key={name} className="rounded-full bg-sky-50 text-sky-900 border border-sky-100 px-3 py-1">{name}: {count}</li>)}</ul>
      </Panel>
      {person && <Assign personId={person.id} onClose={() => setSelected(null)} />}
    </DashboardLayout>
  );
}

function Assign({ personId, onClose }: { personId: string; onClose: () => void }) {
  const admin = useAdmin();
  const person = admin.state.staff.find((row) => row.id === personId);
  const [department, setDepartment] = useState(person?.department ?? '');
  const [shift, setShift] = useState(person?.shift ?? 'Morning · demonstration roster');
  if (!person) return null;
  return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl p-4 w-full max-w-md space-y-2">
        <h3 className="font-semibold">{person.name}</h3>
        <p className="text-xs text-muted-foreground">Phone {person.phone}. This does not change the login role.</p>
        <select className="h-10 w-full rounded-md border px-2 text-sm" aria-label="Assign department" value={department} onChange={(event) => setDepartment(event.target.value)}>{admin.state.departments.map((row) => <option key={row.id}>{row.name}</option>)}</select>
        <Input value={shift} onChange={(event) => setShift(event.target.value)} aria-label="Duty shift" />
        <div className="flex gap-2">
          <Button onClick={() => {
            const result = admin.assignStaff(person.id, department, shift);
            if (!result.ok) notify.error('admin', result.message);
            else { notify.success('admin', 'Assignment saved in this browser.'); onClose(); }
          }}>Save assignment</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

const STATUSES: ReportStatus[] = ['Draft', 'Submitted', 'Under Review', 'Needs Clarification', 'Reviewed', 'Closed'];

const STATUS_STYLE: Record<ReportStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Submitted: 'bg-sky-100 text-sky-800',
  'Under Review': 'bg-violet-100 text-violet-800',
  'Needs Clarification': 'bg-amber-100 text-amber-900',
  Reviewed: 'bg-emerald-100 text-emerald-800',
  Closed: 'bg-slate-200 text-slate-700',
};

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">{label}</div>
      <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{value || 'Not provided'}</p>
    </div>
  );
}

export function AdminReports() {
  const admin = useAdmin();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [department, setDepartment] = useState(params.get('department') ?? 'All');
  const [status, setStatus] = useState(params.get('status') ?? 'All');
  const [category, setCategory] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const categories = ['All', ...new Set(admin.state.reports.map((row) => row.category))];
  const rows = admin.state.reports.filter((row) => (department === 'All' || row.department === department) && (status === 'All' || row.status === status) && (category === 'All' || row.category === category));
  const report = admin.openReport(openId ?? '');
  const count = (value: ReportStatus) => admin.state.reports.filter((row) => row.status === value).length;

  const act = (next: ReportStatus) => {
    if (!report) return;
    const result = admin.setReportStatus(report.id, next, note.trim() ? { at: admin.today, by: user?.name ?? 'Admin Officer', text: note.trim() } : undefined);
    if (!result.ok) notify.error('admin', result.message);
    else { notify.success('admin', `Report is now ${next}.`); setNote(''); }
  };

  return (
    <DashboardLayout navItems={adminNav} title="Department daily reports">
      <StatCards items={[
        { label: 'Submitted', value: String(count('Submitted')), sub: 'Waiting for a first look' },
        { label: 'Under review', value: String(count('Under Review')), sub: 'Being read' },
        { label: 'Needs clarification', value: String(count('Needs Clarification')), sub: 'Sent back to the department' },
        { label: 'Reviewed or closed', value: String(count('Reviewed') + count('Closed')), sub: `${count('Draft')} still in draft` },
      ]} />
      <Panel className="p-4 mb-4">
        <p className="text-sm text-slate-600 mb-3">Open a report to read it. Opening does not approve it. A written note is required before you send a report back for clarification.</p>
        <div className="flex flex-wrap gap-2">
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}><option>All</option>{admin.state.departments.map((row) => <option key={row.id}>{row.name}</option>)}</select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
      </Panel>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 items-start">
        <div className="space-y-3">
          {rows.map((row) => (
            <button key={row.id} type="button" className={`w-full text-left rounded-2xl border bg-white p-4 shadow-sm hover:border-sky-300 ${openId === row.id ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'}`} onClick={() => { setOpenId(row.id); admin.openReport(row.id); }}>
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-slate-900">{row.title}</div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[row.status]}`}>{row.status}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{row.department} · {row.officer} · {row.period}</div>
              <p className="mt-2 text-sm text-slate-700 line-clamp-2">{row.summary}</p>
            </button>
          ))}
          {rows.length === 0 && <Panel className="p-6 text-sm text-slate-500">No reports match these filters.</Panel>}
        </div>
        {report ? (
          <Panel className="p-5 space-y-3 lg:sticky lg:top-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">{report.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{report.department} · {report.category} · {report.period}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[report.status]}`}>{report.status}</span>
            </div>
            <p className="text-sm text-slate-600">Prepared by {report.officer}{report.owner ? ` · Follow-up with ${report.owner}` : ''}</p>
            <ReportField label="Summary" value={report.summary} />
            <ReportField label="Key figures" value={report.metrics} />
            <ReportField label="Challenges" value={report.challenges} />
            <ReportField label="Actions already taken" value={report.actionsTaken} />
            <ReportField label="Support needed" value={report.supportNeeded} />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Comments</div>
              {report.comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
              <ul className="space-y-2">{report.comments.map((comment, index) => <li key={index} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><span className="font-medium">{comment.by}</span> <span className="text-slate-400">{comment.at}</span><div className="mt-1 text-slate-700">{comment.text}</div></li>)}</ul>
            </div>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} aria-label="Review comment" placeholder="Write a note for the department" className="bg-white" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => act('Under Review')}>Mark under review</Button>
              <Button size="sm" variant="outline" onClick={() => act('Needs Clarification')}>Request clarification</Button>
              <Button size="sm" variant="outline" onClick={() => act('Reviewed')}>Mark reviewed</Button>
              <Button size="sm" onClick={() => act('Closed')}>Close</Button>
            </div>
          </Panel>
        ) : (
          <Panel className="p-8 text-sm text-slate-500">Select a daily report to read the summary, figures, and what the department is asking for.</Panel>
        )}
      </div>
    </DashboardLayout>
  );
}
