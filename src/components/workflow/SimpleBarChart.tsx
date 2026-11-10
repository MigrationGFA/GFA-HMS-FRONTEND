import { formatCurrency } from '@/data/dummyData';

interface Point { label: string; amount: number; }

const SimpleBarChart = ({ data, height = 180 }: { data: Point[]; height?: number }) => {
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map(d => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
              style={{ height: `${(d.amount / max) * (height - 30)}px`, minHeight: 4 }}
              title={formatCurrency(d.amount)}
            />
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleBarChart;
