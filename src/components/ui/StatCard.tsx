import React from 'react';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

export interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  /* e.g. "+12.5%" — renders a trend pill when provided */
  trend?: string;
  trendDirection?: 'up' | 'down';
  trendPositive?: boolean;
  hint?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection = 'up',
  trendPositive = true,
  hint,
  className = '',
}: StatCardProps) {
  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;
  return (
    <div
      className={`bg-card border border-line rounded-xl p-4 transition-colors ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-body min-w-0">
          {Icon && <Icon size={15} className="shrink-0 text-dim" />}
          <span className="truncate">{label}</span>
        </span>
        {trend && (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              trendPositive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
            }`}
          >
            {trend}
            <TrendIcon size={10} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-heading tnum">{value}</span>
        {hint && <span className="text-[11px] text-dim truncate">{hint}</span>}
      </div>
    </div>
  );
}
