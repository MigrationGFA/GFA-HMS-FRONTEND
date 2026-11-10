import type { ReactNode } from 'react';

const TONES = [
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-green-600',
  'from-amber-400 to-orange-500',
  'from-violet-500 to-purple-600',
  'from-teal-500 to-cyan-600',
  'from-rose-500 to-red-600',
];

export function StatCards({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-5">
      {items.map((card, index) => (
        <div key={card.label} className={`rounded-2xl p-4 bg-gradient-to-br ${TONES[index % TONES.length]} text-white shadow-md`}>
          <div className="text-xs uppercase tracking-wider opacity-90">{card.label}</div>
          <div className="mt-2 text-2xl font-bold font-display leading-tight">{card.value}</div>
          {card.sub && <div className="text-[11px] opacity-90 mt-1 leading-snug">{card.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-md ${className}`}>{children}</div>;
}

export const tableWrap = 'overflow-x-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-md';
export const tableHead = 'bg-sky-50 text-slate-600 text-left';
