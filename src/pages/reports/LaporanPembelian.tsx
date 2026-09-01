import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getPurchaseSummary, PurchaseSummaryRow } from '../../lib/api';
import ReportHeader from '../../components/reports/ReportHeader';
import { getFirstOfMonthDateString, getTodayDateString } from './reportUtils';

interface Props { onBack: () => void; }

export default function LaporanPembelian({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(getFirstOfMonthDateString());
  const [dateTo, setDateTo] = useState(getTodayDateString());
  const [data, setData] = useState<PurchaseSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getPurchaseSummary('branch_001', dateFrom, dateTo)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const grandTotal = data.reduce((s, r) => s + r.total_amount, 0);
  const grandPaid = data.reduce((s, r) => s + r.paid_amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      <ReportHeader
        title="Laporan Pembelian"
        subtitle="Ringkasan pembelian per pemasok"
        onBack={onBack}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onFetch={fetchData}
      />

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6">Pemasok</th>
                <th className="py-4 px-6 text-right">Jumlah PO</th>
                <th className="py-4 px-6 text-right">Total Pembelian</th>
                <th className="py-4 px-6 text-right">Sudah Dibayar</th>
                <th className="py-4 px-6 text-right">Sisa Hutang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={28}/></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-slate-500">Tidak ada data pada periode ini.</td></tr>
              ) : data.map(r => (
                <tr key={r.supplier_name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-6 font-bold text-slate-900 dark:text-white">{r.supplier_name}</td>
                  <td className="py-3 px-6 text-right font-mono text-slate-700 dark:text-slate-300">{r.purchase_count}</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-slate-900 dark:text-white">Rp {r.total_amount.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-6 text-right font-mono text-emerald-600">Rp {r.paid_amount.toLocaleString('id-ID')}</td>
                  <td className={`py-3 px-6 text-right font-mono font-bold ${(r.total_amount - r.paid_amount) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                    {(r.total_amount - r.paid_amount) > 0 ? `Rp ${(r.total_amount - r.paid_amount).toLocaleString('id-ID')}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && !loading && (
              <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-700 text-sm font-bold">
                <tr>
                  <td className="py-4 px-6 text-slate-900 dark:text-white">TOTAL</td>
                  <td className="py-4 px-6 text-right text-slate-900 dark:text-white">{data.reduce((s, r) => s + r.purchase_count, 0)}</td>
                  <td className="py-4 px-6 text-right text-slate-900 dark:text-white">Rp {grandTotal.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-6 text-right text-emerald-600">Rp {grandPaid.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-6 text-right text-rose-600">Rp {(grandTotal - grandPaid).toLocaleString('id-ID')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
