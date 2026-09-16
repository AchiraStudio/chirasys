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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card px-4 py-3 rounded-xl border border-line shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-muted text-body hover:text-heading hover:bg-line transition-colors cursor-pointer"
          title="Kembali ke Menu Laporan"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-base font-bold text-heading tracking-tight flex items-center gap-2">{title}</h1>
          <p className="text-xs text-dim mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        {dateFrom !== undefined && onDateFromChange && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="bg-muted/50 border border-line rounded-lg px-2.5 py-1.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-dim">–</span>
          </>
        )}

        {dateTo !== undefined && onDateToChange && (
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="bg-muted/50 border border-line rounded-lg px-2.5 py-1.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary"
          />
        )}

        {onFetch && (
          <button
            onClick={onFetch}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            Tampilkan
          </button>
        )}

        {onExportCsv && (
          <button
            onClick={onExportCsv}
            className="px-3 py-1.5 bg-muted hover:bg-line text-body hover:text-heading rounded-lg text-xs font-semibold transition-all border border-line flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Download size={13} />
            {exportLabel}
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
