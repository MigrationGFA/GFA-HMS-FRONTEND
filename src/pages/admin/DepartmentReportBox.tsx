import { FormEvent, useState } from 'react';
import { useAdmin } from '@/contexts/AdminStore';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const CATEGORIES = [
  'Daily departmental activity',
  'Revenue and billing summary',
  'Staffing and attendance',
  'Service delivery and patient volume',
  'Equipment and maintenance',
  'Stock and consumables',
  'Operational challenges',
  'Incidents requiring administrative follow-up',
  'Recommendations and requests',
];

const STATUS_STYLE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Submitted: 'bg-sky-100 text-sky-800',
  'Under Review': 'bg-violet-100 text-violet-800',
  'Needs Clarification': 'bg-amber-100 text-amber-900',
  Reviewed: 'bg-emerald-100 text-emerald-800',
  Closed: 'bg-slate-200 text-slate-700',
};

export function DepartmentReportBox({ department, officer }: { department: string; officer: string }) {
  const admin = useAdmin();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`${department} daily report`);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [summary, setSummary] = useState('');
  const [metrics, setMetrics] = useState('');
  const [challenges, setChallenges] = useState('');
  const [actionsTaken, setActions] = useState('');
  const [supportNeeded, setSupport] = useState('');
  const mine = admin.state.reports.filter((row) => row.department === department);

  const submit = (event: FormEvent, status: 'Draft' | 'Submitted') => {
    event.preventDefault();
    if (!summary.trim()) {
      notify.error('admin', 'Add a short summary before saving the report.');
      return;
    }
    admin.saveReport({
      title: title.trim() || `${department} report`,
      department,
      officer,
      period: admin.today,
      category,
      summary,
      metrics,
      challenges,
      actionsTaken,
      supportNeeded,
      owner: supportNeeded.trim() ? 'Admin Officer' : '',
      status,
    });
    notify.success('admin', status === 'Draft' ? 'Report draft saved in this browser.' : 'Report submitted for admin review.');
    setOpen(false);
    setSummary('');
    setMetrics('');
    setChallenges('');
    setActions('');
    setSupport('');
  };

  return (
    <section className="mb-4 rounded-2xl border border-sky-200 bg-white text-slate-900 shadow-md overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-3 text-white">
        <div>
          <h3 className="font-semibold">Daily report for the Admin Officer</h3>
          <p className="text-xs text-white/85">Write what happened today. Submitting sends it for review. It is not approved until an admin marks it.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOpen((value) => !value)}>{open ? 'Close' : 'Write report'}</Button>
      </div>
      {open && (
        <form className="grid gap-3 p-4" onSubmit={(event) => submit(event, 'Submitted')}>
          <label className="text-sm font-medium text-slate-700">Title
            <Input className="mt-1 bg-white" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Report title" />
          </label>
          <label className="text-sm font-medium text-slate-700">Category
            <select className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm" value={category} aria-label="Category" onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Summary
            <Textarea className="mt-1 bg-white" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What should the admin know from today?" aria-label="Summary" />
          </label>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-slate-700">Key figures
              <Textarea className="mt-1 bg-white" value={metrics} onChange={(event) => setMetrics(event.target.value)} placeholder="Patients seen, waiting, beds, stock" aria-label="Key metrics" />
            </label>
            <label className="text-sm font-medium text-slate-700">Challenges
              <Textarea className="mt-1 bg-white" value={challenges} onChange={(event) => setChallenges(event.target.value)} placeholder="What got in the way" aria-label="Challenges" />
            </label>
            <label className="text-sm font-medium text-slate-700">Actions already taken
              <Textarea className="mt-1 bg-white" value={actionsTaken} onChange={(event) => setActions(event.target.value)} placeholder="What the department already did" aria-label="Actions taken" />
            </label>
            <label className="text-sm font-medium text-slate-700">Support needed
              <Textarea className="mt-1 bg-white" value={supportNeeded} onChange={(event) => setSupport(event.target.value)} placeholder="Decision or help requested" aria-label="Support needed" />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={(event) => submit(event, 'Draft')}>Save draft</Button>
            <Button type="submit">Submit report</Button>
          </div>
        </form>
      )}
      {mine.length > 0 && (
        <ul className="px-4 pb-4 space-y-2">
          {mine.slice(0, 3).map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 border border-sky-100 px-3 py-2 text-sm">
              <span><span className="font-medium">{row.title}</span><span className="text-slate-500"> · {row.period}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[row.status] ?? 'bg-slate-100'}`}>{row.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
