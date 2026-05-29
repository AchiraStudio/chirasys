// src/pages/reports/LaporanPenjualan.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, TrendingUp, ShoppingCart, Tag, DollarSign } from 'lucide-react';
import { getSalesSummary, SalesSummaryRow } from '../../lib/api';

interface Props { onBack: () => void; }

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

export default function LaporanPenjualan({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [data, setData] = useState<SalesSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getSalesSummary('branch_001', dateFrom, dateTo)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totals = data.reduce((acc, r) => ({
    trx: acc.trx + r.transaction_count,
    rev: acc.rev + r.total_revenue,
    disc: acc.disc + r.total_discount,
    profit: acc.profit + r.gross_profit,
  }), { trx: 0, rev: 0, disc: 0, profit: 0 });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Penjualan</h1>
            <p className="text-xs text-slate-500">Ringkasan transaksi harian</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Dari</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" />
          <label className="text-xs text-slate-500 font-medium">Sampai</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" />
          <button onClick={fetchData} className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors">
            Tampilkan
          </button>
          <button 
            onClick={async () => {
              const { save } = await import('@tauri-apps/plugin-dialog');
              const { exportSalesExcel } = await import('../../lib/api');
              try {
                const path = await save({ defaultPath: 'Laporan_Penjualan.xlsx', filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
                if (path) { await exportSalesExcel(path); alert('Berhasil export!'); }
              } catch (e) { alert('Gagal export'); }
            }}
            className="px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors border border-emerald-200"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Transaksi', value: totals.trx.toLocaleString('id-ID'), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', raw: false },
          { label: 'Total Penjualan', value: `Rp ${totals.rev.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', raw: true },
          { label: 'Total Diskon', value: `Rp ${totals.disc.toLocaleString('id-ID')}`, icon: Tag, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', raw: true },
          { label: 'Laba Kotor', value: `Rp ${totals.profit.toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', raw: true },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${c.bg} ${c.color}`}><c.icon size={20} /></div>
            <div><p className="text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? '...' : c.value}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-0.5">{c.label}</p></div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6">Tanggal</th>
                <th className="py-4 px-6 text-right">Transaksi</th>
                <th className="py-4 px-6 text-right">Penjualan</th>
                <th className="py-4 px-6 text-right">Diskon</th>
                <th className="py-4 px-6 text-right">HPP</th>
                <th className="py-4 px-6 text-right">Laba Kotor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Loader2 className="animate-spin text-brand mx-auto" size={28} />
                  <p className="text-xs text-slate-500 mt-2">Memuat data...</p>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-500 text-sm">
                  Tidak ada transaksi pada periode ini.
                </td></tr>
              ) : data.map(r => (
                <tr key={r.period_label} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">{r.period_label}</td>
                  <td className="py-3 px-6 text-right font-mono text-slate-700 dark:text-slate-300">{r.transaction_count}</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-slate-900 dark:text-white">Rp {r.total_revenue.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-6 text-right font-mono text-amber-600">{r.total_discount > 0 ? `-Rp ${r.total_discount.toLocaleString('id-ID')}` : '-'}</td>
                  <td className="py-3 px-6 text-right font-mono text-slate-500">Rp {r.total_cogs.toLocaleString('id-ID')}</td>
                  <td className={`py-3 px-6 text-right font-mono font-bold ${r.gross_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    Rp {r.gross_profit.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && !loading && (
              <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-700 text-sm font-bold">
                <tr>
                  <td className="py-4 px-6 text-slate-900 dark:text-white">TOTAL</td>
                  <td className="py-4 px-6 text-right text-slate-900 dark:text-white">{totals.trx}</td>
                  <td className="py-4 px-6 text-right text-slate-900 dark:text-white">Rp {totals.rev.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-6 text-right text-amber-600">-Rp {totals.disc.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-6 text-right text-slate-500">-</td>
                  <td className="py-4 px-6 text-right text-emerald-600 dark:text-emerald-400">Rp {totals.profit.toLocaleString('id-ID')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
