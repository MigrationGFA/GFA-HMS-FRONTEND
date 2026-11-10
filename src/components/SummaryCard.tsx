import { LucideIcon } from 'lucide-react';
import { formatSummaryValue } from '@/lib/format-summary-value';

type Tone = 'blue' | 'teal' | 'green' | 'amber' | 'purple' | 'indigo' | 'rose';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  tone?: Tone;
  /** Use compact notation (e.g. 30K) for values ≥ 10,000 */
  compact?: boolean;
}

const toneMap: Record<Tone, { bg: string; iconBg: string; iconColor: string; ring: string }> = {
  blue:   { bg: 'bg-gradient-blue',   iconBg: 'bg-white/70', iconColor: 'text-[hsl(209_79%_45%)]',  ring: 'ring-[hsl(209_79%_70%)]/40' },
  teal:   { bg: 'bg-gradient-teal',   iconBg: 'bg-white/70', iconColor: 'text-[hsl(180_100%_28%)]', ring: 'ring-[hsl(180_70%_60%)]/40' },
  green:  { bg: 'bg-gradient-green',  iconBg: 'bg-white/70', iconColor: 'text-[hsl(145_63%_35%)]',  ring: 'ring-[hsl(145_55%_60%)]/40' },
  amber:  { bg: 'bg-gradient-amber',  iconBg: 'bg-white/70', iconColor: 'text-[hsl(30_85%_42%)]',   ring: 'ring-[hsl(36_90%_60%)]/40' },
  purple: { bg: 'bg-gradient-purple', iconBg: 'bg-white/70', iconColor: 'text-[hsl(250_73%_55%)]',  ring: 'ring-[hsl(250_73%_70%)]/40' },
  indigo: { bg: 'bg-gradient-indigo', iconBg: 'bg-white/70', iconColor: 'text-[hsl(232_85%_60%)]',  ring: 'ring-[hsl(232_85%_72%)]/40' },
  rose:   { bg: 'bg-gradient-rose',   iconBg: 'bg-white/70', iconColor: 'text-[hsl(6_78%_48%)]',    ring: 'ring-[hsl(6_78%_70%)]/40' },
};

let toneCursor = 0;
const tonePalette: Tone[] = ['blue', 'green', 'amber', 'purple', 'teal', 'indigo', 'rose'];
const nextTone = (): Tone => {
  const t = tonePalette[toneCursor % tonePalette.length];
  toneCursor++;
  return t;
};

const SummaryCard = ({ title, value, subtitle, icon: Icon, trend, tone, compact }: SummaryCardProps) => {
  const t = toneMap[(tone && tone in toneMap ? tone : undefined) ?? nextTone()];
  const displayValue = formatSummaryValue(value, { compact });
  const isLong = displayValue.length > 8;

  return (
    <div className={`summary-card ${t.bg} ring-1 ${t.ring} flex items-start gap-3 relative overflow-hidden min-h-[5.5rem]`}>
      <div className={`rounded-xl ${t.iconBg} p-2.5 sm:p-3 backdrop-blur-sm shadow-sm shrink-0`}>
        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${t.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-[10px] sm:text-xs font-medium text-foreground/70 uppercase tracking-wide leading-snug">{title}</p>
        <p
          className={`font-bold font-display text-foreground mt-0.5 tabular-nums leading-tight break-words ${
            isLong ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'
          }`}
          title={displayValue}
        >
          {displayValue}
        </p>
        {subtitle && (
          <p className={`text-[10px] sm:text-xs mt-1 font-medium leading-snug ${trend === 'up' ? 'text-emerald-700' : trend === 'down' ? 'text-red-700' : 'text-foreground/60'}`}>
            {trend === 'up' && '▲ '}{trend === 'down' && '▼ '}{subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
