import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: number | string | null;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  rightAction?: React.ReactNode;
}

export default function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  rightAction,
}: TabBarProps<T>) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 shrink-0 max-w-full">
      <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-line overflow-x-auto max-w-full custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-dim hover:text-heading'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-soft text-primary font-bold tnum">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {rightAction && <div className="shrink-0">{rightAction}</div>}
    </div>
  );
}
