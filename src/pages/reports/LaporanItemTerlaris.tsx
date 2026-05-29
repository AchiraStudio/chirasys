// src/pages/reports/LaporanItemTerlaris.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getTopSellingItems, TopItemRow } from '../../lib/api';
import { downloadCsv } from '../../lib/exportCsv';

interface Props { onBack: () => void; }
const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

export default function LaporanItemTerlaris({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [data, setData] = useState<TopItemRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getTopSellingItems('branch_001', dateFrom, dateTo, 50)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Item Terlaris</h1>
            <p className="text-xs text-slate-500">Peringkat produk berdasarkan revenue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" />
          <span className="text-xs text-slate-500">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" />
          <button onClick={fetchData} className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors">Tampilkan</button>
          <button 
            onClick={() => {
              const headers = ['#', 'Nama Item', 'SKU', 'Kategori', 'Qty Terjual', 'Total Penjualan', 'Total HPP', 'Margin (%)'];
              const rows = data.map((r, i) => [i + 1, r.item_name, r.sku, r.category_name, r.qty_sold, r.total_revenue, r.total_cogs, r.gross_margin.toFixed(1)]);
              downloadCsv('Laporan_Item_Terlaris.csv', headers, rows);
            }}
            className="px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors border border-emerald-200"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6 w-12">#</th>
                <th className="py-4 px-6">Nama Item</th>
                <th className="py-4 px-6">Kategori</th>
                <th className="py-4 px-6 text-right">Qty Terjual</th>
                <th className="py-4 px-6 text-right">Total Penjualan</th>
                <th className="py-4 px-6 text-right">Total HPP</th>
                <th className="py-4 px-6 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="animate-spin text-brand mx-auto mb-2" size={28}/><p className="text-xs text-slate-500">Memuat data...</p></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-500">Tidak ada data pada periode ini.</td></tr>
              ) : data.map((r, i) => {
                const marginColor = r.gross_margin >= 30 ? 'text-emerald-600 dark:text-emerald-400' : r.gross_margin >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
                return (
                  <tr key={r.sku} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${i < 3 ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}>
                    <td className="py-3 px-6 text-lg">{MEDALS[i] ?? <span className="text-sm font-mono text-slate-500">{i + 1}</span>}</td>
                    <td className="py-3 px-6">
                      <p className="font-bold text-slate-900 dark:text-white">{r.item_name}</p>
                      <p className="text-[11px] font-mono text-slate-500">{r.sku}</p>
                    </td>
                    <td className="py-3 px-6 text-slate-600 dark:text-slate-400">{r.category_name || '-'}</td>
                    <td className="py-3 px-6 text-right font-mono text-slate-700 dark:text-slate-300">{r.qty_sold.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono font-semibold text-slate-900 dark:text-white">Rp {r.total_revenue.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono text-slate-500">Rp {r.total_cogs.toLocaleString('id-ID')}</td>
                    <td className={`py-3 px-6 text-right font-bold tabular-nums ${marginColor}`}>{r.gross_margin.toFixed(1)}%</td>
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
