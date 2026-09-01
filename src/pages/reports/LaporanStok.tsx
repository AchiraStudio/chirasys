import { useState, useEffect } from 'react';
import { Search, Loader2, Package, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { getStockValuation, StockValuationRow, exportStockExcel, getCategories, Category } from '../../lib/api';
import { downloadCsv } from '../../lib/exportCsv';
import { save } from '@tauri-apps/plugin-dialog';
import ReportHeader from '../../components/reports/ReportHeader';

interface Props { onBack: () => void; }

export default function LaporanStok({ onBack }: Props) {
  const [data, setData] = useState<StockValuationRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getStockValuation('branch_001')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchData(); 
    getCategories().then(setCategories).catch(console.error);
  }, []);

  const handleExportExcel = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        defaultPath: 'Laporan_Stok.xlsx',
      });
      if (filePath) {
        setLoading(true);
        await exportStockExcel(filePath);
        alert('Data stok berhasil diekspor ke Excel!');
      }
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor data: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['#', 'Nama Item', 'SKU', 'Kategori', 'Satuan', 'Qty Saat Ini', 'HPP Rata-rata', 'Total Nilai'];
    const rows = filtered.map((r, i) => [i + 1, r.item_name, r.sku, r.category_name || '-', r.unit_name || '-', r.current_qty, r.avg_hpp, r.total_value]);
    downloadCsv('Laporan_Stok.csv', headers, rows);
  };

  const filtered = data.filter(r => {
    const matchesSearch = r.item_name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCategory || r.category_name === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const grandTotal = filtered.reduce((s, r) => s + r.total_value, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      <ReportHeader
        title="Valuasi Stok"
        subtitle="Nilai inventaris berdasarkan HPP rata-rata"
        onBack={onBack}
        onExportCsv={handleExportCsv}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari item..."
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} />
            Export Excel
          </button>

          <button
            onClick={fetchData}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </ReportHeader>

      {/* Total Value Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <p className="text-amber-100 text-sm font-medium">Total Nilai Inventaris</p>
          <p className="text-3xl font-extrabold mt-1">Rp {grandTotal.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white/20 p-4 rounded-2xl"><Package size={32}/></div>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6">Kategori</th>
                <th className="py-4 px-6">Satuan</th>
                <th className="py-4 px-6 text-right">Stok</th>
                <th className="py-4 px-6 text-right">HPP Rata-rata</th>
                <th className="py-4 px-6 text-right">Nilai Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={28}/></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-500">Tidak ada data stok.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.sku} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-6 font-bold text-slate-900 dark:text-white">{r.item_name}</td>
                  <td className="py-3 px-6 font-mono text-xs text-slate-500">{r.sku}</td>
                  <td className="py-3 px-6 text-slate-600 dark:text-slate-400">{r.category_name || '-'}</td>
                  <td className="py-3 px-6 text-slate-600 dark:text-slate-400">{r.unit_name || '-'}</td>
                  <td className="py-3 px-6 text-right font-mono font-bold text-slate-900 dark:text-white">{r.current_qty.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-6 text-right font-mono text-slate-600 dark:text-slate-400">Rp {r.avg_hpp.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-6 text-right font-mono font-bold text-amber-600 dark:text-amber-400">Rp {r.total_value.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
