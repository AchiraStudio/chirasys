// src/pages/reports/LaporanPelanggan.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Crown } from 'lucide-react';
import { getCustomerReport, CustomerReportRow } from '../../lib/api';

interface Props { onBack: () => void; }
const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

const TIER: Record<string, { label: string; color: string; icon?: any }> = {
  regular: { label: 'Regular', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  member:  { label: 'Member',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  vip:     { label: 'VIP',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Crown },
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LaporanPelanggan({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [data, setData] = useState<CustomerReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getCustomerReport('branch_001', dateFrom, dateTo, 50)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Pelanggan</h1>
            <p className="text-xs text-slate-500">Total belanja terbanyak per pelanggan</p>
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
                <th className="py-4 px-6 w-12">#</th>
                <th className="py-4 px-6">Nama Pelanggan</th>
                <th className="py-4 px-6">Tier</th>
                <th className="py-4 px-6 text-right">Transaksi</th>
                <th className="py-4 px-6 text-right">Total Belanja</th>
                <th className="py-4 px-6 text-right">Rata-rata / Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={28}/></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-500">Tidak ada data pada periode ini.</td></tr>
              ) : data.map((r, i) => {
                const tier = TIER[r.customer_tier] || TIER.regular;
                const avg = r.transaction_count > 0 ? r.total_spent / r.transaction_count : 0;
                return (
                  <tr key={`${r.customer_name}-${i}`} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${i < 3 ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}>
                    <td className="py-3 px-6 text-lg">{MEDALS[i] ?? <span className="text-sm font-mono text-slate-500">{i + 1}</span>}</td>
                    <td className="py-3 px-6 font-bold text-slate-900 dark:text-white">{r.customer_name}</td>
                    <td className="py-3 px-6">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${tier.color}`}>{tier.label}</span>
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-slate-700 dark:text-slate-300">{r.transaction_count}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-slate-900 dark:text-white">Rp {r.total_spent.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono text-slate-500">Rp {avg.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
