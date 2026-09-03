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
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 shrink-0">
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-brand shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 text-brand font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
}
