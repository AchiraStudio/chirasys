import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ icon: Icon, title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-heading">{title}</h1>
          {subtitle && <p className="truncate text-xs text-dim">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
