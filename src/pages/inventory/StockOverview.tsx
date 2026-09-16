import { useState, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, ShieldCheck, RefreshCw, Layers, Activity, History, PackageOpen, Pencil } from 'lucide-react';
import { getStockOverview, StockOverviewRow, exportStockExcel, getCategories, Category } from '../../lib/api';
import SetInitialStockModal from './SetInitialStockModal';
import StockAdjustModal from './StockAdjustModal';
import StockMovementsPanel from './StockMovementsPanel';
import BulkStockAdd from './BulkStockAdd';
import { save } from '@tauri-apps/plugin-dialog';
import { FileSpreadsheet } from 'lucide-react';

import { toast } from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
interface StockOverviewProps {
  refreshTrigger: number;
  onEditItem: (itemId: string) => void; // NEW: open item editor
}

export default function StockOverview({ refreshTrigger, onEditItem }: StockOverviewProps) {
  const [stockRows, setStockRows] = useState<StockOverviewRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');

  const [initItem, setInitItem] = useState<StockOverviewRow | null>(null);
  const [adjustItem, setAdjustItem] = useState<StockOverviewRow | null>(null);
  const [historyItem, setHistoryItem] = useState<StockOverviewRow | null>(null);
  const [bulkAdjustOpen, setBulkAdjustOpen] = useState(false);

  const DEFAULT_BRANCH_ID = 'branch_001';

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  const loadStockData = async () => {
    setLoading(true);
    try {
      const data = await getStockOverview(DEFAULT_BRANCH_ID);
      setStockRows(data);
    } catch (error) {
      console.error("Failed to load inventory stocks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadStockData(); 
  }, [refreshTrigger]);

  const handleExportExcel = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        defaultPath: 'Laporan_Inventory.xlsx',
      });
      if (filePath) {
        setLoading(true);
        await exportStockExcel(filePath);
        toast.error('Data inventaris berhasil diekspor ke Excel!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengekspor data: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const totalItemsCount = stockRows.length;
  const lowStockCount = stockRows.filter(r => r.is_low_stock).length;

  const filteredRows = stockRows.filter(row => {
    const matchesSearch = row.item_name.toLowerCase().includes(search.toLowerCase()) || row.sku.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filterMode === 'all' || row.is_low_stock;
    const matchesCategory = !selectedCategory || row.category_name === selectedCategory;
    return matchesSearch && matchesTab && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in duration-500 max-w-7xl mx-auto w-full h-full">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-heading tracking-tight">Stock Balances</h1>
          <p className="text-sm text-body mt-1">
            Real-time inventory levels computed from append‑only ledger logs.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-success-soft text-success dark:bg-success/10 dark:text-success hover:bg-success-soft rounded-xl text-sm font-bold shadow-sm transition active:scale-95 flex items-center gap-2 border border-success/30 dark:border-success/30"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          <button
            onClick={() => setBulkAdjustOpen(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-sm hover:bg-primary-hover transition active:scale-95 flex items-center gap-2"
          >
            <Activity size={16} /> Bulk Adjustment
          </button>
          <button 
            onClick={loadStockData} 
            disabled={loading} 
            className="p-2.5 text-body bg-card border border-line rounded-xl shadow-sm hover:bg-muted transition active:scale-95"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-line/60 dark:border-line p-5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-accent-soft dark:bg-blue-950/40 text-accent rounded-xl">
            <Layers size={20} />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-heading">{totalItemsCount}</h4>
            <p className="text-xs font-medium text-dim uppercase">Monitored Items</p>
          </div>
        </div>
        <div className="bg-card border border-line/60 dark:border-line p-5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>
            {lowStockCount > 0 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div>
            <h4 className="text-2xl font-bold text-heading">{lowStockCount}</h4>
            <p className="text-xs font-medium text-dim uppercase">Items Below Minimum</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-line shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-line flex flex-col sm:flex-row gap-4 justify-between bg-muted/50 dark:bg-card/30">
          <div className="flex bg-muted p-1 rounded-xl">
            <button 
              onClick={() => setFilterMode('all')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterMode === 'all' 
                  ? 'bg-card dark:bg-muted shadow-sm text-heading' 
                  : 'text-body hover:text-body'
              }`}
            >
              All Items
            </button>
            <button 
              onClick={() => setFilterMode('low')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors ${
                filterMode === 'low' 
                  ? 'bg-card dark:bg-muted text-warning shadow-sm' 
                  : 'text-body hover:text-body'
              }`}
            >
              <AlertTriangle size={12} /> Stock Alerts ({lowStockCount})
            </button>
          </div>
          <div className="flex-1 max-w-lg flex items-center gap-3">
            <div className="flex-1 flex items-center bg-card border border-line rounded-xl px-3">
              <Search size={16} className="text-dim mr-2" />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search items..." 
                className="bg-transparent border-none outline-none text-sm w-full focus:ring-0 py-2 text-heading placeholder:text-dim" 
              />
            </div>
            <Select
              value={selectedCategory}
              onChange={(v) => setSelectedCategory(v)}
              className="bg-card border border-line text-body dark:text-heading text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="text-body text-xs uppercase font-semibold border-b border-line">
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6">Kategori</th>
                <th className="py-4 px-6 text-center">Base Unit</th>
                <th className="py-4 px-6 text-right">Min Stock</th>
                <th className="py-4 px-6 text-right">Balance</th>
                <th className="py-4 px-6 text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-line dark:divide-line/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto text-primary" />
                    <p className="text-xs text-dim mt-2">Loading stock data...</p>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-dim">
                    No items match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr 
                    key={row.item_id} 
                    className="hover:bg-muted/50 dark:hover:bg-card/20 group transition-colors fast-render-row"
                  >
                    <td className="py-3 px-6 font-bold text-heading">
                      {row.item_name}
                      {row.current_qty < 0 ? (
                        <span className="text-[10px] text-danger dark:text-danger block font-black">
                          Stok Minus (Defisit {Math.abs(row.current_qty)})
                        </span>
                      ) : row.is_low_stock ? (
                        <span className="text-[10px] text-warning dark:text-warning block font-normal">
                          Perlu Restock
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-6 font-mono text-xs text-body">{row.sku}</td>
                    <td className="py-3 px-6">
                      {row.category_name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary-soft dark:bg-primary/60 text-primary dark:text-primary border border-primary/30 dark:border-primary/50">
                          {row.category_name}
                        </span>
                      ) : (
                        <span className="text-xs text-dim font-medium italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-center text-body">{row.unit_name || '-'}</td>
                    <td className="py-3 px-6 text-right font-mono text-body">{row.min_stock}</td>
                    <td className={`py-3 px-6 text-right font-mono font-bold ${
                      row.current_qty < 0
                        ? 'text-danger dark:text-danger font-black'
                        : row.is_low_stock
                        ? 'text-warning dark:text-warning'
                        : 'text-heading'
                    }`}>
                      {row.current_qty < 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-danger-soft dark:bg-danger/40 border border-danger/30 dark:border-danger/50">
                          {row.current_qty}
                        </span>
                      ) : (
                        row.current_qty
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit Item Master Data */}
                        <button
                          onClick={() => onEditItem(row.item_id)}
                          className="p-1.5 rounded-lg bg-muted text-body hover:bg-primary-soft hover:text-primary dark:hover:bg-primary/30 dark:hover:text-primary transition-all duration-200 transform hover:scale-110 active:scale-95"
                          title="Edit Item Details"
                        >
                          <Pencil size={16} />
                        </button>
                        {/* Set Initial Stock (only when no ledger entries exist) */}
                        {!row.has_ledger_entries && row.unit_id && (
                          <button
                            onClick={() => setInitItem(row)}
                            className="p-1.5 rounded-lg bg-muted text-body hover:bg-primary-soft hover:text-primary dark:hover:bg-primary-soft dark:hover:text-brand-400 transition-all duration-200 transform hover:scale-110 active:scale-95"
                            title="Set Initial Stock"
                          >
                            <PackageOpen size={16} />
                          </button>
                        )}
                        {/* Adjust Stock */}
                        <button
                          onClick={() => setAdjustItem(row)}
                          disabled={!row.unit_id}
                          className="p-1.5 rounded-lg bg-muted text-body hover:bg-warning-soft hover:text-warning dark:hover:bg-warning/30 dark:hover:text-warning transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Adjust Stock"
                        >
                          <Activity size={16} />
                        </button>
                        {/* View History */}
                        <button
                          onClick={() => setHistoryItem(row)}
                          className="p-1.5 rounded-lg bg-muted text-body hover:bg-accent-soft hover:text-accent dark:hover:bg-accent/30 dark:hover:text-accent transition-all duration-200 transform hover:scale-110 active:scale-95"
                          title="Stock History"
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <SetInitialStockModal 
        isOpen={!!initItem} 
        onClose={() => setInitItem(null)} 
        item={initItem} 
        branchId={DEFAULT_BRANCH_ID} 
        onSuccess={loadStockData} 
      />
      <StockAdjustModal 
        isOpen={!!adjustItem} 
        onClose={() => setAdjustItem(null)} 
        item={adjustItem} 
        branchId={DEFAULT_BRANCH_ID} 
        onSuccess={loadStockData} 
      />
      <StockMovementsPanel 
        isOpen={!!historyItem} 
        onClose={() => setHistoryItem(null)} 
        item={historyItem} 
        branchId={DEFAULT_BRANCH_ID} 
      />
      <BulkStockAdd
        isOpen={bulkAdjustOpen}
        onClose={() => setBulkAdjustOpen(false)}
        branchId={DEFAULT_BRANCH_ID}
        onSuccess={loadStockData}
      />
    </div>
  );
}