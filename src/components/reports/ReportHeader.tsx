// src/components/reports/ReportHeader.tsx
import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (val: string) => void;
  onDateToChange?: (val: string) => void;
  onFetch?: () => void;
  onExportCsv?: () => void;
  exportLabel?: string;
  children?: React.ReactNode;
}

export default function ReportHeader({
  title,
  subtitle,
  onBack,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onFetch,
  onExportCsv,
  exportLabel = 'Export CSV',
  children,
}: ReportHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          title="Kembali"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        {dateFrom !== undefined && onDateFromChange && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="text-xs text-slate-500">–</span>
          </>
        )}

        {dateTo !== undefined && onDateToChange && (
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
          />
        )}

        {onFetch && (
          <button
            onClick={onFetch}
            className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors"
          >
            Tampilkan
          </button>
        )}

        {onExportCsv && (
          <button
            onClick={onExportCsv}
            className="px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5"
          >
            <Download size={14} />
            {exportLabel}
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
