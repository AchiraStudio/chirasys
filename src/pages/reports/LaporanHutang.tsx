// src/pages/reports/LaporanHutang.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { getOutstandingPayables, OutstandingPayableRow } from '../../lib/api';

interface Props { onBack: () => void; }

export default function LaporanHutang({ onBack }: Props) {
  const [data, setData] = useState<OutstandingPayableRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getOutstandingPayables('branch_001')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalBalance = data.reduce((s, r) => s + r.balance, 0);
  const overdue = data.filter(r => {
    const days = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return days > 30;
  }).length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hutang Dagang</h1>
            <p className="text-xs text-slate-500">Tagihan belum lunas ke pemasok</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Hutang</p>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">Rp {totalBalance.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Jumlah Invoice</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{data.length}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${overdue > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40' : 'bg-white dark:bg-[#0B0F19] border-slate-200 dark:border-slate-800'}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Lewat 30 Hari</p>
          <p className={`text-2xl font-extrabold ${overdue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{overdue}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6">Pemasok</th>
                <th className="py-4 px-6">No. Invoice</th>
                <th className="py-4 px-6 text-right">Total</th>
                <th className="py-4 px-6 text-right">Sudah Bayar</th>
                <th className="py-4 px-6 text-right">Sisa</th>
                <th className="py-4 px-6">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={28}/></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-emerald-600">✓ Tidak ada hutang yang belum dibayar.</td></tr>
              ) : data.map(r => {
                const daysOld = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24));
                const isOld = daysOld > 30;
                return (
                  <tr key={r.purchase_id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isOld ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''}`}>
                    <td className="py-3 px-6 font-bold text-slate-900 dark:text-white">{r.supplier_name}</td>
                    <td className="py-3 px-6 font-mono text-xs text-slate-500">{r.invoice_no || 'N/A'}</td>
                    <td className="py-3 px-6 text-right font-mono text-slate-700 dark:text-slate-300">Rp {r.total_amount.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono text-emerald-600">Rp {r.paid_amount.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-rose-600 dark:text-rose-400">Rp {r.balance.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1">
                        {isOld && <AlertTriangle size={12} className="text-amber-500" />}
                        <span className={`text-xs ${isOld ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500'}`}>
                          {new Date(r.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {data.length > 0 && !loading && (
              <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-700 text-sm font-bold">
                <tr>
                  <td className="py-4 px-6 text-slate-900 dark:text-white" colSpan={4}>TOTAL HUTANG</td>
                  <td className="py-4 px-6 text-right text-rose-600 dark:text-rose-400">Rp {totalBalance.toLocaleString('id-ID')}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
