import { useState, useEffect } from 'react';
import { X, Save, Layers, Loader2, Search } from 'lucide-react';
import { getCategories, getItemsFiltered, Category, Item } from '../../lib/api';

interface BulkStockAddProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  onSuccess: () => void;
}

export default function BulkStockAdd({ isOpen, onClose, branchId, onSuccess }: BulkStockAddProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  
  const [loadingItems, setLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // qty state for each item (id -> qty)
  const [qtys, setQtys] = useState<Record<string, number>>({});
  // hpp state for each item (id -> hpp)
  const [hpps, setHpps] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      getCategories().then(setCategories);
      fetchItems('all', '');
      setQtys({});
      setHpps({});
    }
  }, [isOpen]);

  const fetchItems = async (catId: string, searchStr: string) => {
    setLoadingItems(true);
    try {
      const res = await getItemsFiltered(searchStr, catId === 'all' ? '' : catId, '', true, 1, 100);
      setItems(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchItems(selectedCategory, search);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [search, selectedCategory, isOpen]);

  const handleSubmit = async () => {
    const payload = items
      .filter(i => qtys[i.id] && qtys[i.id] > 0)
      .map(i => ({
        item_id: i.id,
        unit_id: i.base_unit_id,
        branch_id: branchId,
        qty_change: qtys[i.id],
        direction: 'in',
        source_type: 'adjustment',
        notes: 'Bulk Stock Addition',
        hpp_value: hpps[i.id] || i.avg_hpp || i.price || 0
      }));

    if (payload.length === 0) {
      alert("No quantities entered.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('bulk_add_stock', { branchId, items: payload });
      onSuccess();
      onClose();
    } catch (e) {
      alert(`Failed to save bulk stock: ${e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-xl">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">Bulk Stock Adjustment</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Add stock to multiple items at once globally.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {loadingItems ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin text-brand" size={24} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
                <tr className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 w-32">Add Qty</th>
                  <th className="py-3 px-4 w-40">Cost per Unit (HPP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="py-2 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{item.sku} • {item.base_unit_name || 'Unit'}</div>
                    </td>
                    <td className="py-2 px-4 text-slate-600 dark:text-slate-400">{item.category_name || '-'}</td>
                    <td className="py-2 px-4">
                      <input 
                        type="number"
                        min="0"
                        value={qtys[item.id] || ''}
                        onChange={e => setQtys({...qtys, [item.id]: Number(e.target.value)})}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="number"
                        min="0"
                        value={hpps[item.id] !== undefined ? hpps[item.id] : (item.avg_hpp || item.price || '')}
                        onChange={e => setHpps({...hpps, [item.id]: Number(e.target.value)})}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
                        placeholder="Cost"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? 'Saving...' : 'Save Adjustments'}
          </button>
        </div>
      </div>
    </div>
  );
}
