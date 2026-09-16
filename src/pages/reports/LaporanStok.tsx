import { useState, useEffect } from 'react';
import { Search, Loader2, Package, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { getStockValuation, StockValuationRow, exportStockExcel, getCategories, Category } from '../../lib/api';
import { downloadCsv } from '../../lib/exportCsv';
import { save } from '@tauri-apps/plugin-dialog';
import ReportHeader from '../../components/reports/ReportHeader';

import { toast } from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
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
        toast.error('Data stok berhasil diekspor ke Excel!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengekspor data: ' + e);
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
    <div className="flex flex-col gap-4 animate-fade-in h-full">
      <ReportHeader
        title="Valuasi Stok"
        subtitle="Nilai inventaris berdasarkan HPP rata-rata berjalan"
        onBack={onBack}
        onExportCsv={handleExportCsv}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari item atau SKU..."
              className="pl-8 pr-3 py-1.5 bg-muted/50 border border-line rounded-lg text-xs text-heading outline-none focus:ring-1 focus:ring-primary w-44"
            />
          </div>

          <Select
            value={selectedCategory}
            onChange={v => setSelectedCategory(v)}
            className="bg-muted/50 border border-line text-heading text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <FileSpreadsheet size={13} />
            Export Excel
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 bg-muted text-body hover:text-heading hover:bg-line rounded-lg text-xs transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </ReportHeader>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-card px-4 py-3 rounded-xl border border-line flex flex-col justify-between">
          <div className="flex items-center justify-between text-dim">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Nilai Inventaris</span>
            <Package size={14} className="text-primary" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-heading">
              Rp {grandTotal.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="text-[10px] text-dim font-medium mt-0.5">
            Berdasarkan HPP rata-rata berjalan
          </div>
        </div>

        <div className="bg-card px-4 py-3 rounded-xl border border-line flex flex-col justify-between">
          <div className="flex items-center justify-between text-dim">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Jumlah SKU Produk</span>
            <Package size={14} className="text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-heading">
              {filtered.length.toLocaleString('id-ID')} Produk
            </span>
          </div>
          <div className="text-[10px] text-dim font-medium mt-0.5">
            {selectedCategory ? `Kategori: ${selectedCategory}` : 'Semua kategori'}
          </div>
        </div>

        <div className="bg-card px-4 py-3 rounded-xl border border-line flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-dim">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Unit Fisik</span>
            <Package size={14} className="text-blue-500" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-heading">
              {filtered.reduce((s, r) => s + r.current_qty, 0).toLocaleString('id-ID')} Unit
            </span>
          </div>
          <div className="text-[10px] text-dim font-medium mt-0.5">
            Total kuantitas seluruh stok
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-line shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-line text-xs uppercase text-dim font-semibold sticky top-0">
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
            <tbody className="divide-y divide-line dark:divide-line/60 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={28}/></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-dim">Tidak ada data stok.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.sku} className="hover:bg-muted/30">
                  <td className="py-3 px-6 font-bold text-heading">{r.item_name}</td>
                  <td className="py-3 px-6 font-mono text-xs text-dim">{r.sku}</td>
                  <td className="py-3 px-6 text-body">{r.category_name || '-'}</td>
                  <td className="py-3 px-6 text-body">{r.unit_name || '-'}</td>
                  <td className="py-3 px-6 text-right font-mono font-bold text-heading">{r.current_qty.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-6 text-right font-mono text-body">Rp {r.avg_hpp.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-6 text-right font-mono font-bold text-warning dark:text-warning">Rp {r.total_value.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
