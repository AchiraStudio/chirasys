import { useState, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, ShieldCheck, RefreshCw, Layers, Activity, History, PackageOpen, Pencil } from 'lucide-react';
import { getStockOverview, StockOverviewRow } from '../../lib/api';
import SetInitialStockModal from './SetInitialStockModal';
import StockAdjustModal from './StockAdjustModal';
import StockMovementsPanel from './StockMovementsPanel';
import BulkStockAdd from './BulkStockAdd';

interface StockOverviewProps {
  refreshTrigger: number;
  onEditItem: (itemId: string) => void; // NEW: open item editor
}

export default function StockOverview({ refreshTrigger, onEditItem }: StockOverviewProps) {
  const [stockRows, setStockRows] = useState<StockOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');

  const [initItem, setInitItem] = useState<StockOverviewRow | null>(null);
  const [adjustItem, setAdjustItem] = useState<StockOverviewRow | null>(null);
  const [historyItem, setHistoryItem] = useState<StockOverviewRow | null>(null);
  const [bulkAdjustOpen, setBulkAdjustOpen] = useState(false);

  const DEFAULT_BRANCH_ID = 'branch_001';

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

  const totalItemsCount = stockRows.length;
  const lowStockCount = stockRows.filter(r => r.is_low_stock).length;

  const filteredRows = stockRows.filter(row => {
    const matchesSearch = row.item_name.toLowerCase().includes(search.toLowerCase()) || row.sku.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filterMode === 'all' || row.is_low_stock;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-7xl mx-auto w-full h-full">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Stock Balances</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time inventory levels computed from append‑only ledger logs.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setBulkAdjustOpen(true)}
            className="px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl shadow-sm hover:bg-blue-600 transition active:scale-95 flex items-center gap-2"
          >
            <Activity size={16} /> Bulk Adjustment
          </button>
          <button 
            onClick={loadStockData} 
            disabled={loading} 
            className="p-2.5 text-slate-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
            <Layers size={20} />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{totalItemsCount}</h4>
            <p className="text-xs font-medium text-slate-500 uppercase">Monitored Items</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {lowStockCount > 0 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{lowStockCount}</h4>
            <p className="text-xs font-medium text-slate-500 uppercase">Items Below Minimum</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4 justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button 
              onClick={() => setFilterMode('all')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterMode === 'all' 
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' 
                  : 'text-slate-600 hover:text-slate-700'
              }`}
            >
              All Items
            </button>
            <button 
              onClick={() => setFilterMode('low')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors ${
                filterMode === 'low' 
                  ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-700'
              }`}
            >
              <AlertTriangle size={12} /> Stock Alerts ({lowStockCount})
            </button>
          </div>
          <div className="flex-1 max-w-md flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3">
            <Search size={16} className="text-slate-500 mr-2" />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search items..." 
              className="bg-transparent border-none outline-none text-sm w-full focus:ring-0 py-2 text-slate-900 dark:text-white placeholder-slate-400" 
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm z-10">
              <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6 text-center">Base Unit</th>
                <th className="py-4 px-6 text-right">Min Stock</th>
                <th className="py-4 px-6 text-right">Balance</th>
                <th className="py-4 px-6 text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto text-brand" />
                    <p className="text-xs text-slate-500 mt-2">Loading stock data...</p>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500">
                    No items match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr 
                    key={row.item_id} 
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 group transition-colors"
                  >
                    <td className="py-3 px-6 font-bold text-slate-900 dark:text-white">
                      {row.item_name}
                      {row.is_low_stock && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-normal">
                          Needs replenishment
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 font-mono text-xs text-slate-600">{row.sku}</td>
                    <td className="py-3 px-6 text-center text-slate-600 dark:text-slate-300">{row.unit_name || '-'}</td>
                    <td className="py-3 px-6 text-right font-mono text-slate-600">{row.min_stock}</td>
                    <td className={`py-3 px-6 text-right font-mono font-bold ${row.is_low_stock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                      {row.current_qty}
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit Item Master Data */}
                        <button
                          onClick={() => onEditItem(row.item_id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-all duration-200 transform hover:scale-110 active:scale-95"
                          title="Edit Item Details"
                        >
                          <Pencil size={16} />
                        </button>
                        {/* Set Initial Stock (only when no ledger entries exist) */}
                        {!row.has_ledger_entries && row.unit_id && (
                          <button
                            onClick={() => setInitItem(row)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand/10 hover:text-brand dark:hover:bg-brand/20 dark:hover:text-brand-400 transition-all duration-200 transform hover:scale-110 active:scale-95"
                            title="Set Initial Stock"
                          >
                            <PackageOpen size={16} />
                          </button>
                        )}
                        {/* Adjust Stock */}
                        <button
                          onClick={() => setAdjustItem(row)}
                          disabled={!row.unit_id}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Adjust Stock"
                        >
                          <Activity size={16} />
                        </button>
                        {/* View History */}
                        <button
                          onClick={() => setHistoryItem(row)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-all duration-200 transform hover:scale-110 active:scale-95"
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