import { useState, useEffect } from 'react';
import { Loader2, Trophy, Medal } from 'lucide-react';
import { getTopSellingItems, TopItemRow, getCategories, Category } from '../../lib/api';
import { downloadCsv } from '../../lib/exportCsv';
import ReportHeader from '../../components/reports/ReportHeader';
import { getFirstOfMonthDateString, getTodayDateString } from './reportUtils';

import Select from '../../components/ui/Select';
interface Props { onBack: () => void; }

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15 text-amber-500 font-bold" title="Peringkat 1">
        <Trophy size={13} />
      </span>
    );
  }
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-500 dark:text-slate-300 font-bold" title="Peringkat 2">
        <Medal size={13} />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 font-bold" title="Peringkat 3">
        <Medal size={13} />
      </span>
    );
  }
  return <span className="text-xs font-mono text-dim font-bold pl-1.5">{rank + 1}</span>;
}

export default function LaporanItemTerlaris({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(getFirstOfMonthDateString());
  const [dateTo, setDateTo] = useState(getTodayDateString());
  const [data, setData] = useState<TopItemRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getTopSellingItems('branch_001', dateFrom, dateTo, 50)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchData(); 
    getCategories().then(setCategories).catch(console.error);
  }, []);

  const filteredData = data.filter(r => !selectedCategory || r.category_name === selectedCategory);

  const handleExportCsv = () => {
    const headers = ['#', 'Nama Item', 'SKU', 'Kategori', 'Qty Terjual', 'Total Penjualan', 'Total HPP', 'Margin (%)'];
    const rows = filteredData.map((r, i) => [i + 1, r.item_name, r.sku, r.category_name, r.qty_sold, r.total_revenue, r.total_cogs, r.gross_margin.toFixed(1)]);
    downloadCsv('Laporan_Item_Terlaris.csv', headers, rows);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in h-full">
      <ReportHeader
        title="Item Terlaris"
        subtitle="Peringkat produk berdasarkan revenue"
        onBack={onBack}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onFetch={fetchData}
        onExportCsv={handleExportCsv}
      >
        <Select
          value={selectedCategory}
          onChange={v => setSelectedCategory(v)}
          className="bg-card border border-line text-body dark:text-heading text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </Select>
      </ReportHeader>

      <div className="bg-card rounded-xl border border-line shadow-sm flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-line text-xs uppercase text-dim font-semibold sticky top-0">
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
            <tbody className="divide-y divide-line dark:divide-line/60 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="animate-spin text-primary mx-auto mb-2" size={28}/><p className="text-xs text-dim">Memuat data...</p></td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-dim">Tidak ada data pada periode ini.</td></tr>
              ) : filteredData.map((r, i) => {
                const marginColor = r.gross_margin >= 30 ? 'text-success dark:text-success' : r.gross_margin >= 10 ? 'text-warning dark:text-warning' : 'text-danger dark:text-danger';
                return (
                  <tr key={r.sku} className={`hover:bg-muted/30 ${i < 3 ? 'bg-warning-soft/30 dark:bg-warning/5' : ''}`}>
                    <td className="py-3 px-6"><RankBadge rank={i} /></td>
                    <td className="py-3 px-6">
                      <p className="font-bold text-heading">{r.item_name}</p>
                      <p className="text-[11px] font-mono text-dim">{r.sku}</p>
                    </td>
                    <td className="py-3 px-6 text-body">{r.category_name || '-'}</td>
                    <td className="py-3 px-6 text-right font-mono text-heading">{r.qty_sold.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono font-semibold text-heading">Rp {r.total_revenue.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono text-dim">Rp {r.total_cogs.toLocaleString('id-ID')}</td>
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
