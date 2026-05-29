import { useState, useEffect } from 'react';
import { getStockOverview, StockOverviewRow, createOpnameSession, submitOpnameLines, finalizeOpname } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import { Package, Search, Save, Loader2, ClipboardList } from 'lucide-react';

export default function StockOpname() {
  const DEFAULT_BRANCH = 'branch_001';
  const { user } = useAuthStore();
  
  const [items, setItems] = useState<StockOverviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [actualQty, setActualQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const data = await getStockOverview(DEFAULT_BRANCH);
      setItems(data);
      const initialQty: Record<string, number> = {};
      data.forEach(item => {
        initialQty[item.item_id] = item.current_qty;
      });
      setActualQty(initialQty);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(i => 
    i.item_name.toLowerCase().includes(search.toLowerCase()) || 
    (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!confirm('Anda yakin ingin memproses Stock Opname? Selisih stok akan otomatis disesuaikan.')) return;
    setSubmitting(true);
    
    try {
      const changedLines = items.filter(i => actualQty[i.item_id] !== i.current_qty).map(i => ({
        item_id: i.item_id,
        unit_id: i.unit_id || '',
        actual_qty: actualQty[i.item_id],
        notes: notes[i.item_id] || ''
      }));

      if (changedLines.length === 0) {
        alert("Tidak ada perubahan stok (semua fisik sama dengan sistem).");
        setSubmitting(false);
        return;
      }

      const sessionId = await createOpnameSession(DEFAULT_BRANCH, user?.id, "Routine Opname");
      await submitOpnameLines(sessionId, changedLines);
      await finalizeOpname(sessionId);
      
      alert("Stock Opname berhasil disimpan!");
      fetchStock();
    } catch (e: any) {
      alert("Gagal memproses stock opname: " + e.toString());
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-brand" /> Stock Opname
          </h1>
          <p className="text-slate-500 mt-1">Sesuaikan stok fisik dengan sistem.</p>
        </div>
        <button 
          onClick={handleSubmit} 
          disabled={submitting} 
          className="bg-brand hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-brand/20 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Proses Penyesuaian
        </button>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <Search size={18} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Cari item atau SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6 text-center">Stok Sistem</th>
                <th className="py-4 px-6 text-center">Stok Fisik</th>
                <th className="py-4 px-6 text-center">Selisih</th>
                <th className="py-4 px-6">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map(item => {
                const aq = actualQty[item.item_id] ?? item.current_qty;
                const diff = aq - item.current_qty;
                return (
                  <tr key={item.item_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Package size={18} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.item_name}</p>
                          <p className="text-xs text-slate-500">{item.sku || 'No SKU'} • {item.category_name || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-300 font-semibold">
                        {item.current_qty} {item.unit_name}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <input 
                        type="number" 
                        value={actualQty[item.item_id] === undefined ? '' : actualQty[item.item_id]}
                        onChange={e => setActualQty(prev => ({ ...prev, [item.item_id]: parseFloat(e.target.value) || 0 }))}
                        className="w-24 text-center font-bold font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                      />
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`font-mono font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <input 
                        type="text" 
                        placeholder={diff !== 0 ? "Alasan selisih..." : ""}
                        value={notes[item.item_id] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                        disabled={diff === 0}
                      />
                    </td>
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
