import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

export function Spinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-primary ${className}`} />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-12 text-center ${className}`}>
      {Icon && (
        <div className="mb-1 flex size-12 items-center justify-center rounded-xl bg-muted text-dim">
          <Icon size={24} />
        </div>
      )}
      <p className="text-sm font-semibold text-heading">{title}</p>
      {description && <p className="max-w-xs text-xs text-dim">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
