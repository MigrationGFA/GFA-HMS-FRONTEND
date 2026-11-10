import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Standard KPI card layout: 2 cols on mobile, max 4 from md up (extra cards wrap). */
export const SUMMARY_CARD_GRID_CLASS = 'grid grid-cols-2 md:grid-cols-4 gap-3';

interface SummaryCardGridProps {
  children: ReactNode;
  className?: string;
}

const SummaryCardGrid = ({ children, className }: SummaryCardGridProps) => (
  <div className={cn(SUMMARY_CARD_GRID_CLASS, className)}>{children}</div>
);

export default SummaryCardGrid;
