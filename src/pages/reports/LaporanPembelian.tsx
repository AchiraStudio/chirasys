// src/pages/reports/LaporanPembelian.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getPurchaseSummary, PurchaseSummaryRow } from '../../lib/api';

interface Props { onBack: () => void; }
const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

export default function LaporanPembelian({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Pembelian</h1>
            <p className="text-xs text-slate-500">Ringkasan pembelian per pemasok</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" />
          <span className="text-xs text-slate-500">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" />
          <button onClick={fetchData} className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors">Tampilkan</button>
        </div>
      </div>

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
