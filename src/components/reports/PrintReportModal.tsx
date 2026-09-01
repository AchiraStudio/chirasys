import React, { useRef } from 'react';
import { Printer } from 'lucide-react';
import Modal from '../ui/Modal';
import { useAuthStore } from '../../store/AuthStore';

interface PrintColumn {
  header: string;
  accessor: (row: any, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  periodLabel?: string;
  filterDetails?: Array<{ label: string; value: string }>;
  columns: PrintColumn[];
  data: any[];
  summaryItems?: Array<{ label: string; value: string | number; isHighlight?: boolean }>;
}

export default function PrintReportModal({
  isOpen,
  onClose,
  title,
  subtitle = 'Dokumen resmi siap cetak (Format A4 / PDF)',
  periodLabel,
  filterDetails,
  columns,
  data,
  summaryItems,
}: PrintReportModalProps) {
  const { user } = useAuthStore();
  const printContentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Pratinjau Cetak Laporan"
      subtitle={subtitle}
      icon={Printer}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            Total {data.length} baris data tercakup
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl font-bold text-xs shadow-md shadow-brand/20 flex items-center gap-2"
            >
              <Printer size={15} /> Cetak Dokumen (Print)
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Printable Paper Card */}
        <div 
          ref={printContentRef}
          className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200 shadow-sm print:border-0 print:p-0 print:shadow-none font-sans text-xs"
        >
          {/* Company & Document Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  CHIRASYS APOTEK & POS
                </h1>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Sistem Informasi Farmasi & Manajemen Penjualan Retail
                </p>
                <p className="text-[10px] text-slate-400">
                  Cabang: {user?.branch_id || 'Pusat (Branch 001)'}
                </p>
              </div>

              <div className="text-right">
                <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                  {title}
                </h2>
                {periodLabel && (
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    Periode: {periodLabel}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Dicetak: {currentDate}
                </p>
                <p className="text-[10px] text-slate-400">
                  Oleh: {user?.name || user?.username || 'Administrator'}
                </p>
              </div>
            </div>

            {/* Filter tags applied */}
            {filterDetails && filterDetails.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                {filterDetails.map((f, i) => (
                  <div key={i} className="text-slate-600">
                    <strong className="text-slate-900">{f.label}:</strong> {f.value}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[11px] font-bold text-slate-900 uppercase">
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      style={{ width: col.width }}
                      className={`py-2 px-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-8 text-center text-slate-400">
                      Tidak ada data yang tersedia pada periode ini.
                    </td>
                  </tr>
                ) : (
                  data.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50">
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          className={`py-2 px-2.5 text-slate-800 text-[11px] ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                        >
                          {col.accessor(row, rowIdx)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Box */}
          {summaryItems && summaryItems.length > 0 && (
            <div className="mt-6 pt-4 border-t-2 border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {summaryItems.map((item, idx) => (
                  <div key={idx} className={item.isHighlight ? 'font-bold' : ''}>
                    <div className="text-[10px] font-bold uppercase text-slate-500">{item.label}</div>
                    <div className={`text-sm mt-0.5 ${item.isHighlight ? 'text-slate-900 font-extrabold' : 'text-slate-800 font-bold'}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatures Section */}
          <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-3 text-center text-xs">
            <div>
              <p className="font-semibold text-slate-500">Dibuat Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 underline">({user?.name || user?.username || 'Kasir / Staff'})</p>
              <p className="text-[10px] text-slate-400">Kasir / Operator</p>
            </div>

            <div>
              <p className="font-semibold text-slate-500">Diperiksa Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 underline">( ........................................ )</p>
              <p className="text-[10px] text-slate-400">Supervisor / Finance</p>
            </div>

            <div>
              <p className="font-semibold text-slate-500">Disetujui Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 underline">( ........................................ )</p>
              <p className="text-[10px] text-slate-400">Apoteker / Pemilik Toko</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
